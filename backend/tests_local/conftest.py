"""In-process tests: the real FastAPI app against an in-memory Mongo.

Unlike ``tests/`` (which call a deployed server), these need no network and
no database, so they run anywhere: ``pytest tests_local``.
"""

import os
import sys
import uuid
from pathlib import Path

import motor.motor_asyncio
import pytest
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "immortal_test")
motor.motor_asyncio.AsyncIOMotorClient = AsyncMongoMockClient  # type: ignore[misc]

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


def run(coro):
    """Drive a mock-motor coroutine from sync test code."""
    import asyncio

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@pytest.fixture(scope="session")
def client():
    with TestClient(server.app) as c:
        yield c


@pytest.fixture(autouse=True)
def _clear_throttle():
    # The auth throttle is per-IP and every TestClient request shares one.
    run(server.db.auth_attempts.delete_many({}))
    yield


def make_user(client, onboard=True):
    email = f"t_{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/register", json={"email": email, "password": "longpass1", "display_name": "Tester"})
    assert r.status_code == 200, r.text
    token = r.json()["session_token"]
    headers = {"Authorization": f"Bearer {token}"}
    if onboard:
        r = client.post("/api/auth/onboarding", json={"intention": "live well", "path_choice": "dao"}, headers=headers)
        assert r.status_code == 200, r.text
    return {"email": email, "password": "longpass1", "headers": headers, "user": r.json()["user"]}


@pytest.fixture
def user(client):
    return make_user(client)


@pytest.fixture
def other(client):
    return make_user(client)
