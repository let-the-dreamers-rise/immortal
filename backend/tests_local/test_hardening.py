"""Pre-launch hardening: time zones, safety tools, sessions, abuse limits."""

import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import server
from conftest import make_user, run
from localtime import resolve_tz


# ---------------------------------------------------------------------------
# The practitioner's own day
# ---------------------------------------------------------------------------
def test_resolve_tz_falls_back_safely():
    assert resolve_tz("Asia/Kolkata", None) == ZoneInfo("Asia/Kolkata")
    assert resolve_tz("Not/AZone", "330").utcoffset(None) == timedelta(minutes=330)
    assert resolve_tz(None, "99999") == timezone.utc
    assert resolve_tz("../../etc/passwd", "abc") == timezone.utc


def test_log_date_and_today_follow_the_members_zone(client, user):
    # Pick a zone whose date differs from UTC's right now, so the test proves
    # the server used it whatever hour the suite runs.
    utc_today = datetime.now(timezone.utc).date()
    zone = next(
        z for z in ("Pacific/Kiritimati", "Pacific/Pago_Pago")
        if datetime.now(ZoneInfo(z)).date() != utc_today
    )
    local_today = datetime.now(ZoneInfo(zone)).date().isoformat()
    h = {**user["headers"], "X-Timezone": zone}

    log = client.post("/api/logs", json={"body": "", "visibility": "private"}, headers=h).json()["log"]
    assert log["date"] == local_today

    today = client.get("/api/today", headers=h).json()
    assert today["date"] == local_today and today["logged_today"] is True
    # Seen from UTC, that log is not today's.
    assert client.get("/api/today", headers=user["headers"]).json()["logged_today"] is False


def test_log_returns_growth_and_rejects_bad_input(client, user):
    r = client.post("/api/logs", json={"visibility": "private", "duration_seconds": 300}, headers=user["headers"])
    assert r.status_code == 200 and r.json()["growth"]["days"] == 1
    assert client.post("/api/logs", json={"mood": "furious"}, headers=user["headers"]).status_code == 400
    assert client.post("/api/logs", json={"body": "x" * 6000}, headers=user["headers"]).status_code == 422
    # An empty post to the community is refused; a private empty day is fine.
    assert client.post("/api/logs", json={"visibility": "public", "body": "  "}, headers=user["headers"]).status_code == 400


def test_stage_checkins_count_once_per_day(client, user):
    assert client.post("/api/path/stages/1/start", headers=user["headers"]).status_code == 200
    for _ in range(3):
        client.post("/api/logs", json={"stage_order": 1}, headers=user["headers"])
    stage = client.get("/api/path/stages/1", headers=user["headers"]).json()["stage"]
    assert stage["checkins"] == 1


# ---------------------------------------------------------------------------
# Report and block
# ---------------------------------------------------------------------------
def _share(client, who, text="A quiet morning."):
    return client.post("/api/logs", json={"body": text, "visibility": "public"}, headers=who["headers"]).json()["log"]


def test_block_hides_both_ways(client, user, other):
    log = _share(client, other)
    feed = lambda who: {l["log_id"] for l in client.get("/api/logs/feed", headers=who["headers"]).json()["logs"]}
    assert log["log_id"] in feed(user)

    assert client.post(f"/api/blocks/{other['user']['user_id']}", headers=user["headers"]).status_code == 200
    assert log["log_id"] not in feed(user)
    assert client.get(f"/api/logs/{log['log_id']}", headers=user["headers"]).status_code == 404
    assert client.get(f"/api/community/users/{other['user']['user_id']}", headers=user["headers"]).status_code == 404
    # The blocked side cannot reach the blocker either.
    mine = _share(client, user)
    assert mine["log_id"] not in feed(other)
    assert client.post(f"/api/logs/{mine['log_id']}/comments", json={"body": "hi"}, headers=other["headers"]).status_code == 404
    assert client.post(f"/api/community/users/{user['user']['user_id']}/follow", headers=other["headers"]).status_code == 404

    blocked = client.get("/api/blocks", headers=user["headers"]).json()["blocked"]
    assert [b["user_id"] for b in blocked] == [other["user"]["user_id"]]
    assert client.delete(f"/api/blocks/{other['user']['user_id']}", headers=user["headers"]).status_code == 200
    assert log["log_id"] in feed(user)


