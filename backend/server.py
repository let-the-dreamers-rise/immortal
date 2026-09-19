"""Immortality — Dao Longevity backend.

FastAPI + MongoDB. JWT/session auth (email+password) with optional Emergent
Google login, the guided Dao Path, a curated practice library with AI-generated
ink-wash illustrations (stored in Emergent Object Storage), and a journaling +
lightweight community-following layer.
"""

import asyncio
import base64
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import bcrypt
import httpx
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from today import build_today, growth_for
from seed_data import (
    ILLUSTRATION_STYLE,
    PRACTICE_ILLUSTRATION_SUBJECT,
    PRACTICES,
    STAGES,
    TEACHINGS,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("immortality")

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
SESSION_TTL_DAYS = 30

# Auth throttling. Backed by Mongo rather than process memory so the limit holds
# across workers and survives restarts — an in-process counter is trivially
# defeated by spreading attempts, which is exactly what credential stuffing does.
AUTH_MAX_ATTEMPTS = 8
AUTH_WINDOW_SECONDS = 300

# ---------------------------------------------------------------------------
# Object storage
# ---------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "immortality-dao"
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
    except Exception as e:  # noqa: BLE001
        logger.warning("storage init failed: %s", e)
        return None
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    global _storage_key
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Immortality — Dao Longevity")
api = APIRouter(prefix="/api")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:  # noqa: BLE001
        return False


def new_user_id() -> str:
    return "user_" + uuid.uuid4().hex[:12]


def public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "display_name": u.get("display_name"),
        "picture": u.get("picture"),
        "intention": u.get("intention"),
        "path_choice": u.get("path_choice"),
        "bio": u.get("bio"),
        "onboarded": u.get("onboarded", False),
        "reminder_enabled": u.get("reminder_enabled", False),
        "reminder_hour": u.get("reminder_hour", 8),
        "reminder_minute": u.get("reminder_minute", 0),
        "created_at": u.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Auth models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=2, max_length=40)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class OnboardingIn(BaseModel):
    intention: str
    path_choice: str  # dao | ayurveda | both


