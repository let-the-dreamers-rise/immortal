"""Backend integration tests for Immortality Dao Longevity API."""
import uuid
import pytest


# ---------- Health / root ----------
def test_root(api, base_url):
    r = api.get(f"{base_url}/api/")
    assert r.status_code == 200
    assert "Immortality" in r.json().get("message", "")


# ---------- Auth ----------
class TestAuth:
    def test_login_seeker(self, api, base_url):
        r = api.post(f"{base_url}/api/auth/login", json={"email": "seeker@example.com", "password": "lotus123"})
        assert r.status_code == 200
        data = r.json()
        assert "session_token" in data
        assert data["user"]["onboarded"] is True
        assert data["user"]["path_choice"] == "dao"

    def test_login_bad_password(self, api, base_url):
        r = api.post(f"{base_url}/api/auth/login", json={"email": "seeker@example.com", "password": "wrongpw"})
        assert r.status_code == 401

    def test_register_and_me(self, api, base_url):
        email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
        r = api.post(f"{base_url}/api/auth/register", json={"email": email, "password": "testpass123", "display_name": "TESTUser"})
        assert r.status_code == 200
        tok = r.json()["session_token"]
        assert r.json()["user"]["onboarded"] is False
        me = api.get(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert me.status_code == 200
        # public_user intentionally does not expose email
        assert "email" not in me.json()["user"]
        assert me.json()["user"]["display_name"] == "TESTUser"

    def test_duplicate_register(self, api, base_url):
        r = api.post(f"{base_url}/api/auth/register", json={"email": "seeker@example.com", "password": "lotus123", "display_name": "River"})
        assert r.status_code == 409

    def test_me_unauth(self, api, base_url):
        r = api.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_logout(self, api, base_url):
        # register a throwaway user, then logout, then me should fail
        email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
        rr = api.post(f"{base_url}/api/auth/register", json={"email": email, "password": "abcdef", "display_name": "Bye"})
        tok = rr.json()["session_token"]
        h = {"Authorization": f"Bearer {tok}"}
        lo = api.post(f"{base_url}/api/auth/logout", headers=h)
        assert lo.status_code == 200
        me = api.get(f"{base_url}/api/auth/me", headers=h)
        assert me.status_code == 401


# ---------- Onboarding ----------
class TestOnboarding:
    def test_onboarding_sets_intention_and_path(self, api, base_url, new_user):
        r = api.post(
            f"{base_url}/api/auth/onboarding",
            headers=new_user["headers"],
            json={"intention": "Cultivate stillness", "path_choice": "dao"},
        )
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["onboarded"] is True
        assert u["path_choice"] == "dao"
        assert u["intention"] == "Cultivate stillness"

    def test_onboarding_invalid_path(self, api, base_url, seeker_headers):
        r = api.post(f"{base_url}/api/auth/onboarding", headers=seeker_headers, json={"intention": "x", "path_choice": "zen"})
        assert r.status_code == 400


# ---------- Practices ----------
class TestPractices:
    def test_list_all(self, api, base_url):
        r = api.get(f"{base_url}/api/practices")
        assert r.status_code == 200
        pl = r.json()["practices"]
        assert isinstance(pl, list) and len(pl) >= 15
        assert all("practice_id" in p and "tradition" in p and "illustration_url" in p for p in pl)

    def test_filter_dao(self, api, base_url):
        r = api.get(f"{base_url}/api/practices", params={"tradition": "dao"})
        assert r.status_code == 200
        assert all(p["tradition"] == "dao" for p in r.json()["practices"])

    def test_filter_ayurveda(self, api, base_url):
        r = api.get(f"{base_url}/api/practices", params={"tradition": "ayurveda"})
        assert r.status_code == 200
        assert all(p["tradition"] == "ayurveda" for p in r.json()["practices"])

    def test_get_one_practice(self, api, base_url):
        pl = api.get(f"{base_url}/api/practices").json()["practices"]
        pid = pl[0]["practice_id"]
        r = api.get(f"{base_url}/api/practices/{pid}")
        assert r.status_code == 200
        assert r.json()["practice"]["practice_id"] == pid

    def test_get_missing_practice(self, api, base_url):
        r = api.get(f"{base_url}/api/practices/does_not_exist")
        assert r.status_code == 404


# ---------- Path ----------
class TestPath:
    def test_list_stages_seeker(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/path/stages", headers=seeker_headers)
        assert r.status_code == 200
        s = r.json()["stages"]
        assert len(s) == 4
        assert s[0]["state"] in ("available", "in_progress", "completed")
        assert s[0]["order"] == 1

    def test_stage_detail(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/path/stages/1", headers=seeker_headers)
        assert r.status_code == 200
        st = r.json()["stage"]
        assert st["order"] == 1
        assert "practices_full" in st and "min_checkins" in st

    def test_stage_not_found(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/path/stages/99", headers=seeker_headers)
        assert r.status_code == 404

    def test_start_locked_stage(self, api, base_url, new_user):
        # New user – onboard, then attempt stage 2 (locked)
        api.post(f"{base_url}/api/auth/onboarding", headers=new_user["headers"], json={"intention": "peace", "path_choice": "dao"})
        r = api.post(f"{base_url}/api/path/stages/2/start", headers=new_user["headers"])
        assert r.status_code == 403

    def test_full_stage_flow_and_checkin(self, api, base_url):
        # New user, onboard, start stage 1, log 3 check-ins, complete
        email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
        rr = api.post(f"{base_url}/api/auth/register", json={"email": email, "password": "abcdef", "display_name": "PathUser"})
        h = {"Authorization": f"Bearer {rr.json()['session_token']}", "Content-Type": "application/json"}
        api.post(f"{base_url}/api/auth/onboarding", headers=h, json={"intention": "walk", "path_choice": "dao"})

        # Start stage 1
        s = api.post(f"{base_url}/api/path/stages/1/start", headers=h)
        assert s.status_code == 200

        # min_checkins for stage 1
        detail = api.get(f"{base_url}/api/path/stages/1", headers=h).json()["stage"]
        min_ci = detail["min_checkins"]

        # Try to complete early → not unlocked
        early = api.post(f"{base_url}/api/path/stages/1/complete", headers=h, json={"self_assessment": "ready"})
        assert early.status_code == 200
        assert early.json()["unlocked"] is False

        # Log min_checkins with stage_order=1
        for _ in range(min_ci):
            lr = api.post(f"{base_url}/api/logs", headers=h, json={"body": "sit", "stage_order": 1})
            assert lr.status_code == 200

        # Verify checkins bumped
        detail2 = api.get(f"{base_url}/api/path/stages/1", headers=h).json()["stage"]
        assert detail2["checkins"] >= min_ci

        # Choose more_time → not unlocked, records assessment
        mt = api.post(f"{base_url}/api/path/stages/1/complete", headers=h, json={"self_assessment": "more_time"})
        assert mt.status_code == 200 and mt.json()["unlocked"] is False

        # Now ready → unlocked
        rd = api.post(f"{base_url}/api/path/stages/1/complete", headers=h, json={"self_assessment": "ready"})
        assert rd.status_code == 200 and rd.json()["unlocked"] is True

        # Stage 2 should be available now
        stages = api.get(f"{base_url}/api/path/stages", headers=h).json()["stages"]
        assert stages[1]["state"] == "available"


# ---------- Logs ----------
class TestLogs:
    def test_create_and_list_my_logs(self, api, base_url, seeker_headers):
        body = {"body": "TEST_reflection " + uuid.uuid4().hex[:6], "mood": "still", "visibility": "private"}
        r = api.post(f"{base_url}/api/logs", headers=seeker_headers, json=body)
        assert r.status_code == 200
        log_id = r.json()["log"]["log_id"]
        assert r.json()["log"]["mood"] == "still"

        me_logs = api.get(f"{base_url}/api/logs/me", headers=seeker_headers).json()["logs"]
        assert any(l["log_id"] == log_id for l in me_logs)
        # cleanup soft delete
        d = api.delete(f"{base_url}/api/logs/{log_id}", headers=seeker_headers)
        assert d.status_code == 200
        me_logs2 = api.get(f"{base_url}/api/logs/me", headers=seeker_headers).json()["logs"]
        assert not any(l["log_id"] == log_id for l in me_logs2)

    def test_nothing_happened_log(self, api, base_url, seeker_headers):
        r = api.post(f"{base_url}/api/logs", headers=seeker_headers, json={"nothing_happened": True, "visibility": "private"})
        assert r.status_code == 200
        assert r.json()["log"]["nothing_happened"] is True
        api.delete(f"{base_url}/api/logs/{r.json()['log']['log_id']}", headers=seeker_headers)

    def test_public_log_in_feed(self, api, base_url, seeker_headers):
        r = api.post(f"{base_url}/api/logs", headers=seeker_headers, json={"body": "TEST_public reflection", "visibility": "public"})
        assert r.status_code == 200
        log_id = r.json()["log"]["log_id"]
        feed = api.get(f"{base_url}/api/logs/feed", headers=seeker_headers).json()["logs"]
        assert any(l["log_id"] == log_id for l in feed)
        # A private log should NOT be in feed
        r2 = api.post(f"{base_url}/api/logs", headers=seeker_headers, json={"body": "TEST_private", "visibility": "private"})
        priv_id = r2.json()["log"]["log_id"]
        feed2 = api.get(f"{base_url}/api/logs/feed", headers=seeker_headers).json()["logs"]
        assert not any(l["log_id"] == priv_id for l in feed2)
        api.delete(f"{base_url}/api/logs/{log_id}", headers=seeker_headers)
        api.delete(f"{base_url}/api/logs/{priv_id}", headers=seeker_headers)

    def test_delete_others_log_fails(self, api, base_url, seeker_headers, new_user):
        api.post(f"{base_url}/api/auth/onboarding", headers=new_user["headers"], json={"intention": "x", "path_choice": "both"})
        r = api.post(f"{base_url}/api/logs", headers=seeker_headers, json={"body": "TEST_owner", "visibility": "private"})
        log_id = r.json()["log"]["log_id"]
        d = api.delete(f"{base_url}/api/logs/{log_id}", headers=new_user["headers"])
        assert d.status_code == 404
        api.delete(f"{base_url}/api/logs/{log_id}", headers=seeker_headers)


# ---------- Stats ----------
class TestStats:
    def test_stats_shape(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/stats/me", headers=seeker_headers)
        assert r.status_code == 200
        s = r.json()["stats"]
        for k in ["streak_current", "streak_longest", "total_days", "total_logs", "milestones", "milestones_achieved", "is_elder", "stages_completed", "stages_total"]:
            assert k in s
        assert s["stages_total"] == 4


# ---------- Community ----------
class TestCommunity:
    def test_practitioners(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/community/practitioners", headers=seeker_headers)
        assert r.status_code == 200
        assert isinstance(r.json()["practitioners"], list)

    def test_follow_unfollow(self, api, base_url, seeker_headers, new_user):
        api.post(f"{base_url}/api/auth/onboarding", headers=new_user["headers"], json={"intention": "x", "path_choice": "dao"})
        target_id = new_user["user"]["user_id"]
        f = api.post(f"{base_url}/api/community/users/{target_id}/follow", headers=seeker_headers)
        assert f.status_code == 200 and f.json()["is_following"] is True
        prof = api.get(f"{base_url}/api/community/users/{target_id}", headers=seeker_headers).json()["profile"]
        assert prof["is_following"] is True
        assert prof["followers"] >= 1
        u = api.delete(f"{base_url}/api/community/users/{target_id}/follow", headers=seeker_headers)
        assert u.status_code == 200 and u.json()["is_following"] is False

    def test_follow_self_forbidden(self, api, base_url, seeker_token):
        me = api.get(f"{base_url}/api/auth/me", headers={"Authorization": f"Bearer {seeker_token}"}).json()["user"]
        r = api.post(f"{base_url}/api/community/users/{me['user_id']}/follow", headers={"Authorization": f"Bearer {seeker_token}"})
        assert r.status_code == 400

    def test_get_unknown_user(self, api, base_url, seeker_headers):
        r = api.get(f"{base_url}/api/community/users/user_nope", headers=seeker_headers)
        assert r.status_code == 404
