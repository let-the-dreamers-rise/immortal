"""Backend tests for iteration-2 features: Meetups, Comments, Reminders, Year 2 Path."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest


# ---------- helpers ----------
def _iso_future(hours=48):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _register(api, base_url, prefix="U"):
    email = f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    r = api.post(f"{base_url}/api/auth/register", json={
        "email": email, "password": "abcdef123", "display_name": f"TEST_{prefix}"
    })
    assert r.status_code == 200, r.text
    body = r.json()
    return {
        "user": body["user"],
        "headers": {"Authorization": f"Bearer {body['session_token']}", "Content-Type": "application/json"},
    }


# =============================================================================
# Meetups
# =============================================================================
class TestMeetups:
    def test_create_host_auto_rsvps(self, api, base_url, seeker_headers):
        payload = {
            "title": "TEST Morning Qi Gong Circle",
            "description": "Ba Duan Jin in the park",
            "tradition": "dao",
            "location_name": "Riverside Park",
            "city": "TESTville",
            "starts_at": _iso_future(24),
            "capacity": 8,
            "lat": 37.7749, "lng": -122.4194,
        }
        r = api.post(f"{base_url}/api/meetups", headers=seeker_headers, json=payload)
        assert r.status_code == 200, r.text
        m = r.json()["meetup"]
        assert m["title"] == payload["title"]
        assert "meetup_id" in m
        # host auto-RSVP: detail returns is_rsvped True and attendees >= 1
        d = api.get(f"{base_url}/api/meetups/{m['meetup_id']}", headers=seeker_headers).json()["meetup"]
        assert d["is_host"] is True
        assert d["is_rsvped"] is True
        assert d["attendees"] >= 1
        assert isinstance(d.get("attendee_list"), list) and len(d["attendee_list"]) >= 1
        # cleanup
        api.delete(f"{base_url}/api/meetups/{m['meetup_id']}", headers=seeker_headers)

    def test_list_upcoming_and_distance_sort(self, api, base_url, seeker_headers):
        # near (SF) and far (NYC)
        near = api.post(f"{base_url}/api/meetups", headers=seeker_headers, json={
            "title": "TEST Near", "location_name": "SF Park", "city": "SF",
            "starts_at": _iso_future(12), "lat": 37.77, "lng": -122.41,
        }).json()["meetup"]
        far = api.post(f"{base_url}/api/meetups", headers=seeker_headers, json={
            "title": "TEST Far", "location_name": "NY Park", "city": "NY",
            "starts_at": _iso_future(10), "lat": 40.71, "lng": -74.00,
        }).json()["meetup"]

        # default list (by starts_at)
        r = api.get(f"{base_url}/api/meetups", headers=seeker_headers)
        assert r.status_code == 200
        ids = [m["meetup_id"] for m in r.json()["meetups"]]
        assert near["meetup_id"] in ids and far["meetup_id"] in ids

        # with lat/lng near SF → near should come before far
        r2 = api.get(f"{base_url}/api/meetups", headers=seeker_headers,
                     params={"lat": 37.77, "lng": -122.41})
        assert r2.status_code == 200
        cards = r2.json()["meetups"]
        ids2 = [m["meetup_id"] for m in cards]
        # verify distance populated and near < far
        by_id = {c["meetup_id"]: c for c in cards}
        assert by_id[near["meetup_id"]]["distance_km"] is not None
        assert by_id[far["meetup_id"]]["distance_km"] is not None
        assert by_id[near["meetup_id"]]["distance_km"] < by_id[far["meetup_id"]]["distance_km"]
        assert ids2.index(near["meetup_id"]) < ids2.index(far["meetup_id"])

        # cleanup
        api.delete(f"{base_url}/api/meetups/{near['meetup_id']}", headers=seeker_headers)
        api.delete(f"{base_url}/api/meetups/{far['meetup_id']}", headers=seeker_headers)

    def test_rsvp_requires_waiver_and_cancel(self, api, base_url, seeker_headers):
        # host = seeker
        m = api.post(f"{base_url}/api/meetups", headers=seeker_headers, json={
            "title": "TEST Waiver Circle", "location_name": "Studio", "city": "Test",
            "starts_at": _iso_future(20), "tradition": "mixed",
        }).json()["meetup"]

        # second user tries to RSVP
        u2 = _register(api, base_url, "R")
        h2 = u2["headers"]

        # waiver false → 400
        r_bad = api.post(f"{base_url}/api/meetups/{m['meetup_id']}/rsvp", headers=h2, json={"waiver_accepted": False})
        assert r_bad.status_code == 400
        assert "waiver" in r_bad.json().get("detail", "").lower()

        # waiver true → ok
        r_ok = api.post(f"{base_url}/api/meetups/{m['meetup_id']}/rsvp", headers=h2, json={"waiver_accepted": True})
        assert r_ok.status_code == 200 and r_ok.json()["is_rsvped"] is True

        # verify attendee count bumped and is_rsvped True for u2
        d = api.get(f"{base_url}/api/meetups/{m['meetup_id']}", headers=h2).json()["meetup"]
        assert d["is_rsvped"] is True
        assert d["attendees"] >= 2
        assert any(a["user_id"] == u2["user"]["user_id"] for a in d["attendee_list"])

        # cancel RSVP
        r_c = api.delete(f"{base_url}/api/meetups/{m['meetup_id']}/rsvp", headers=h2)
        assert r_c.status_code == 200 and r_c.json()["is_rsvped"] is False
        d2 = api.get(f"{base_url}/api/meetups/{m['meetup_id']}", headers=h2).json()["meetup"]
        assert d2["is_rsvped"] is False

        # cleanup: only host can delete
        del_notauth = api.delete(f"{base_url}/api/meetups/{m['meetup_id']}", headers=h2)
        assert del_notauth.status_code == 404
        del_ok = api.delete(f"{base_url}/api/meetups/{m['meetup_id']}", headers=seeker_headers)
        assert del_ok.status_code == 200

        # after delete: 404 on GET
        gone = api.get(f"{base_url}/api/meetups/{m['meetup_id']}", headers=seeker_headers)
        assert gone.status_code == 404

    def test_meetup_missing(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/meetups/mtp_missing", headers=seeker_headers)
        assert r.status_code == 404


# =============================================================================
# Comments on public logs (with 403 on private)
# =============================================================================
class TestComments:
    def test_public_log_get_with_comments_and_count(self, api, base_url, seeker_headers):
        # seeker creates public log
        r = api.post(f"{base_url}/api/logs", headers=seeker_headers,
                     json={"body": "TEST public reflection " + uuid.uuid4().hex[:6], "visibility": "public"})
        assert r.status_code == 200
        log_id = r.json()["log"]["log_id"]

        # second user posts a comment
        u2 = _register(api, base_url, "C")
        h2 = u2["headers"]
        c = api.post(f"{base_url}/api/logs/{log_id}/comments", headers=h2,
                     json={"body": "TEST comment from other"})
        assert c.status_code == 200, c.text
        cmt = c.json()["comment"]
        assert cmt["body"] == "TEST comment from other"
        assert cmt["author"]["user_id"] == u2["user"]["user_id"]
        cmt_id = cmt["comment_id"]

        # GET log detail: contains log + comments
        d = api.get(f"{base_url}/api/logs/{log_id}", headers=seeker_headers)
        assert d.status_code == 200
        detail = d.json()
        assert detail["log"]["log_id"] == log_id
        assert any(x["comment_id"] == cmt_id for x in detail["comments"])
        assert detail["log"]["comment_count"] >= 1

        # feed also carries comment_count
        feed = api.get(f"{base_url}/api/logs/feed", headers=seeker_headers).json()["logs"]
        target = next((l for l in feed if l["log_id"] == log_id), None)
        assert target is not None and target["comment_count"] >= 1

        # non-author cannot delete another's comment
        bad = api.delete(f"{base_url}/api/comments/{cmt_id}", headers=seeker_headers)
        assert bad.status_code == 404

        # author can delete
        ok = api.delete(f"{base_url}/api/comments/{cmt_id}", headers=h2)
        assert ok.status_code == 200

        # count decrements
        d2 = api.get(f"{base_url}/api/logs/{log_id}", headers=seeker_headers).json()
        assert d2["log"]["comment_count"] == 0
        assert not any(x["comment_id"] == cmt_id for x in d2["comments"])

        api.delete(f"{base_url}/api/logs/{log_id}", headers=seeker_headers)

    def test_private_log_403_for_non_owner(self, api, base_url, seeker_headers):
        r = api.post(f"{base_url}/api/logs", headers=seeker_headers,
                     json={"body": "TEST private", "visibility": "private"})
        log_id = r.json()["log"]["log_id"]

        # owner CAN read own private
        own = api.get(f"{base_url}/api/logs/{log_id}", headers=seeker_headers)
        assert own.status_code == 200

        # other user gets 403
        u2 = _register(api, base_url, "P")
        other = api.get(f"{base_url}/api/logs/{log_id}", headers=u2["headers"])
        assert other.status_code == 403

        # posting a comment on private log by non-owner → 403
        cbad = api.post(f"{base_url}/api/logs/{log_id}/comments", headers=u2["headers"], json={"body": "hi"})
        assert cbad.status_code == 403

        api.delete(f"{base_url}/api/logs/{log_id}", headers=seeker_headers)

    def test_get_log_not_found(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/logs/log_missing", headers=seeker_headers)
        assert r.status_code == 404


# =============================================================================
# Reminders
# =============================================================================
class TestReminders:
    def test_reminder_patch_persists(self, api, base_url):
        u = _register(api, base_url, "REM")
        h = u["headers"]
        # default
        me = api.get(f"{base_url}/api/auth/me", headers=h).json()["user"]
        assert me["reminder_enabled"] is False
        assert me["reminder_hour"] == 8 and me["reminder_minute"] == 0

        r = api.patch(f"{base_url}/api/profile/reminder", headers=h,
                      json={"enabled": True, "hour": 6, "minute": 30})
        assert r.status_code == 200
        u2 = r.json()["user"]
        assert u2["reminder_enabled"] is True
        assert u2["reminder_hour"] == 6 and u2["reminder_minute"] == 30

        # persists across GET /me
        me2 = api.get(f"{base_url}/api/auth/me", headers=h).json()["user"]
        assert me2["reminder_enabled"] is True
        assert me2["reminder_hour"] == 6 and me2["reminder_minute"] == 30

    def test_reminder_validation(self, api, base_url, seeker_headers):
        # invalid hour
        r = api.patch(f"{base_url}/api/profile/reminder", headers=seeker_headers,
                      json={"enabled": True, "hour": 30, "minute": 0})
        assert r.status_code == 422


# =============================================================================
# Year 2 Path (stages 5,6,7)
# =============================================================================
class TestYear2Path:
    def test_stages_returns_7_across_two_years(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/path/stages", headers=seeker_headers)
        assert r.status_code == 200
        stages = r.json()["stages"]
        assert len(stages) == 7
        years = {s["year"] for s in stages}
        assert years == {1, 2}
        y2 = [s for s in stages if s["year"] == 2]
        assert len(y2) == 3
        assert sorted(s["order"] for s in y2) == [5, 6, 7]

    def test_year2_locked_until_year1_complete(self, api, base_url, seeker_headers):
        stages = api.get(f"{base_url}/api/path/stages", headers=seeker_headers).json()["stages"]
        for s in stages:
            if s["order"] in (5, 6, 7):
                assert s["state"] == "locked", f"stage {s['order']} should be locked, got {s['state']}"

        # cannot start locked stage 5
        r = api.post(f"{base_url}/api/path/stages/5/start", headers=seeker_headers)
        assert r.status_code == 403

    def test_stage_5_detail_has_year2_practices(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/path/stages/5", headers=seeker_headers)
        assert r.status_code == 200
        st = r.json()["stage"]
        assert st["order"] == 5 and st["year"] == 2
        titles = {p["practice_id"] for p in st["practices_full"]}
        # Year 2 practices per seed_data
        assert "meridian-qigong" in titles
        assert "deep-body-awareness" in titles

    def test_year2_practices_exist(self, api, base_url):
        # 6 new Year-2 practices listed under intermediate/advanced
        pl = api.get(f"{base_url}/api/practices").json()["practices"]
        pids = {p["practice_id"] for p in pl}
        for expected in [
            "meridian-qigong", "deep-body-awareness",
            "dantian-breathing", "microcosmic-orbit",
            "three-treasures", "extended-sitting",
        ]:
            assert expected in pids, f"missing Year-2 practice: {expected}"
