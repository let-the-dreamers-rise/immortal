"""Account security beyond register/login: passwords, resets, sessions, Google.

- Change or set a password (Google accounts can add one).
- Sign out everywhere.
- Forgot password: a six-digit code sent by email, valid for 15 minutes and
  five tries. Needs SMTP_* settings; without them the endpoint says so
  instead of pretending to send.
- Native Google sign-in: the app sends a Google ID token, the server checks it
  with Google and that it was issued to one of GOOGLE_CLIENT_IDS.
"""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Awaitable, Callable, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger("immortality.auth")

RESET_TTL_MINUTES = 15
RESET_MAX_TRIES = 5


class ChangePasswordIn(BaseModel):
    current_password: Optional[str] = None
    new_password: str = Field(min_length=8, max_length=128)


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class GoogleIdTokenIn(BaseModel):
    id_token: str = Field(min_length=20)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{email}:{code}".encode()).hexdigest()


def smtp_configured() -> bool:
    return all(os.environ.get(k) for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"))


def _send_mail(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = os.environ.get("SMTP_FROM") or os.environ["SMTP_USER"]
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    port = int(os.environ.get("SMTP_PORT", "587"))
    with smtplib.SMTP(os.environ["SMTP_HOST"], port, timeout=20) as s:
        s.starttls()
        s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        s.send_message(msg)


def google_client_ids() -> set:
    return {c.strip() for c in os.environ.get("GOOGLE_CLIENT_IDS", "").split(",") if c.strip()}


def build_router(
    db,
    get_current_user: Callable[..., Awaitable[dict]],
    *,
    hash_password: Callable[[str], str],
    verify_password: Callable[[str, str], bool],
    create_session: Callable[[str], Awaitable[str]],
    rate_limit: Callable[[str], Awaitable[None]],
    upsert_oauth_user: Callable[[str, Optional[str], Optional[str], str], Awaitable[dict]],
    public_user: Callable[[dict], dict],
) -> APIRouter:
    router = APIRouter()

    @router.post("/auth/password")
    async def change_password(
        body: ChangePasswordIn,
        user: dict = Depends(get_current_user),
        authorization: Optional[str] = Header(default=None),
    ):
        await rate_limit(f"password:{user['user_id']}")
        full = await db.users.find_one({"user_id": user["user_id"]})
        if full.get("hashed_password"):
            if not body.current_password or not verify_password(body.current_password, full["hashed_password"]):
                raise HTTPException(status_code=401, detail="Your current password is not correct.")
        await db.users.update_one(
            {"user_id": user["user_id"]}, {"$set": {"hashed_password": hash_password(body.new_password)}}
        )
        # Keep this device signed in; every other session is revoked.
        token = (authorization or "").split(" ", 1)[-1].strip()
        await db.user_sessions.delete_many({"user_id": user["user_id"], "session_token": {"$ne": token}})
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        return {"ok": True, "user": public_user(fresh)}

    @router.post("/auth/logout-all")
    async def logout_all(user: dict = Depends(get_current_user)):
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
        return {"ok": True}

    @router.post("/auth/password/forgot")
    async def forgot(body: ForgotIn, request: Request):
        email = body.email.lower()
        await rate_limit(f"forgot:{email}")
        if not smtp_configured():
            raise HTTPException(
                status_code=503,
                detail="Password reset by email is not available yet. Contact support to recover your account.",
            )
        user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
        # Same answer whether or not the account exists, so the form cannot be
        # used to discover who has signed up.
        if user:
            code = f"{secrets.randbelow(10**6):06d}"
            await db.password_resets.delete_many({"email": email})
            await db.password_resets.insert_one(
                {
                    "email": email,
                    "code_hash": _hash_code(email, code),
                    "expires_at": _now() + timedelta(minutes=RESET_TTL_MINUTES),
                    "tries": 0,
                }
            )
            try:
                await run_in_threadpool(
                    _send_mail,
                    email,
                    "Your Immortal reset code",
                    f"Your code is {code}. It expires in {RESET_TTL_MINUTES} minutes.\n\n"
                    "If you did not ask to reset your password, you can ignore this email.",
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("reset email failed: %s", type(e).__name__)
                raise HTTPException(status_code=502, detail="Could not send the email. Try again shortly.")
        return {"ok": True}

    @router.post("/auth/password/reset")
    async def reset(body: ResetIn):
        email = body.email.lower()
        await rate_limit(f"reset:{email}")
        rec = await db.password_resets.find_one({"email": email})
        invalid = HTTPException(status_code=400, detail="That code is not valid or has expired.")
        if not rec:
            raise invalid
        exp = rec["expires_at"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now() or rec.get("tries", 0) >= RESET_MAX_TRIES:
            await db.password_resets.delete_many({"email": email})
            raise invalid
        if not secrets.compare_digest(rec["code_hash"], _hash_code(email, body.code)):
            await db.password_resets.update_one({"email": email}, {"$inc": {"tries": 1}})
            raise invalid
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            raise invalid
        await db.users.update_one({"email": email}, {"$set": {"hashed_password": hash_password(body.new_password)}})
        await db.password_resets.delete_many({"email": email})
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
        token = await create_session(user["user_id"])
        return {"session_token": token, "user": public_user(user)}

    @router.get("/auth/providers")
    async def providers():
        return {"google": bool(google_client_ids()), "password_reset": smtp_configured()}

    @router.post("/auth/google")
    async def google_id_token(body: GoogleIdTokenIn, request: Request):
        allowed = google_client_ids()
        if not allowed:
            raise HTTPException(status_code=503, detail="Google sign-in is not set up yet.")
        async with httpx.AsyncClient(timeout=15) as hc:
            resp = await hc.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": body.id_token})
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
        info = resp.json()
        if info.get("aud") not in allowed or info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
        if str(info.get("email_verified")).lower() != "true" or not info.get("email"):
            raise HTTPException(status_code=401, detail="Your Google email is not verified.")
        user = await upsert_oauth_user(info["email"].lower(), info.get("name"), info.get("picture"), "google")
        token = await create_session(user["user_id"])
        return {"session_token": token, "user": public_user(user)}

    return router
