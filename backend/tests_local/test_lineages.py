import server
from conftest import run

BASE = {
    "title": "Forty Days of Quiet",
    "summary": "Sitting quietly each evening for forty days.",
    "method": "Sit for ten minutes after sunset and rest the attention at the breath.",
    "horizon_days": 40,
    "daily_minutes": 10,
}


def test_founding_lineages_are_seeded(client, user):
    r = client.get("/api/lineages", headers=user["headers"])
    assert r.status_code == 200
    ids = {l["lineage_id"] for l in r.json()["lineages"]}
    assert "lin_zhanzhuang100" in ids and "lin_smallorbit3y" in ids


def test_archive_is_not_a_practitioner(client, user):
    people = client.get("/api/community/practitioners", headers=user["headers"]).json()["practitioners"]
    assert all(p["user_id"] != "user_archive" for p in people)


def test_create_join_checkin_note_flow(client, user, other):
    created = client.post("/api/lineages", json=BASE, headers=user["headers"])
    assert created.status_code == 200, created.text
    lin = created.json()["lineage"]
    assert lin["is_author"] and lin["practitioners"] == 1
    lid = lin["lineage_id"]

    # Logging before taking it up is refused.
    assert client.post(f"/api/lineages/{lid}/checkin", headers=other["headers"]).status_code == 403
    assert client.post(f"/api/lineages/{lid}/join", headers=other["headers"]).status_code == 200
    first = client.post(f"/api/lineages/{lid}/checkin", headers=other["headers"]).json()["my_progress"]
    again = client.post(f"/api/lineages/{lid}/checkin", headers=other["headers"]).json()["my_progress"]
    assert first["days_practised"] == 1 and again["days_practised"] == 1  # one per day
    assert again["checked_in_today"] is True

    note = client.post(f"/api/lineages/{lid}/notes", json={"body": "Warm hands on day one.", "kind": "observation"}, headers=other["headers"])
    assert note.status_code == 200 and note.json()["note"]["day"] == 1
    assert client.post(f"/api/lineages/{lid}/notes", json={"body": "hm", "kind": "rant"}, headers=other["headers"]).status_code == 400

    detail = client.get(f"/api/lineages/{lid}", headers=user["headers"]).json()
    assert detail["lineage"]["practitioners"] == 2
    assert len(detail["notes"]) == 1 and len(detail["carriers"]) == 2

    mine = client.get("/api/lineages?scope=mine", headers=other["headers"]).json()["lineages"]
    assert [l["lineage_id"] for l in mine] == [lid]


def test_branch_links_to_parent(client, user, other):
    parent = client.post("/api/lineages", json=BASE, headers=user["headers"]).json()["lineage"]
    branch = client.post(
        "/api/lineages", json={**BASE, "title": "Forty Days, Morning", "parent_id": parent["lineage_id"]}, headers=other["headers"]
    ).json()["lineage"]
    assert branch["parent_id"] == parent["lineage_id"]
    detail = client.get(f"/api/lineages/{parent['lineage_id']}", headers=user["headers"]).json()
    assert detail["lineage"]["branch_count"] == 1
    assert detail["branches"][0]["lineage_id"] == branch["lineage_id"]
    child = client.get(f"/api/lineages/{branch['lineage_id']}", headers=user["headers"]).json()
    assert child["lineage"]["parent"]["lineage_id"] == parent["lineage_id"]


def test_only_author_deletes(client, user, other):
    lid = client.post("/api/lineages", json=BASE, headers=user["headers"]).json()["lineage"]["lineage_id"]
    assert client.delete(f"/api/lineages/{lid}", headers=other["headers"]).status_code == 404
    assert client.delete(f"/api/lineages/{lid}", headers=user["headers"]).status_code == 200
    assert client.get(f"/api/lineages/{lid}", headers=user["headers"]).status_code == 404


def test_free_author_limit_when_enforcing(client, user, monkeypatch):
    monkeypatch.setenv("REVENUECAT_SECRET_KEY", "sk_test")
    assert client.post("/api/lineages", json=BASE, headers=user["headers"]).status_code == 200
    assert client.post("/api/lineages", json=BASE, headers=user["headers"]).status_code == 402
    run(server.db.users.update_one({"user_id": user["user"]["user_id"]}, {"$set": {"is_premium": True, "premium_expires_at": None}}))
    assert client.post("/api/lineages", json=BASE, headers=user["headers"]).status_code == 200


