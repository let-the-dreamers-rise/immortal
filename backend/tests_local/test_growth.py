from datetime import datetime, timedelta, timezone

import growth


NOW = datetime(2026, 9, 27, 12, tzinfo=timezone.utc)


def _user(uid, days_ago, **extra):
    return {"user_id": uid, "created_at": NOW - timedelta(days=days_ago), **extra}


def _on(days_ago):
    return (NOW - timedelta(days=days_ago)).date()


def test_retention_counts_only_members_whose_window_has_passed():
    users = [
        _user("a", 40),  # practised on day 30: retained at d30
        _user("b", 40),  # never came back
        _user("c", 10),  # too new for d30; its d7 window has not closed
        _user("user_archive", 400),
    ]
    activity = {"a": {_on(40), _on(39), _on(10)}, "c": {_on(10)}}
    m = growth.compute_metrics(users, activity, NOW)

    assert m["users"]["total"] == 3
    assert m["retention"]["d30"] == {"eligible": 2, "retained": 1, "rate": 0.5}
    assert m["retention"]["d1"] == {"eligible": 3, "retained": 1, "rate": 0.3333}
    assert m["retention"]["d7"]["eligible"] == 2
    assert m["activation"]["practised_by_day_1"] == 2
    assert m["practising"]["last_30d"] == 2 and m["practising"]["today"] == 0


def test_conversion_ignores_expired_memberships():
    users = [
        _user("a", 5, is_premium=True, premium_expires_at=NOW + timedelta(days=300)),
        _user("b", 5, is_premium=True, premium_expires_at=NOW - timedelta(days=1)),
        _user("c", 5),
        _user("d", 5),
    ]
    m = growth.compute_metrics(users, {}, NOW)
    assert m["inner_chamber"] == {"members": 1, "conversion_rate": 0.25}
    assert m["users"]["new_7d"] == 4


def test_endpoint_is_hidden_without_key_and_guarded_with_one(client, user, monkeypatch):
    monkeypatch.delenv("ADMIN_METRICS_KEY", raising=False)
    assert client.get("/api/admin/metrics").status_code == 404

    monkeypatch.setenv("ADMIN_METRICS_KEY", "k_secret")
    assert client.get("/api/admin/metrics", headers={"X-Admin-Key": "wrong"}).status_code == 401

    client.post("/api/logs", json={"body": "stood for five minutes"}, headers=user["headers"])
    r = client.get("/api/admin/metrics", headers={"X-Admin-Key": "k_secret"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["users"]["total"] >= 1
    assert body["practising"]["today"] >= 1