def test_three_reports_hide_a_post(client, user):
    log = _share(client, user, "Buy followers at example.com")
    reporters = [make_user(client) for _ in range(3)]
    for i, r in enumerate(reporters):
        res = client.post(
            "/api/reports", json={"kind": "log", "target_id": log["log_id"], "reason": "spam"}, headers=r["headers"]
        )
        assert res.status_code == 200
        still_listed = log["log_id"] in {
            l["log_id"] for l in client.get("/api/logs/feed", headers=reporters[0]["headers"]).json()["logs"]
        }
        assert still_listed is (i < 2)
    # The author still sees their own post.
    assert client.get(f"/api/logs/{log['log_id']}", headers=user["headers"]).status_code == 200


def test_one_member_reporting_twice_counts_once(client, user, other):
    log = _share(client, user)
    for _ in range(4):
        client.post("/api/reports", json={"kind": "log", "target_id": log["log_id"], "reason": "spam"}, headers=other["headers"])
    assert log["log_id"] in {l["log_id"] for l in client.get("/api/logs/feed", headers=other["headers"]).json()["logs"]}


def test_report_validation(client, user, other):
    log = _share(client, user)
    post = lambda body, who=other: client.post("/api/reports", json=body, headers=who["headers"])
    assert post({"kind": "log", "target_id": log["log_id"], "reason": "because"}).status_code == 400
    assert post({"kind": "planet", "target_id": log["log_id"], "reason": "spam"}).status_code == 400
    assert post({"kind": "log", "target_id": "log_missing", "reason": "spam"}).status_code == 404
    assert post({"kind": "log", "target_id": log["log_id"], "reason": "spam"}, user).status_code == 400
    assert post({"kind": "user", "target_id": user["user"]["user_id"], "reason": "harassment"}).status_code == 200


def test_moderator_can_suspend(client, user, other, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", user["email"])
    log = _share(client, other, "something awful")
    client.post("/api/reports", json={"kind": "log", "target_id": log["log_id"], "reason": "hate"}, headers=user["headers"])

    assert client.get("/api/admin/reports", headers=other["headers"]).status_code == 404
    items = client.get("/api/admin/reports", headers=user["headers"]).json()["items"]
    assert any(i["target_id"] == log["log_id"] for i in items)
    r = client.post(f"/api/admin/reports/log/{log['log_id']}", json={"action": "suspend"}, headers=user["headers"])
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=other["headers"]).status_code == 401
    login = client.post("/api/auth/login", json={"email": other["email"], "password": other["password"]})
    assert login.status_code == 403


def test_hidden_lineage_and_notes_leave_the_list(client, user, other):
    body = {
        "title": "Quiet Hands",
        "summary": "Rubbing the palms every morning.",
        "method": "Rub the palms for thirty breaths each morning.",
        "horizon_days": 30,
        "daily_minutes": 2,
    }
    lin = client.post("/api/lineages", json=body, headers=other["headers"]).json()["lineage"]
    client.post(f"/api/blocks/{other['user']['user_id']}", headers=user["headers"])
    ids = {l["lineage_id"] for l in client.get("/api/lineages", headers=user["headers"]).json()["lineages"]}
    assert lin["lineage_id"] not in ids
    assert client.get(f"/api/lineages/{lin['lineage_id']}", headers=user["headers"]).status_code == 404


# ---------------------------------------------------------------------------
# Sessions and sign-in
# ---------------------------------------------------------------------------
def test_session_tokens_are_stored_hashed(client, user):
    token = user["headers"]["Authorization"].split(" ", 1)[1]
    assert run(server.db.user_sessions.find_one({"session_token": token})) is None
    assert run(server.db.user_sessions.find_one({"session_token": server.token_hash(token)})) is not None


def test_legacy_plaintext_session_still_works_and_is_migrated(client, user):
    raw = "legacy-token-" + "x" * 30
    run(
        server.db.user_sessions.insert_one(
            {
                "session_token": raw,
                "user_id": user["user"]["user_id"],
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
            }
        )
    )
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw}"}).status_code == 200
    assert run(server.db.user_sessions.find_one({"session_token": raw})) is None
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw}"}).status_code == 200


