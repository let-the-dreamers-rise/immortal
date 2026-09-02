import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://essence-path-1.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def seeker_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": "seeker@example.com", "password": "lotus123"})
    assert r.status_code == 200, f"Seeker login failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def seeker_headers(seeker_token):
    return {"Authorization": f"Bearer {seeker_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def new_user(api):
    """Fresh, un-onboarded user for onboarding flow."""
    email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
    password = "testpass123"
    display_name = f"TEST_{uuid.uuid4().hex[:6]}"
    r = api.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": password, "display_name": display_name},
    )
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    body = r.json()
    return {
        "email": email,
        "password": password,
        "display_name": display_name,
        "token": body["session_token"],
        "user": body["user"],
        "headers": {"Authorization": f"Bearer {body['session_token']}", "Content-Type": "application/json"},
    }
