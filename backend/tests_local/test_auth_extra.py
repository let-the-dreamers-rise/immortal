from datetime import datetime, timedelta, timezone

import auth_extra
import server
from conftest import run


def test_register_rejects_short_password(client):
    r = client.post("/api/auth/register", json={"email": "short@example.com", "password": "abc123", "display_name": "Shorty"})
    assert r.status_code == 422


def test_public_user_exposes_auth_shape(user):
    u = user["user"]
    assert u["has_password"] is True
    assert u["auth_provider"] == "email"
    assert u["is_premium"] is False


PRIVATE_FIELDS = {"intention", "reminder_enabled", "reminder_hour", "auth_provider", "has_password", "is_premium", "premium_expires_at"}


def test_community_endpoints_hide_private_fields(client, user, other):
    people = client.get("/api/community/practitioners", headers=other["headers"]).json()["practitioners"]
    me = next(p for p in people if p["user_id"] == user["user"]["user_id"])
    assert not PRIVATE_FIELDS & me.keys()
    profile = client.get(f"/api/community/users/{user['user']['user_id']}", headers=other["headers"]).json()["profile"]
    assert not PRIVATE_FIELDS & profile.keys()


def test_change_password_requires_current(client, user):
    r = client.post("/api/auth/password", json={"current_password": "wrong-one", "new_password": "brandnew99"}, headers=user["headers"])
    assert r.status_code == 401
    r = client.post("/api/auth/password", json={"current_password": user["password"], "new_password": "brandnew99"}, headers=user["headers"])
    assert r.status_code == 200
    assert client.post("/api/auth/login", json={"email": user["email"], "password": "brandnew99"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": user["email"], "password": user["password"]}).status_code == 401


def test_change_password_revokes_other_sessions(client, user):
    other = client.post("/api/auth/login", json={"email": user["email"], "password": user["password"]}).json()
    other_headers = {"Authorization": f"Bearer {other['session_token']}"}
    client.post("/api/auth/password", json={"current_password": user["password"], "new_password": "another99"}, headers=user["headers"])
    assert client.get("/api/auth/me", headers=user["headers"]).status_code == 200
    assert client.get("/api/auth/me", headers=other_headers).status_code == 401


def test_logout_all(client, user):
    assert client.post("/api/auth/logout-all", headers=user["headers"]).status_code == 200
    assert client.get("/api/auth/me", headers=user["headers"]).status_code == 401


def test_forgot_without_smtp_is_honest(client, user, monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    r = client.post("/api/auth/password/forgot", json={"email": user["email"]})
    assert r.status_code == 503


def test_forgot_and_reset_flow(client, user, monkeypatch):
    sent = {}
    for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        monkeypatch.setenv(k, "x")
    monkeypatch.setattr(auth_extra, "_send_mail", lambda to, subject, body: sent.update(to=to, body=body))
    assert client.post("/api/auth/password/forgot", json={"email": user["email"]}).status_code == 200
    code = sent["body"].split("Your code is ")[1][:6]
    bad = client.post("/api/auth/password/reset", json={"email": user["email"], "code": "000000" if code != "000000" else "111111", "new_password": "resetpass1"})
    assert bad.status_code == 400
    ok = client.post("/api/auth/password/reset", json={"email": user["email"], "code": code, "new_password": "resetpass1"})
    assert ok.status_code == 200 and ok.json()["session_token"]
    # Old sessions are gone; the code is single-use.
    assert client.get("/api/auth/me", headers=user["headers"]).status_code == 401
    again = client.post("/api/auth/password/reset", json={"email": user["email"], "code": code, "new_password": "resetpass2"})
    assert again.status_code == 400


def test_forgot_unknown_email_looks_the_same(client, monkeypatch):
    for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        monkeypatch.setenv(k, "x")
    monkeypatch.setattr(auth_extra, "_send_mail", lambda *a: (_ for _ in ()).throw(AssertionError("no mail")))
    assert client.post("/api/auth/password/forgot", json={"email": "nobody@example.com"}).status_code == 200


def test_expired_reset_code(client, user, monkeypatch):
    sent = {}
    for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        monkeypatch.setenv(k, "x")
    monkeypatch.setattr(auth_extra, "_send_mail", lambda to, subject, body: sent.update(body=body))
    client.post("/api/auth/password/forgot", json={"email": user["email"]})
    code = sent["body"].split("Your code is ")[1][:6]
    run(server.db.password_resets.update_one(
        {"email": user["email"]}, {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}}
    ))
    r = client.post("/api/auth/password/reset", json={"email": user["email"], "code": code, "new_password": "resetpass1"})
    assert r.status_code == 400


def test_providers_and_google_disabled(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_IDS", raising=False)
    assert client.get("/api/auth/providers").json()["google"] is False
    assert client.post("/api/auth/google", json={"id_token": "x" * 30}).status_code == 503


def test_google_id_token_rejects_wrong_audience(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_IDS", "mine.apps.googleusercontent.com")

    class Resp:
        status_code = 200

        @staticmethod
        def json():
            return {"aud": "someone-else", "iss": "accounts.google.com", "email": "g@example.com", "email_verified": "true"}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, *a, **k):
            return Resp()

    monkeypatch.setattr(auth_extra.httpx, "AsyncClient", FakeClient)
    assert client.post("/api/auth/google", json={"id_token": "x" * 30}).status_code == 401
    Resp.json = staticmethod(lambda: {"aud": "mine.apps.googleusercontent.com", "iss": "accounts.google.com", "email": "G@Example.com", "email_verified": "true", "name": "Gee"})
    r = client.post("/api/auth/google", json={"id_token": "x" * 30})
    assert r.status_code == 200
    assert r.json()["user"]["auth_provider"] == "google"
    assert r.json()["user"]["has_password"] is False