def test_change_password_keeps_this_device_signed_in(client, user):
    r = client.post(
        "/api/auth/password",
        json={"current_password": user["password"], "new_password": "anotherpass2"},
        headers=user["headers"],
    )
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=user["headers"]).status_code == 200


def test_successful_logins_do_not_lock_the_account(client, user):
    for _ in range(12):
        run(server.db.auth_attempts.delete_many({"key": {"$regex": "^login-ip:"}}))
        r = client.post("/api/auth/login", json={"email": user["email"], "password": user["password"]})
        assert r.status_code == 200


def test_failed_logins_lock_the_email(client, user):
    codes = []
    for _ in range(10):
        run(server.db.auth_attempts.delete_many({"key": {"$regex": "^login-ip:"}}))
        codes.append(client.post("/api/auth/login", json={"email": user["email"], "password": "wrongpass"}).status_code)
    assert codes[:8] == [401] * 8 and codes[-1] == 429


def test_forwarded_for_cannot_dodge_the_ip_throttle(client):
    codes = []
    for i in range(10):
        r = client.post(
            "/api/auth/login",
            json={"email": f"nobody{i}@example.com", "password": "whatever1"},
            headers={"X-Forwarded-For": f"10.0.0.{i}"},
        )
        codes.append(r.status_code)
    assert 429 in codes


def test_overlong_password_is_a_clean_422(client):
    r = client.post(
        "/api/auth/register", json={"email": "long@example.com", "password": "p" * 500, "display_name": "Long"}
    )
    assert r.status_code == 422


def test_google_sign_in_closes_a_squatted_email_account(client):
    squatter = make_user(client)
    run(
        server.upsert_oauth_user(squatter["email"], "Real Owner", None, "google")
    )
    # The squatter's session and password are gone; Google proved the owner.
    assert client.get("/api/auth/me", headers=squatter["headers"]).status_code == 401
    login = client.post("/api/auth/login", json={"email": squatter["email"], "password": squatter["password"]})
    assert login.status_code == 401


def test_legacy_emergent_session_endpoint_is_gone(client):
    assert client.post("/api/auth/session", json={"session_id": "abc"}).status_code in (404, 405)


# ---------------------------------------------------------------------------
# Meetups and community at scale
# ---------------------------------------------------------------------------
def _meetup(start):
    return {"title": "Dawn standing", "location_name": "The park gate", "city": "Pune", "starts_at": start}


def test_meetup_start_is_validated_and_normalised(client, user):
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    assert client.post("/api/meetups", json=_meetup(past), headers=user["headers"]).status_code == 400
    assert client.post("/api/meetups", json=_meetup("next tuesday"), headers=user["headers"]).status_code == 400
    soon = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    m = client.post("/api/meetups", json=_meetup(soon), headers=user["headers"]).json()["meetup"]
    assert m["starts_at"].endswith("+00:00")
    listed = client.get("/api/meetups", headers=user["headers"]).json()["meetups"]
    card = next(c for c in listed if c["meetup_id"] == m["meetup_id"])
    assert card["attendees"] == 1 and card["is_host"] and card["is_rsvped"]


def test_practitioners_use_the_stored_summary(client, user, other):
    client.post("/api/logs", json={}, headers=other["headers"])
    people = client.get("/api/community/practitioners", headers=user["headers"]).json()["practitioners"]
    me = next(p for p in people if p["user_id"] == other["user"]["user_id"])
    assert me["growth"]["days"] == 1 and me["last_practised"]
    assert "practice_days" not in me and "email" not in me


def test_account_deletion_clears_blocks_and_reports(client, user, other):
    client.post(f"/api/blocks/{other['user']['user_id']}", headers=user["headers"])
    client.post("/api/reports", json={"kind": "user", "target_id": other["user"]["user_id"], "reason": "spam"}, headers=user["headers"])
    assert client.request("DELETE", "/api/account", json={"confirm": "DELETE"}, headers=user["headers"]).status_code == 200
    uid = user["user"]["user_id"]
    assert run(server.db.blocks.find_one({"blocker_id": uid})) is None
    assert run(server.db.reports.find_one({"reporter_id": uid})) is None
