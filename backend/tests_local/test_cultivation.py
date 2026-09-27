import json
from datetime import datetime, timedelta, timezone

import cultivation
import server
from conftest import run
from scroll_texts import OPEN_SCROLLS

CLAIM_WORDS = ("cure", "heal", "treat", "reverse ageing", "reverse aging", "live longer", "extend your life")


def practise(user, days, start_days_ago=None):
    """Give a user `days` distinct practice dates ending yesterday."""
    uid = user["user"]["user_id"]
    first = start_days_ago if start_days_ago is not None else days
    now = datetime.now(timezone.utc)
    docs = []
    for i in range(days):
        at = now - timedelta(days=first - i)
        docs.append({
            "log_id": f"log_seed_{uid}_{i}",
            "user_id": uid,
            "body": "",
            "mood": None,
            "nothing_happened": True,
            "practice_ids": [],
            "stage_order": None,
            "visibility": "private",
            "created_at": at,
            "date": at.strftime("%Y-%m-%d"),
            "deleted_at": None,
        })
    if docs:
        run(server.db.logs.insert_many(docs))


# ---------------------------------------------------------------------------
# Pure pieces
# ---------------------------------------------------------------------------
def test_generations_are_108_then_tenfold():
    assert cultivation.generation_of(1)["generation"] == 1
    last_first = cultivation.generation_of(108)
    assert (last_first["generation"], last_first["seat"], last_first["character"]) == (1, 108, "深")
    first_second = cultivation.generation_of(109)
    assert (first_second["generation"], first_second["seat"], first_second["size"]) == (2, 1, 1080)
    assert first_second["character"] == "根" and first_second["label"] == "Second generation"
    assert cultivation.generation_of(108 + 1080)["generation"] == 2
    assert cultivation.generation_of(108 + 1080 + 1)["generation"] == 3


def test_open_generation_counts_remaining_places():
    assert cultivation.open_generation(0)["remaining"] == 108
    assert cultivation.open_generation(107)["remaining"] == 1
    nxt = cultivation.open_generation(108)
    assert nxt["generation"] == 2 and nxt["remaining"] == 1080


def test_name_is_generation_character_plus_chosen_one():
    n = cultivation.make_name(37, "松", datetime.now(timezone.utc))
    assert n["name"] == "深松"
    assert n["romanized"] == "Shēn Sōng"
    assert n["gloss"] == "Deep pine"
    assert n["seat"] == 37


def test_passes_follow_the_daodejing_then_the_neidan_schedule():
    days = [p["day"] for p in cultivation.PASSES]
    assert days == sorted(days)
    assert days[:6] == [1, 7, 16, 33, 59, 81]  # chapter numbers
    assert days[6:] == [100, 300, 1095, 3285]  # 百日, 十月, 三年, 九年
    for p in cultivation.PASSES:
        if p.get("sealed"):
            assert p["key"] not in OPEN_SCROLLS
            assert p["key"] in cultivation.FINGERPRINTS, f"{p['key']} has no published fingerprint"
        else:
            assert p["key"] in OPEN_SCROLLS


def test_open_scrolls_make_no_outcome_claims():
    for key, s in OPEN_SCROLLS.items():
        text = " ".join([s["translation"], *s["body"]]).lower()
        for word in CLAIM_WORDS:
            assert word not in text, f"{key} says {word!r}"


def test_fingerprint_covers_every_sealed_field():
    base = {"key": "first-pass", "title": "T", "zh": "百", "translation": "A hundred", "body": "Text", "nonce": "n1"}
    fp = cultivation.fingerprint(base)
    for field in cultivation.SEALED_FIELDS:
        changed = {**base, field: base[field] + "x"}
        assert cultivation.fingerprint(changed) != fp, field


def test_nth():
    assert [cultivation.nth(n) for n in (1, 2, 3, 4, 11, 12, 13, 21, 100, 3285)] == [
        "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "100th", "3,285th",
    ]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
