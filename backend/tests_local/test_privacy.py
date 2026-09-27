# Other practitioners see a profile, not an account. The privacy policy says
# the intention is private; reminders, sign-in method and membership are too.

PRIVATE = (
    "intention",
    "reminder_enabled",
    "reminder_hour",
    "reminder_minute",
    "auth_provider",
    "has_password",
    "is_premium",
    "premium_expires_at",
)


def test_profile_shows_only_public_fields(client, user, other):
    r = client.get(f"/api/community/users/{other['user']['user_id']}", headers=user["headers"])
    assert r.status_code == 200, r.text
    profile = r.json()["profile"]
    assert profile["display_name"] == "Tester" and profile["path_choice"] == "dao"
    assert [k for k in PRIVATE if k in profile] == []


def test_practitioner_list_shows_only_public_fields(client, user, other):
    people = client.get("/api/community/practitioners", headers=user["headers"]).json()["practitioners"]
    assert people
    assert [k for p in people for k in PRIVATE if k in p] == []


def test_own_account_keeps_its_settings(client, user):
    me = client.get("/api/auth/me", headers=user["headers"]).json()["user"]
    assert me["intention"] == "live well"
    assert "reminder_hour" in me and "is_premium" in me
