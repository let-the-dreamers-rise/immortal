from datetime import date

import analytics
import server
from conftest import run

DEVICE = "dev_test_0001"


def post(client, events, headers=None, device=DEVICE):
    return client.post("/api/events", json={"device_id": device, "events": events}, headers=headers or {})


def test_visitor_events_are_recorded_without_an_account(client):
    r = post(client, [{"name": "app_open"}, {"name": "practice_finished", "props": {"practice_id": "micro-kou-chi"}}])
    assert r.status_code == 200 and r.json()["recorded"] == 2
    doc = run(server.db.events.find_one({"device_id": DEVICE, "name": "practice_finished"}))
    assert doc["user_id"] is None and doc["props"] == {"practice_id": "micro-kou-chi"}


def test_unknown_names_are_dropped_and_input_is_bounded(client):
    assert post(client, [{"name": "keylogger"}]).json()["recorded"] == 0
    assert post(client, [{"name": "app_open"}], device="bad id!").status_code == 400
    assert post(client, [{"name": "app_open"}] * 21).status_code == 422
    long = post(client, [{"name": "error", "props": {"message": "x" * 5000}}])
    assert long.status_code == 200
    doc = run(server.db.events.find_one({"device_id": DEVICE, "name": "error"}))
    assert len(doc["props"]["message"]) == analytics.MAX_VALUE


def test_signed_in_events_carry_the_account_and_are_erased_with_it(client, user):
    post(client, [{"name": "signup"}], headers=user["headers"], device="dev_erase_01")
    uid = user["user"]["user_id"]
    assert run(server.db.events.count_documents({"user_id": uid})) == 1
    client.request("DELETE", "/api/account", json={"confirm": "DELETE"}, headers=user["headers"])
    assert run(server.db.events.count_documents({"user_id": uid})) == 0


def test_stats_are_only_for_admins(client, user, monkeypatch):
    assert client.get("/api/admin/stats", headers=user["headers"]).status_code == 403
    monkeypatch.setenv("ADMIN_EMAILS", user["email"])
    r = client.get("/api/admin/stats", headers=user["headers"])
    assert r.status_code == 200 and "visitors" in r.json()


def test_summary_counts_returns():
    today = date(2026, 10, 10)
    ev = [
        {"name": "app_open", "device_id": "a", "day": "2026-10-01"},
        {"name": "app_open", "device_id": "a", "day": "2026-10-09"},
        {"name": "practice_finished", "device_id": "a", "day": "2026-10-01"},
        {"name": "app_open", "device_id": "b", "day": "2026-10-01"},
        {"name": "signup", "device_id": "b", "day": "2026-10-01"},
        {"name": "app_open", "device_id": "c", "day": "2026-10-10"},
        {"name": "error", "device_id": "c", "day": "2026-10-10", "props": {"message": "boom"}},
    ]
    s = analytics.summarise(ev, today)
    assert s["visitors"] == 3 and s["finished_a_practice"] == 1 and s["created_an_account"] == 1
    # c was first seen today, so it has not had the chance to come back yet.
    assert s["came_back_next_day_or_later"] == {"eligible": 2, "returned": 1}
    assert s["came_back_after_a_week"] == {"eligible": 2, "returned": 1}
    assert s["errors_last_7_days"] == [{"message": "boom", "count": 1}]