def test_new_member_sees_every_scroll_closed(client, user):
    r = client.get("/api/passes", headers=user["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["days"] == 0 and body["name"] is None
    assert all(not p["opened"] for p in body["passes"])
    assert body["next"]["key"] == "gate" and body["next"]["days_left"] == 1
    assert len(body["name_characters"]) == 24
    closed = client.get("/api/passes/gate", headers=user["headers"])
    assert closed.status_code == 403
    assert "1st day" in closed.json()["detail"]


def test_scrolls_open_on_practice_days(client, user):
    practise(user, 16)
    body = client.get("/api/passes", headers=user["headers"]).json()
    opened = [p["key"] for p in body["passes"] if p["opened"]]
    assert opened == ["gate", "heaven-and-earth", "root"]
    assert body["next"]["key"] == "not-perish" and body["next"]["days_left"] == 17

    scroll = client.get("/api/passes/root", headers=user["headers"]).json()["scroll"]
    assert scroll["zh"].startswith("致虛極") and len(scroll["body"]) == 3
    assert client.get("/api/passes/not-perish", headers=user["headers"]).status_code == 403
    assert client.get("/api/passes/nope", headers=user["headers"]).status_code == 404


def test_first_log_of_a_day_reports_the_scroll_it_opened(client, user):
    r = client.post("/api/logs", json={"body": "stood for five minutes"}, headers=user["headers"])
    assert r.status_code == 200, r.text
    assert r.json()["opened_scroll"]["key"] == "gate"
    again = client.post("/api/logs", json={"body": "and again"}, headers=user["headers"])
    assert again.json()["opened_scroll"] is None  # same day, no new scroll

    today = client.get("/api/today", headers=user["headers"]).json()["passes"]
    assert today["opened_today"]["key"] == "gate"
    assert today["next"]["key"] == "heaven-and-earth"


def test_take_name_is_permanent_and_public(client, user, other):
    run(server.db.counters.delete_many({"_id": cultivation.COUNTER_ID}))
    bad = client.post("/api/passes/name", json={"character": "龍", "vow": "first-pass"}, headers=user["headers"])
    assert bad.status_code == 400
    bad_vow = client.post("/api/passes/name", json={"character": "松", "vow": "forever"}, headers=user["headers"])
    assert bad_vow.status_code == 400

    r = client.post("/api/passes/name", json={"character": "松", "vow": "first-pass"}, headers=user["headers"])
    assert r.status_code == 200, r.text
    name = r.json()["name"]
    assert name["name"] == "深松" and name["seat"] == 1 and name["generation"] == 1
    assert r.json()["vow"]["key"] == "first-pass" and r.json()["vow"]["days_left"] == 100

    again = client.post("/api/passes/name", json={"character": "鶴", "vow": "first-pass"}, headers=user["headers"])
    assert again.status_code == 409

    second = client.post("/api/passes/name", json={"character": "鶴", "vow": "upper-pass"}, headers=other["headers"])
    assert second.json()["name"]["seat"] == 2

    me = client.get("/api/auth/me", headers=user["headers"]).json()
    assert me["user"]["practice_name"]["name"] == "深松"
    profile = client.get(f"/api/community/users/{user['user']['user_id']}", headers=other["headers"]).json()["profile"]
    assert profile["practice_name"]["romanized"] == "Shēn Sōng"
    assert "ordinal" not in profile["practice_name"]

    overview = client.get("/api/passes", headers=user["headers"]).json()
    assert overview["open_generation"]["remaining"] == 106


def test_vow_can_move_only_to_a_pass_not_yet_reached(client, user):
    assert client.post("/api/passes/vow", json={"vow": "middle-pass"}, headers=user["headers"]).status_code == 400
    client.post("/api/passes/name", json={"character": "雲", "vow": "first-pass"}, headers=user["headers"])
    practise(user, 120)
    assert client.post("/api/passes/vow", json={"vow": "first-pass"}, headers=user["headers"]).status_code == 400
    r = client.post("/api/passes/vow", json={"vow": "middle-pass"}, headers=user["headers"])
    assert r.status_code == 200
    assert r.json()["vow"]["days_left"] == 180


def test_counting_is_not_capped(client, user):
    """The Upper Pass needs 3,285 practice days; a capped query would never open it."""
    practise(user, 2100)
    assert client.get("/api/passes", headers=user["headers"]).json()["days"] == 2100
    assert client.get("/api/today", headers=user["headers"]).json()["growth"]["days"] == 2100


# ---------------------------------------------------------------------------
# Sealed scrolls
# ---------------------------------------------------------------------------
def _sealed_file(tmp_path, monkeypatch, body="Text of the first pass.\n\nSecond paragraph.", publish=None):
    scroll = {
        "key": "first-pass",
        "title": "The First Pass",
        "zh": "百日築基。",
        "translation": "A hundred days to lay the foundation.",
        "body": body,
        "nonce": "0123456789abcdef",
    }
    path = tmp_path / "sealed.json"
    path.write_text(json.dumps({"scrolls": [scroll]}, ensure_ascii=False), encoding="utf-8")
    fp = publish if publish is not None else cultivation.fingerprint(scroll)
    monkeypatch.setattr(cultivation, "FINGERPRINTS", {**cultivation.FINGERPRINTS, "first-pass": fp})
    monkeypatch.setenv("SEALED_SCROLLS_PATH", str(path))
    cultivation._sealed_cache.clear()
    return fp


def test_sealed_scroll_is_withheld_until_its_day(client, user, tmp_path, monkeypatch):
    fp = _sealed_file(tmp_path, monkeypatch)
    practise(user, 99)
    locked = client.get("/api/passes/first-pass", headers=user["headers"])
    assert locked.status_code == 403 and "Text of the first pass" not in locked.text
    listed = client.get("/api/passes", headers=user["headers"]).json()["passes"]
    first = next(p for p in listed if p["key"] == "first-pass")
    assert first["fingerprint"] == fp and not first["opened"] and first["days_left"] == 1
    assert "Text of the first pass" not in json.dumps(listed, ensure_ascii=False)

    practise(user, 1, start_days_ago=0)  # the hundredth day is today
    scroll = client.get("/api/passes/first-pass", headers=user["headers"]).json()["scroll"]
    assert scroll["verified"] is True
    assert scroll["body"] == ["Text of the first pass.", "Second paragraph."]
    assert scroll["nonce"] == "0123456789abcdef" and scroll["fingerprint"] == fp


def test_sealed_scroll_that_does_not_match_its_fingerprint_is_never_served(client, user, tmp_path, monkeypatch):
    _sealed_file(tmp_path, monkeypatch, publish="0" * 64)
    practise(user, 100)
    scroll = client.get("/api/passes/first-pass", headers=user["headers"]).json()["scroll"]
    assert scroll["verified"] is False and scroll["body"] is None


def test_published_fingerprints_match_the_private_file_when_present():
    """Run where the private file is mounted, this proves the published record is current."""
    import os

    path = os.environ.get("SEALED_SCROLLS_PATH")
    if not path or not os.path.exists(path):
        return
    data = json.load(open(path, encoding="utf-8"))
    for s in data["scrolls"]:
        assert cultivation.FINGERPRINTS[s["key"]] == cultivation.fingerprint(s), s["key"]