class ProfileIn(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None


def client_ip(request: Request) -> str:
    """Caller IP, honouring the proxy header the app is deployed behind."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def enforce_auth_rate_limit(key: str) -> None:
    """Throttle repeated auth attempts against the same key.

    Records every attempt, so a caller that is already over the limit stays
    locked out for the full window rather than regaining one attempt per tick.
    """
    cutoff = now_utc() - timedelta(seconds=AUTH_WINDOW_SECONDS)
    recent = await db.auth_attempts.count_documents({"key": key, "at": {"$gte": cutoff}})
    await db.auth_attempts.insert_one({"key": key, "at": now_utc()})
    if recent >= AUTH_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please wait a few minutes and try again.",
        )


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.user_sessions.insert_one(
        {
            "session_token": token,
            "user_id": user_id,
            "created_at": now_utc(),
            "expires_at": now_utc() + timedelta(days=SESSION_TTL_DAYS),
        }
    )
    return token


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn, request: Request):
    await enforce_auth_rate_limit(f"register:{client_ip(request)}")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = {
        "user_id": new_user_id(),
        "email": email,
        "display_name": body.display_name.strip(),
        "hashed_password": hash_password(body.password),
        "auth_provider": "email",
        "picture": None,
        "bio": None,
        "intention": None,
        "path_choice": None,
        "onboarded": False,
        "created_at": now_utc(),
    }
    await db.users.insert_one(user)
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    await enforce_auth_rate_limit(f"login:{body.email.lower()}")
    await enforce_auth_rate_limit(f"login-ip:{client_ip(request)}")
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not user.get("hashed_password") or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api.post("/auth/session")
async def google_session(body: SessionIn):
    async with httpx.AsyncClient(timeout=30) as hc:
        resp = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    data = resp.json()
    email = (data.get("email") or "").lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        user = existing
        if not user.get("picture") and data.get("picture"):
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"picture": data.get("picture")}})
            user["picture"] = data.get("picture")
    else:
        user = {
            "user_id": new_user_id(),
            "email": email,
            "display_name": (data.get("name") or email.split("@")[0]).strip(),
            "hashed_password": None,
            "auth_provider": "google",
            "picture": data.get("picture"),
            "bio": None,
            "intention": None,
            "path_choice": None,
            "onboarded": False,
            "created_at": now_utc(),
        }
        await db.users.insert_one(user)
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}



class DeleteAccountIn(BaseModel):
    confirm: str


@api.delete("/account")
async def delete_account(body: DeleteAccountIn, user: dict = Depends(get_current_user)):
    """Erase the account and everything attached to it.

    Required by Apple for any app with sign-up, and by the DPDP Act and GDPR
    as a right to erasure. The privacy policy describes this as complete
    deletion, so it deletes rather than anonymises — a partial purge would
    make that document untrue.

    Confirmation is a typed string rather than a password because Google
    accounts have no password to re-enter.
    """
    if body.confirm.strip().upper() != "DELETE":
        raise HTTPException(status_code=400, detail="Type DELETE to confirm.")

    uid = user["user_id"]

    # Meetups this user hosts go with them: leaving them listed would advertise
    # a gathering with no host to attendees who cannot be told it is off.
    hosted = await db.meetups.find({"host_id": uid}, {"_id": 0, "meetup_id": 1}).to_list(500)
    hosted_ids = [m["meetup_id"] for m in hosted]
    if hosted_ids:
        await db.rsvps.delete_many({"meetup_id": {"$in": hosted_ids}})
        await db.meetups.delete_many({"meetup_id": {"$in": hosted_ids}})

    await db.rsvps.delete_many({"user_id": uid})
    await db.comments.delete_many({"user_id": uid})
    await db.logs.delete_many({"user_id": uid})
    await db.path_progress.delete_many({"user_id": uid})
    # Both directions: their follows, and other people's follows of them.
    await db.follows.delete_many({"$or": [{"follower_id": uid}, {"following_id": uid}]})
    await db.users.delete_one({"user_id": uid})
    # Sessions last, so this request itself stays authenticated to the end.
    await db.user_sessions.delete_many({"user_id": uid})

    logger.info("account deleted: %s", uid)
    return {"ok": True}


@api.post("/auth/onboarding")
async def onboarding(body: OnboardingIn, user: dict = Depends(get_current_user)):
    if body.path_choice not in ("dao", "ayurveda", "both"):
        raise HTTPException(status_code=400, detail="Invalid path choice")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"intention": body.intention.strip(), "path_choice": body.path_choice, "onboarded": True}},
    )
    user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": public_user(user)}


@api.patch("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    updates = {}
    if body.display_name is not None and body.display_name.strip():
        updates["display_name"] = body.display_name.strip()[:40]
    if body.bio is not None:
        updates["bio"] = body.bio.strip()[:280]
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": public_user(user)}


# ---------------------------------------------------------------------------
# Practices
# ---------------------------------------------------------------------------
def illustration_url(practice_id: str) -> str:
    return f"/api/illustrations/{practice_id}"


@api.get("/practices")
async def list_practices(tradition: Optional[str] = None, difficulty: Optional[str] = None):
    q: dict = {"status": "approved"}
    if tradition and tradition != "all":
        q["tradition"] = tradition
    if difficulty and difficulty != "all":
        q["difficulty"] = difficulty
    docs = await db.practices.find(q, {"_id": 0}).to_list(200)
    docs.sort(key=lambda d: d.get("order", 999))
    for d in docs:
        d["illustration_url"] = illustration_url(d["practice_id"])
        d["has_illustration"] = bool(d.get("illustration_path"))
    return {"practices": docs}


@api.get("/practices/{practice_id}")
async def get_practice(practice_id: str):
    d = await db.practices.find_one({"practice_id": practice_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Practice not found")
    d["illustration_url"] = illustration_url(d["practice_id"])
    d["has_illustration"] = bool(d.get("illustration_path"))
    return {"practice": d}


@api.get("/teachings")
async def list_teachings():
    return {"teachings": TEACHINGS}


@api.get("/teachings/{teaching_id}")
async def get_teaching(teaching_id: str):
    t = next((x for x in TEACHINGS if x["teaching_id"] == teaching_id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Teaching not found")
    return {"teaching": t}


@api.get("/illustrations/{practice_id}")
async def serve_illustration(practice_id: str):
    d = await db.practices.find_one({"practice_id": practice_id}, {"_id": 0, "illustration_path": 1})
    if not d or not d.get("illustration_path"):
        raise HTTPException(status_code=404, detail="No illustration yet")
    try:
        content, ctype = await run_in_threadpool(get_object, d["illustration_path"])
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=404, detail="Illustration unavailable")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


# ---------------------------------------------------------------------------
# The Dao Path
# ---------------------------------------------------------------------------
async def get_progress_doc(user_id: str) -> dict:
    doc = await db.path_progress.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        doc = {"user_id": user_id, "stages": {}, "updated_at": now_utc()}
        await db.path_progress.insert_one(dict(doc))
    return doc


def stage_status(order: int, progress: dict) -> dict:
    stages = progress.get("stages", {})
    key = str(order)
    st = stages.get(key)
    prev_complete = order == 1 or stages.get(str(order - 1), {}).get("completed", False)
    if st and st.get("completed"):
        state = "completed"
    elif st and st.get("started_at"):
        state = "in_progress"
    elif prev_complete:
        state = "available"
    else:
        state = "locked"
    return {
        "state": state,
        "checkins": (st or {}).get("checkins", 0),
        "started_at": (st or {}).get("started_at"),
        "completed_at": (st or {}).get("completed_at"),
    }



# ---------------------------------------------------------------------------
# Today
# ---------------------------------------------------------------------------
@api.get("/today")
async def today(user: dict = Depends(get_current_user)):
    """One practice for right now, plus the pine.

    Answers "what do I do today" so the practitioner does not have to. The
    growth model is accumulated days rather than a streak, so a missed day
    costs nothing.
    """
    now = now_utc()
    uid = user["user_id"]

    logs = await db.logs.find({"user_id": uid, "deleted_at": None}, {"_id": 0, "date": 1}).to_list(2000)
    dates = {l["date"] for l in logs}
    total_days = len(dates)
    logged_today = now.strftime("%Y-%m-%d") in dates

    # The stage in progress, else the first one available.
    progress = await get_progress_doc(uid)
    stage = None
    for st in sorted(STAGES, key=lambda x: x["order"]):
        state = stage_status(st["order"], progress)["state"]
        if state == "in_progress":
            stage = st
            break
        if state == "available" and stage is None:
            stage = st

    docs = await db.practices.find({"status": "approved"}, {"_id": 0}).to_list(500)
    for d in docs:
        d["illustration_url"] = illustration_url(d["practice_id"])

    payload = build_today(
        now=now,
        practices=docs,
        stage_practice_ids=(stage or {}).get("practices", []),
        total_days=total_days,
        logged_today=logged_today,
        stage_title=(stage or {}).get("title"),
    )
    payload["stage_order"] = (stage or {}).get("order")
    return payload


@api.get("/path/stages")
async def path_stages(user: dict = Depends(get_current_user)):
    progress = await get_progress_doc(user["user_id"])
    result = []
    for s in sorted(STAGES, key=lambda x: x["order"]):
        info = stage_status(s["order"], progress)
        result.append(
            {
                "stage_id": s["stage_id"],
                "order": s["order"],
                "year": s["year"],
                "months": s["months"],
                "title": s["title"],
                "chinese": s["chinese"],
                "subtitle": s["subtitle"],
                "recommended_days": s["recommended_days"],
                "practice_count": len(s["practices"]),
                **info,
            }
        )
    return {"stages": result}


@api.get("/path/stages/{order}")
async def path_stage_detail(order: int, user: dict = Depends(get_current_user)):
    s = next((x for x in STAGES if x["order"] == order), None)
    if not s:
        raise HTTPException(status_code=404, detail="Stage not found")
    progress = await get_progress_doc(user["user_id"])
    info = stage_status(order, progress)
    practices = []
    for pid in s["practices"]:
        p = await db.practices.find_one({"practice_id": pid}, {"_id": 0})
        if p:
            p["illustration_url"] = illustration_url(pid)
            p["has_illustration"] = bool(p.get("illustration_path"))
            practices.append(p)
    st = progress.get("stages", {}).get(str(order), {})
    return {
        "stage": {
            **s,
            **info,
            "practices_full": practices,
            "min_checkins": s["min_checkins"],
            "self_assessment": st.get("self_assessment"),
        }
    }


@api.post("/path/stages/{order}/start")
async def start_stage(order: int, user: dict = Depends(get_current_user)):
    s = next((x for x in STAGES if x["order"] == order), None)
    if not s:
        raise HTTPException(status_code=404, detail="Stage not found")
    progress = await get_progress_doc(user["user_id"])
    info = stage_status(order, progress)
    if info["state"] == "locked":
        raise HTTPException(status_code=403, detail="Complete the previous stage first")
    key = f"stages.{order}"
    existing = progress.get("stages", {}).get(str(order), {})
    if not existing.get("started_at"):
        await db.path_progress.update_one(
            {"user_id": user["user_id"]},
            {"$set": {f"{key}.started_at": now_utc(), f"{key}.checkins": existing.get("checkins", 0), "updated_at": now_utc()}},
        )
    return {"ok": True}


class UnlockIn(BaseModel):
    self_assessment: str  # "ready" | "more_time"


@api.post("/path/stages/{order}/complete")
async def complete_stage(order: int, body: UnlockIn, user: dict = Depends(get_current_user)):
    s = next((x for x in STAGES if x["order"] == order), None)
    if not s:
        raise HTTPException(status_code=404, detail="Stage not found")
    progress = await get_progress_doc(user["user_id"])
    st = progress.get("stages", {}).get(str(order), {})
    if not st.get("started_at"):
        raise HTTPException(status_code=403, detail="Begin this stage first")
    checkins = st.get("checkins", 0)
    if body.self_assessment != "ready":
        await db.path_progress.update_one(
            {"user_id": user["user_id"]}, {"$set": {f"stages.{order}.self_assessment": "more_time"}}
        )
        return {"unlocked": False, "reason": "You chose to give this stage more time. There is no rush."}
    if checkins < s["min_checkins"]:
        return {
            "unlocked": False,
            "reason": f"Log at least {s['min_checkins']} check-ins on this stage before moving on. You have {checkins}.",
        }
    await db.path_progress.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                f"stages.{order}.completed": True,
                f"stages.{order}.completed_at": now_utc(),
                f"stages.{order}.self_assessment": "ready",
                "updated_at": now_utc(),
            }
        },
    )
    return {"unlocked": True, "reason": "Stage complete. The next stage is open when you are."}


# ---------------------------------------------------------------------------
# Journal / logs
# ---------------------------------------------------------------------------
class LogIn(BaseModel):
    body: Optional[str] = ""
    mood: Optional[str] = None  # still | open | tired | restless | light
    nothing_happened: bool = False
    practice_ids: List[str] = []
    stage_order: Optional[int] = None
    visibility: str = "private"  # private | public


async def bump_stage_checkin(user_id: str, stage_order: Optional[int]):
    if stage_order is None:
        return
    progress = await get_progress_doc(user_id)
    st = progress.get("stages", {}).get(str(stage_order), {})
    if st.get("started_at"):
        await db.path_progress.update_one(
            {"user_id": user_id}, {"$inc": {f"stages.{stage_order}.checkins": 1}, "$set": {"updated_at": now_utc()}}
        )


@api.post("/logs")
async def create_log(body: LogIn, user: dict = Depends(get_current_user)):
    if body.visibility not in ("private", "public"):
        raise HTTPException(status_code=400, detail="Invalid visibility")
    now = now_utc()
    log = {
        "log_id": "log_" + uuid.uuid4().hex[:12],
        "user_id": user["user_id"],
        "body": (body.body or "").strip(),
        "mood": body.mood,
        "nothing_happened": body.nothing_happened,
        "practice_ids": body.practice_ids,
        "stage_order": body.stage_order,
        "visibility": body.visibility,
        "created_at": now,
        "date": now.strftime("%Y-%m-%d"),
        "deleted_at": None,
    }
    await db.logs.insert_one(dict(log))
    await bump_stage_checkin(user["user_id"], body.stage_order)
    log.pop("deleted_at", None)
    return {"log": log}


async def enrich_logs(docs: List[dict]) -> List[dict]:
    user_ids = list({d["user_id"] for d in docs})
    log_ids = [d["log_id"] for d in docs]
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0})}
    prac = {p["practice_id"]: p["title"] async for p in db.practices.find({}, {"_id": 0, "practice_id": 1, "title": 1})}
    counts: dict = {}
    async for c in db.comments.aggregate(
        [{"$match": {"log_id": {"$in": log_ids}, "deleted_at": None}}, {"$group": {"_id": "$log_id", "n": {"$sum": 1}}}]
    ):
        counts[c["_id"]] = c["n"]
    for d in docs:
        u = users.get(d["user_id"], {})
        d["author"] = {"user_id": d["user_id"], "display_name": u.get("display_name"), "picture": u.get("picture")}
        d["practice_titles"] = [prac.get(pid) for pid in d.get("practice_ids", []) if prac.get(pid)]
        d["comment_count"] = counts.get(d["log_id"], 0)
    return docs


@api.get("/logs/me")
async def my_logs(user: dict = Depends(get_current_user)):
    docs = (
        await db.logs.find({"user_id": user["user_id"], "deleted_at": None}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(300)
    )
    docs = await enrich_logs(docs)
    return {"logs": docs}


@api.get("/logs/feed")
async def feed(user: dict = Depends(get_current_user)):
    docs = (
        await db.logs.find({"visibility": "public", "deleted_at": None}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(100)
    )
    docs = await enrich_logs(docs)
    return {"logs": docs}


@api.delete("/logs/{log_id}")
async def delete_log(log_id: str, user: dict = Depends(get_current_user)):
    res = await db.logs.update_one(
        {"log_id": log_id, "user_id": user["user_id"]}, {"$set": {"deleted_at": now_utc()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Comments (replies on shared reflections)
# ---------------------------------------------------------------------------
class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


async def enrich_comments(docs: List[dict]) -> List[dict]:
    ids = list({d["user_id"] for d in docs})
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": ids}}, {"_id": 0})}
    for d in docs:
        u = users.get(d["user_id"], {})
        d["author"] = {"user_id": d["user_id"], "display_name": u.get("display_name"), "picture": u.get("picture")}
    return docs


async def visible_log(log_id: str, user: dict) -> dict:
    log = await db.logs.find_one({"log_id": log_id, "deleted_at": None}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Reflection not found")
    if log["visibility"] != "public" and log["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="This reflection is private")
    return log


@api.get("/logs/{log_id}")
async def get_log(log_id: str, user: dict = Depends(get_current_user)):
    log = await visible_log(log_id, user)
    (log,) = await enrich_logs([log])
    comments = (
        await db.comments.find({"log_id": log_id, "deleted_at": None}, {"_id": 0}).sort("created_at", 1).to_list(300)
    )
    comments = await enrich_comments(comments)
    return {"log": log, "comments": comments}


@api.post("/logs/{log_id}/comments")
async def add_comment(log_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    await visible_log(log_id, user)
    now = now_utc()
    c = {
        "comment_id": "cmt_" + uuid.uuid4().hex[:12],
        "log_id": log_id,
        "user_id": user["user_id"],
        "body": body.body.strip(),
        "created_at": now,
        "deleted_at": None,
    }
    await db.comments.insert_one(dict(c))
    c.pop("deleted_at", None)
    (c,) = await enrich_comments([c])
    return {"comment": c}


@api.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    res = await db.comments.update_one(
        {"comment_id": comment_id, "user_id": user["user_id"]}, {"$set": {"deleted_at": now_utc()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Daily reminder preferences (scheduled locally on device)
# ---------------------------------------------------------------------------
class ReminderIn(BaseModel):
    enabled: bool
    hour: int = Field(ge=0, le=23)
    minute: int = Field(ge=0, le=59)


@api.patch("/profile/reminder")
async def set_reminder(body: ReminderIn, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"reminder_enabled": body.enabled, "reminder_hour": body.hour, "reminder_minute": body.minute}},
    )
    user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"user": public_user(user)}


# ---------------------------------------------------------------------------
# Meetups (real-world practice circles)
# ---------------------------------------------------------------------------
import math


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class MeetupIn(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(default="", max_length=1000)
    tradition: str = "mixed"  # dao | ayurveda | mixed
    location_name: str = Field(min_length=2, max_length=140)
    city: str = Field(min_length=1, max_length=80)
    starts_at: str  # ISO datetime
    capacity: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class RsvpIn(BaseModel):
    waiver_accepted: bool = False


@api.post("/meetups")
async def create_meetup(body: MeetupIn, user: dict = Depends(get_current_user)):
    if body.tradition not in ("dao", "ayurveda", "mixed"):
        raise HTTPException(status_code=400, detail="Invalid tradition")
    m = {
        "meetup_id": "mtp_" + uuid.uuid4().hex[:12],
        "host_id": user["user_id"],
        "title": body.title.strip(),
        "description": body.description.strip(),
        "tradition": body.tradition,
        "location_name": body.location_name.strip(),
        "city": body.city.strip(),
        "starts_at": body.starts_at,
        "capacity": body.capacity,
        "lat": body.lat,
        "lng": body.lng,
        "created_at": now_utc(),
        "deleted_at": None,
    }
    await db.meetups.insert_one(dict(m))
    # host auto-RSVPs
    await db.rsvps.update_one(
        {"meetup_id": m["meetup_id"], "user_id": user["user_id"]},
        {"$setOnInsert": {"waiver_accepted": True, "created_at": now_utc()}},
        upsert=True,
    )
    m.pop("deleted_at", None)
    return {"meetup": m}


async def meetup_card(m: dict, user_id: str, lat=None, lng=None) -> dict:
    host = await db.users.find_one({"user_id": m["host_id"]}, {"_id": 0})
    attendees = await db.rsvps.count_documents({"meetup_id": m["meetup_id"]})
    is_rsvped = bool(await db.rsvps.find_one({"meetup_id": m["meetup_id"], "user_id": user_id}))
    distance = None
    if lat is not None and lng is not None and m.get("lat") is not None and m.get("lng") is not None:
        distance = round(haversine_km(lat, lng, m["lat"], m["lng"]), 1)
    return {
        **{k: m[k] for k in ("meetup_id", "host_id", "title", "description", "tradition", "location_name", "city", "starts_at", "capacity", "lat", "lng")},
        "host": {"user_id": m["host_id"], "display_name": (host or {}).get("display_name"), "picture": (host or {}).get("picture")},
        "attendees": attendees,
        "is_rsvped": is_rsvped,
        "is_host": m["host_id"] == user_id,
        "distance_km": distance,
    }


@api.get("/meetups")
async def list_meetups(user: dict = Depends(get_current_user), lat: Optional[float] = None, lng: Optional[float] = None):
    now_iso = now_utc().isoformat()
    docs = await db.meetups.find({"deleted_at": None, "starts_at": {"$gte": now_iso}}, {"_id": 0}).to_list(200)
    cards = [await meetup_card(m, user["user_id"], lat, lng) for m in docs]
    if lat is not None and lng is not None:
        cards.sort(key=lambda c: (c["distance_km"] is None, c["distance_km"] if c["distance_km"] is not None else 0, c["starts_at"]))
    else:
        cards.sort(key=lambda c: c["starts_at"])
    return {"meetups": cards}


@api.get("/meetups/{meetup_id}")
async def get_meetup(meetup_id: str, user: dict = Depends(get_current_user)):
    m = await db.meetups.find_one({"meetup_id": meetup_id, "deleted_at": None}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Meetup not found")
    card = await meetup_card(m, user["user_id"])
    rsvps = await db.rsvps.find({"meetup_id": meetup_id}, {"_id": 0}).to_list(300)
    ids = [r["user_id"] for r in rsvps]
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": ids}}, {"_id": 0})}
    attendees = [
        {"user_id": uid, "display_name": users.get(uid, {}).get("display_name"), "picture": users.get(uid, {}).get("picture")}
        for uid in ids
    ]
    return {"meetup": {**card, "attendee_list": attendees}}


@api.post("/meetups/{meetup_id}/rsvp")
async def rsvp(meetup_id: str, body: RsvpIn, user: dict = Depends(get_current_user)):
    m = await db.meetups.find_one({"meetup_id": meetup_id, "deleted_at": None}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Meetup not found")
    if not body.waiver_accepted:
        raise HTTPException(status_code=400, detail="Please accept the liability waiver to join")
    if m.get("capacity"):
        count = await db.rsvps.count_documents({"meetup_id": meetup_id})
        already = await db.rsvps.find_one({"meetup_id": meetup_id, "user_id": user["user_id"]})
        if not already and count >= m["capacity"]:
            raise HTTPException(status_code=409, detail="This circle is full")
    await db.rsvps.update_one(
        {"meetup_id": meetup_id, "user_id": user["user_id"]},
        {"$set": {"waiver_accepted": True}, "$setOnInsert": {"created_at": now_utc()}},
        upsert=True,
    )
    return {"ok": True, "is_rsvped": True}


@api.delete("/meetups/{meetup_id}/rsvp")
async def cancel_rsvp(meetup_id: str, user: dict = Depends(get_current_user)):
    await db.rsvps.delete_one({"meetup_id": meetup_id, "user_id": user["user_id"]})
    return {"ok": True, "is_rsvped": False}


@api.delete("/meetups/{meetup_id}")
async def delete_meetup(meetup_id: str, user: dict = Depends(get_current_user)):
    res = await db.meetups.update_one(
        {"meetup_id": meetup_id, "host_id": user["user_id"]}, {"$set": {"deleted_at": now_utc()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meetup not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Stats / streaks / badges
# ---------------------------------------------------------------------------
MILESTONES = [7, 30, 90, 365]


def compute_streaks(dates: List[str]) -> dict:
    if not dates:
        return {"current": 0, "longest": 0, "total_days": 0}
    unique = sorted(set(dates))
    dvals = [datetime.strptime(d, "%Y-%m-%d").date() for d in unique]
    longest = 1
    run = 1
    for i in range(1, len(dvals)):
        if (dvals[i] - dvals[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1
    today = now_utc().date()
    current = 0
    if dvals[-1] in (today, today - timedelta(days=1)):
        current = 1
        for i in range(len(dvals) - 1, 0, -1):
            if (dvals[i] - dvals[i - 1]).days == 1:
                current += 1
            else:
                break
    return {"current": current, "longest": longest, "total_days": len(unique)}


async def build_stats(user_id: str) -> dict:
    logs = await db.logs.find({"user_id": user_id, "deleted_at": None}, {"_id": 0, "date": 1}).to_list(2000)
    dates = [l["date"] for l in logs]
    streaks = compute_streaks(dates)
    total_logs = len(logs)
    achieved = [m for m in MILESTONES if streaks["longest"] >= m or streaks["total_days"] >= m]
    is_elder = streaks["longest"] >= 90 or streaks["total_days"] >= 108
    return {
        # The public standing. Accumulated days, never a streak — see today.py.
        "growth": growth_for(streaks["total_days"]),
        "streak_current": streaks["current"],
        "streak_longest": streaks["longest"],
        "total_days": streaks["total_days"],
        "total_logs": total_logs,
        "milestones": MILESTONES,
        "milestones_achieved": achieved,
        "is_elder": is_elder,
    }


@api.get("/stats/me")
async def my_stats(user: dict = Depends(get_current_user)):
    stats = await build_stats(user["user_id"])
    progress = await get_progress_doc(user["user_id"])
    completed = sum(1 for v in progress.get("stages", {}).values() if v.get("completed"))
    stats["stages_completed"] = completed
    stats["stages_total"] = len(STAGES)
    return {"stats": stats}


# ---------------------------------------------------------------------------
# Community following
# ---------------------------------------------------------------------------
@api.get("/community/practitioners")
async def practitioners(user: dict = Depends(get_current_user)):
    users = (
        await db.users.find({"onboarded": True, "user_id": {"$ne": user["user_id"]}}, {"_id": 0})
        .limit(50)
        .to_list(50)
    )
    following = {f["following_id"] async for f in db.follows.find({"follower_id": user["user_id"]}, {"_id": 0})}
    out = []
    for u in users:
        stats = await build_stats(u["user_id"])
        last = await db.logs.find_one(
            {"user_id": u["user_id"], "deleted_at": None}, {"_id": 0, "date": 1}, sort=[("date", -1)]
        )
        out.append(
            {
                **public_user(u),
                "growth": stats["growth"],
                "last_practised": (last or {}).get("date"),
                "is_following": u["user_id"] in following,
            }
        )
    # Most recently practised first. Recency is a fact about who is around;
    # a streak ranking would be a claim about who is doing better.
    out.sort(key=lambda x: (x["last_practised"] or "", x["display_name"] or ""), reverse=True)
    return {"practitioners": out}


@api.get("/community/users/{user_id}")
async def user_profile(user_id: str, user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    stats = await build_stats(user_id)
    followers = await db.follows.count_documents({"following_id": user_id})
    following = await db.follows.count_documents({"follower_id": user_id})
    is_following = bool(await db.follows.find_one({"follower_id": user["user_id"], "following_id": user_id}))
    logs = (
        await db.logs.find({"user_id": user_id, "visibility": "public", "deleted_at": None}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(50)
    )
    logs = await enrich_logs(logs)
    return {
        "profile": {**public_user(u), **stats, "followers": followers, "following": following, "is_following": is_following},
        "logs": logs,
    }


@api.post("/community/users/{user_id}/follow")
async def follow(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    if not await db.users.find_one({"user_id": user_id}):
        raise HTTPException(status_code=404, detail="User not found")
    await db.follows.update_one(
        {"follower_id": user["user_id"], "following_id": user_id},
        {"$setOnInsert": {"created_at": now_utc()}},
        upsert=True,
    )
    return {"ok": True, "is_following": True}


@api.delete("/community/users/{user_id}/follow")
async def unfollow(user_id: str, user: dict = Depends(get_current_user)):
    await db.follows.delete_one({"follower_id": user["user_id"], "following_id": user_id})
    return {"ok": True, "is_following": False}


@api.get("/")
async def root():
    return {"message": "Immortality — Dao Longevity API"}


app.include_router(api)

# Origins come from CORS_ORIGINS (comma-separated) in deployed environments.
# Auth travels in an Authorization header rather than a cookie, so credentialed
# CORS is not needed — and "*" with allow_credentials is rejected by browsers.
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=_cors_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Seeding + illustration generation
# ---------------------------------------------------------------------------
async def seed_content():
    for i, p in enumerate(PRACTICES):
        existing = await db.practices.find_one({"practice_id": p["practice_id"]}, {"_id": 0})
        doc = {**p, "order": i, "status": "approved"}
        if existing:
            doc["illustration_path"] = existing.get("illustration_path")
            await db.practices.update_one({"practice_id": p["practice_id"]}, {"$set": doc})
        else:
            doc["illustration_path"] = None
            await db.practices.insert_one(doc)
    logger.info("Seeded %d practices", len(PRACTICES))


async def generate_illustrations():
    """Lazily generate ink-wash illustrations for practices missing one."""
    if not EMERGENT_KEY:
        return
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:  # noqa: BLE001
        logger.warning("emergentintegrations unavailable: %s", e)
        return
    pending = await db.practices.find({"illustration_path": None}, {"_id": 0, "practice_id": 1}).to_list(100)
    for p in pending:
        pid = p["practice_id"]
        subject = PRACTICE_ILLUSTRATION_SUBJECT.get(pid, "a calm meditative scene")
        prompt = ILLUSTRATION_STYLE + subject
        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"illus-{pid}",
                system_message="You generate calm ink-wash illustrations.",
            )
            chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
            _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
            if not images:
                logger.warning("No image returned for %s", pid)
                continue
            img = images[0]
            data = base64.b64decode(img["data"])
            path = f"{APP_NAME}/illustrations/{pid}.png"
            await run_in_threadpool(put_object, path, data, img.get("mime_type", "image/png"))
            await db.practices.update_one({"practice_id": pid}, {"$set": {"illustration_path": path}})
            logger.info("Generated illustration for %s", pid)
        except Exception as e:  # noqa: BLE001
            logger.warning("Illustration generation failed for %s: %s", pid, e)
        await asyncio.sleep(0.5)
    logger.info("Illustration generation pass complete")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.logs.create_index([("user_id", 1), ("created_at", -1)])
    await db.follows.create_index([("follower_id", 1), ("following_id", 1)], unique=True)
    await db.comments.create_index([("log_id", 1), ("created_at", 1)])
    await db.rsvps.create_index([("meetup_id", 1), ("user_id", 1)], unique=True)
    await db.meetups.create_index([("starts_at", 1)])
    await db.auth_attempts.create_index("key")
    await db.auth_attempts.create_index("at", expireAfterSeconds=AUTH_WINDOW_SECONDS)
    await seed_content()
    init_storage()
    asyncio.create_task(generate_illustrations())


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