def test_validation(client, user):
    assert client.post("/api/lineages", json={**BASE, "horizon_days": 3}, headers=user["headers"]).status_code == 422
    assert client.post("/api/lineages", json={**BASE, "parent_id": "lin_missing"}, headers=user["headers"]).status_code == 404


def test_activity_shows_who_practised_and_unseen_notes(client, user, other):
    lid = client.post("/api/lineages", json=BASE, headers=user["headers"]).json()["lineage"]["lineage_id"]
    client.post(f"/api/lineages/{lid}/join", headers=other["headers"])
    client.post(f"/api/lineages/{lid}/checkin", headers=other["headers"])
    client.post(f"/api/lineages/{lid}/notes", json={"body": "Calves ached on day one."}, headers=other["headers"])

    acts = client.get("/api/lineages/activity", headers=user["headers"]).json()["lineages"]
    a = next(x for x in acts if x["lineage_id"] == lid)
    assert a["carried_recently"] == 1 and a["recent_names"] == ["Tester"]
    assert a["new_notes"] == 1
    assert a["latest_note"]["body"] == "Calves ached on day one." and a["latest_note"]["from_author"] is False
    assert a["checked_in_today"] is False

    # Opening the lineage marks the note as read.
    client.get(f"/api/lineages/{lid}", headers=user["headers"])
    a = next(x for x in client.get("/api/lineages/activity", headers=user["headers"]).json()["lineages"] if x["lineage_id"] == lid)
    assert a["new_notes"] == 0

    # My own day and notes are not "activity" to me.
    mine = next(x for x in client.get("/api/lineages/activity", headers=other["headers"]).json()["lineages"] if x["lineage_id"] == lid)
    assert mine["carried_recently"] == 0 and mine["checked_in_today"] is True


def test_activity_is_empty_without_lineages(client, user):
    assert client.get("/api/lineages/activity", headers=user["headers"]).json() == {"lineages": []}
    assert client.get("/api/lineages/activity").status_code == 401


def test_notes_from_the_author_are_marked(client, user, other):
    lid = client.post("/api/lineages", json=BASE, headers=user["headers"]).json()["lineage"]["lineage_id"]
    client.post(f"/api/lineages/{lid}/join", headers=other["headers"])
    teacher = client.post(f"/api/lineages/{lid}/notes", json={"body": "Keep the knees soft.", "kind": "adjustment"}, headers=user["headers"])
    assert teacher.json()["note"]["from_author"] is True
    client.post(f"/api/lineages/{lid}/notes", json={"body": "Thank you."}, headers=other["headers"])
    notes = client.get(f"/api/lineages/{lid}", headers=other["headers"]).json()["notes"]
    assert {n["body"]: n["from_author"] for n in notes} == {"Keep the knees soft.": True, "Thank you.": False}


def test_preview_is_public_and_minimal(client, user):
    lid = client.post("/api/lineages", json=BASE, headers=user["headers"]).json()["lineage"]["lineage_id"]
    r = client.get(f"/api/lineages/{lid}/preview")
    assert r.status_code == 200
    p = r.json()["lineage"]
    assert p["title"] == BASE["title"] and p["author_name"] == "Tester" and p["practitioners"] == 1
    # The method stays behind sign-in, and no account details leak.
    assert "method" not in p and "author_id" not in p
    client.delete(f"/api/lineages/{lid}", headers=user["headers"])
    assert client.get(f"/api/lineages/{lid}/preview").status_code == 404


def test_account_deletion_erases_lineage_data(client, user, other):
    parent = client.post("/api/lineages", json=BASE, headers=user["headers"]).json()["lineage"]
    branch = client.post("/api/lineages", json={**BASE, "parent_id": parent["lineage_id"]}, headers=other["headers"]).json()["lineage"]
    client.post("/api/lineages/lin_zhanzhuang100/join", headers=user["headers"])
    client.post("/api/lineages/lin_zhanzhuang100/notes", json={"body": "Legs shook."}, headers=user["headers"])
    assert client.request("DELETE", "/api/account", json={"confirm": "DELETE"}, headers=user["headers"]).status_code == 200

    uid = user["user"]["user_id"]
    db = server.db

    async def counts():
        return (
            await db.lineages.count_documents({"author_id": uid}),
            await db.lineage_members.count_documents({"user_id": uid}),
            await db.lineage_notes.count_documents({"user_id": uid}),
        )

    assert run(counts()) == (0, 0, 0)
    orphan = client.get(f"/api/lineages/{branch['lineage_id']}", headers=other["headers"]).json()["lineage"]
    assert orphan["parent_id"] is None
