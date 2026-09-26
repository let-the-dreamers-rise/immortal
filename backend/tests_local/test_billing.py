from datetime import datetime, timedelta, timezone

import billing
import server
from conftest import run


def _now():
    return datetime.now(timezone.utc)


def test_entitlement_state_active_expired_lifetime():
    future = (_now() + timedelta(days=5)).isoformat().replace("+00:00", "Z")
    past = (_now() - timedelta(days=5)).isoformat().replace("+00:00", "Z")
    ent = billing.ENTITLEMENT_ID
    assert billing.entitlement_state({"entitlements": {ent: {"expires_date": future}}}, _now())["is_premium"] is True
    assert billing.entitlement_state({"entitlements": {ent: {"expires_date": past}}}, _now())["is_premium"] is False
    assert billing.entitlement_state({"entitlements": {ent: {"expires_date": None}}}, _now())["is_premium"] is True
    assert billing.entitlement_state({"entitlements": {}}, _now())["is_premium"] is False


def test_user_is_premium_respects_expiry():
    assert billing.user_is_premium({"is_premium": True, "premium_expires_at": None})
    assert not billing.user_is_premium({"is_premium": True, "premium_expires_at": _now() - timedelta(seconds=1)})
    assert not billing.user_is_premium({"is_premium": False})


def test_sync_without_key_is_unverified(client, user, monkeypatch):
    monkeypatch.delenv("REVENUECAT_SECRET_KEY", raising=False)
    r = client.post("/api/billing/sync", headers=user["headers"])
    assert r.status_code == 200 and r.json()["server_verified"] is False


def test_sync_with_key_updates_user(client, user, monkeypatch):
    monkeypatch.setenv("REVENUECAT_SECRET_KEY", "sk_test")

    async def fake_fetch(uid):
        return {"entitlements": {billing.ENTITLEMENT_ID: {"expires_date": None, "product_identifier": "immortal_annual"}}}

    monkeypatch.setattr(billing, "fetch_subscriber", fake_fetch)
    r = client.post("/api/billing/sync", headers=user["headers"])
    assert r.status_code == 200
    assert r.json()["user"]["is_premium"] is True


def test_webhook_requires_auth(client, monkeypatch):
    monkeypatch.setenv("REVENUECAT_WEBHOOK_AUTH", "Bearer hook-secret")
    assert client.post("/api/billing/webhook", json={"event": {}}).status_code == 401
    assert client.post("/api/billing/webhook", json={"event": {}}, headers={"Authorization": "Bearer wrong"}).status_code == 401
    r = client.post("/api/billing/webhook", json={"event": {"type": "TEST"}}, headers={"Authorization": "Bearer hook-secret"})
    assert r.status_code == 200


def test_webhook_expiration_revokes(client, user, monkeypatch):
    monkeypatch.setenv("REVENUECAT_WEBHOOK_AUTH", "hook")
    monkeypatch.setenv("REVENUECAT_SECRET_KEY", "sk_test")
    uid = user["user"]["user_id"]
    run(server.db.users.update_one({"user_id": uid}, {"$set": {"is_premium": True, "premium_expires_at": None}}))

    async def expired(_uid):
        return {"entitlements": {billing.ENTITLEMENT_ID: {"expires_date": "2020-01-01T00:00:00Z"}}}

    monkeypatch.setattr(billing, "fetch_subscriber", expired)
    r = client.post("/api/billing/webhook", json={"event": {"type": "EXPIRATION", "app_user_id": uid}}, headers={"Authorization": "hook"})
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=user["headers"]).json()["user"]["is_premium"] is False


def _finish_year_one(uid):
    stages = {str(o): {"started_at": _now(), "completed": True, "checkins": 99} for o in (1, 2, 3, 4)}
    run(server.db.path_progress.update_one({"user_id": uid}, {"$set": {"user_id": uid, "stages": stages}}, upsert=True))


def test_year_two_is_gated_when_enforcing(client, user, monkeypatch):
    monkeypatch.setenv("REVENUECAT_SECRET_KEY", "sk_test")
    _finish_year_one(user["user"]["user_id"])
    assert client.post("/api/path/stages/5/start", headers=user["headers"]).status_code == 402
    run(server.db.users.update_one({"user_id": user["user"]["user_id"]}, {"$set": {"is_premium": True, "premium_expires_at": None}}))
    assert client.post("/api/path/stages/5/start", headers=user["headers"]).status_code == 200


def test_year_two_open_when_not_enforcing(client, user, monkeypatch):
    monkeypatch.delenv("REVENUECAT_SECRET_KEY", raising=False)
    _finish_year_one(user["user"]["user_id"])
    assert client.post("/api/path/stages/5/start", headers=user["headers"]).status_code == 200
