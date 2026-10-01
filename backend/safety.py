"""Reporting and blocking: the floor under everything members write.

Google Play's User Generated Content policy requires, for any app where
people post things others can read, an in-app way to report objectionable
content and users, a way to block a user, and someone acting on reports.
Immortal has five such surfaces (shared reflections, replies, lineages,
lineage notes, practice circles) plus profiles.

- Any member can report any of them. Three different members reporting the
  same item hides it until a moderator looks, so one bad post cannot sit in
  the feed overnight while the only moderator sleeps, and one person with a
  grudge cannot take anything down alone.
- Blocking is mutual in effect: neither side sees the other's posts,
  replies, notes, circles or profile, and neither can reply to or follow the
  other. The blocked person is not told.
- Moderators are the accounts whose emails are in ADMIN_EMAILS. They see the
  open reports and can hide, restore or dismiss, or suspend an account.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

AUTO_HIDE_REPORTS = 3
REASONS = ("spam", "harassment", "hate", "sexual", "violence", "self_harm", "dangerous_advice", "misinformation", "other")

# kind -> (collection, id field, author field)
TARGETS = {
    "log": ("logs", "log_id", "user_id"),
    "comment": ("comments", "comment_id", "user_id"),
    "lineage": ("lineages", "lineage_id", "author_id"),
    "note": ("lineage_notes", "note_id", "user_id"),
    "meetup": ("meetups", "meetup_id", "host_id"),
    "user": ("users", "user_id", "user_id"),
}


class ReportIn(BaseModel):
    kind: str
    target_id: str = Field(min_length=3, max_length=64)
    reason: str
    details: str = Field(default="", max_length=1000)


class ResolveIn(BaseModel):
    action: str  # hide | restore | dismiss | suspend


def _now() -> datetime:
    return datetime.now(timezone.utc)


def admin_emails() -> set:
    return {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}


def is_admin(user: dict) -> bool:
    return (user.get("email") or "").lower() in admin_emails()


async def blocked_by_me(db, user_id: str) -> set:
    return {b["blocked_id"] async for b in db.blocks.find({"blocker_id": user_id}, {"_id": 0, "blocked_id": 1})}


async def hidden_user_ids(db, user_id: str) -> set:
    """Everyone this member should not see: people they blocked, and people who blocked them."""
    ids = await blocked_by_me(db, user_id)
    async for b in db.blocks.find({"blocked_id": user_id}, {"_id": 0, "blocker_id": 1}):
        ids.add(b["blocker_id"])
    return ids


async def erase_user(db, user_id: str) -> None:
    await db.blocks.delete_many({"$or": [{"blocker_id": user_id}, {"blocked_id": user_id}]})
    # Reports they filed go; reports about them stay with the moderator, but
    # their own content is already deleted with the account.
    await db.reports.delete_many({"reporter_id": user_id})


def build_router(db, get_current_user: Callable[..., Awaitable[dict]]) -> APIRouter:
    router = APIRouter()

    async def find_target(kind: str, target_id: str) -> Optional[dict]:
        coll, id_field, _ = TARGETS[kind]
        return await db[coll].find_one({id_field: target_id}, {"_id": 0})

    async def set_hidden(kind: str, target_id: str, hidden: bool) -> None:
        if kind == "user":
            return
        coll, id_field, _ = TARGETS[kind]
        await db[coll].update_one({id_field: target_id}, {"$set": {"hidden": hidden}})

    @router.post("/reports")
    async def report(body: ReportIn, user: dict = Depends(get_current_user)):
        if body.kind not in TARGETS:
            raise HTTPException(status_code=400, detail="Invalid report")
        if body.reason not in REASONS:
            raise HTTPException(status_code=400, detail="Pick a reason")
        target = await find_target(body.kind, body.target_id)
        if not target:
            raise HTTPException(status_code=404, detail="That is no longer here.")
        author_id = target.get(TARGETS[body.kind][2])
        if author_id == user["user_id"]:
            raise HTTPException(status_code=400, detail="You cannot report your own post.")
        # One open report per member per item; a second tap updates the first.
        await db.reports.update_one(
            {"kind": body.kind, "target_id": body.target_id, "reporter_id": user["user_id"], "status": "open"},
            {
                "$set": {"reason": body.reason, "details": body.details.strip(), "author_id": author_id, "updated_at": _now()},
                "$setOnInsert": {"report_id": "rpt_" + uuid.uuid4().hex[:12], "created_at": _now()},
            },
            upsert=True,
        )
        reporters = len(
            {
                r["reporter_id"]
                async for r in db.reports.find(
                    {"kind": body.kind, "target_id": body.target_id, "status": "open"}, {"_id": 0, "reporter_id": 1}
                )
            }
        )
        if reporters >= AUTO_HIDE_REPORTS:
            await set_hidden(body.kind, body.target_id, True)
        return {"ok": True}

    @router.get("/blocks")
    async def list_blocks(user: dict = Depends(get_current_user)):
        ids = list(await blocked_by_me(db, user["user_id"]))
        people = [
            {"user_id": u["user_id"], "display_name": u.get("display_name"), "picture": u.get("picture")}
            async for u in db.users.find({"user_id": {"$in": ids}}, {"_id": 0})
        ]
        return {"blocked": people}

    @router.post("/blocks/{user_id}")
    async def block(user_id: str, user: dict = Depends(get_current_user)):
        if user_id == user["user_id"]:
            raise HTTPException(status_code=400, detail="You cannot block yourself.")
        if not await db.users.find_one({"user_id": user_id}, {"_id": 1}):
            raise HTTPException(status_code=404, detail="User not found")
        await db.blocks.update_one(
            {"blocker_id": user["user_id"], "blocked_id": user_id},
            {"$setOnInsert": {"created_at": _now()}},
            upsert=True,
        )
        # Following would keep a line open between them; cut it both ways.
        await db.follows.delete_many(
            {
                "$or": [
                    {"follower_id": user["user_id"], "following_id": user_id},
                    {"follower_id": user_id, "following_id": user["user_id"]},
                ]
            }
        )
        return {"ok": True, "is_blocked": True}

    @router.delete("/blocks/{user_id}")
    async def unblock(user_id: str, user: dict = Depends(get_current_user)):
        await db.blocks.delete_one({"blocker_id": user["user_id"], "blocked_id": user_id})
        return {"ok": True, "is_blocked": False}

    # ------------------------------------------------------------------
    # Moderation
    # ------------------------------------------------------------------
    async def admin(user: dict = Depends(get_current_user)) -> dict:
        if not is_admin(user):
            raise HTTPException(status_code=404, detail="Not found")
        return user

    @router.get("/admin/reports")
    async def open_reports(_: dict = Depends(admin)):
        rows = await db.reports.find({"status": "open"}, {"_id": 0}).sort("created_at", -1).to_list(500)
        grouped: dict = {}
        for r in rows:
            key = (r["kind"], r["target_id"])
            g = grouped.setdefault(
                key,
                {"kind": r["kind"], "target_id": r["target_id"], "author_id": r.get("author_id"), "reports": []},
            )
            g["reports"].append({"reason": r["reason"], "details": r.get("details"), "created_at": r["created_at"]})
        items = []
        for g in grouped.values():
            target = await find_target(g["kind"], g["target_id"])
            g["target"] = _preview(g["kind"], target)
            items.append(g)
        items.sort(key=lambda g: len(g["reports"]), reverse=True)
        return {"items": items}

    @router.post("/admin/reports/{kind}/{target_id}")
    async def resolve(kind: str, target_id: str, body: ResolveIn, moderator: dict = Depends(admin)):
        if kind not in TARGETS or body.action not in ("hide", "restore", "dismiss", "suspend"):
            raise HTTPException(status_code=400, detail="Invalid action")
        target = await find_target(kind, target_id)
        if body.action == "hide":
            await set_hidden(kind, target_id, True)
        elif body.action in ("restore", "dismiss"):
            await set_hidden(kind, target_id, False)
        elif body.action == "suspend":
            author_id = (target or {}).get(TARGETS[kind][2])
            if not author_id:
                raise HTTPException(status_code=404, detail="Author not found")
            await db.users.update_one({"user_id": author_id}, {"$set": {"suspended": True}})
            await db.user_sessions.delete_many({"user_id": author_id})
            await set_hidden(kind, target_id, True)
        await db.reports.update_many(
            {"kind": kind, "target_id": target_id, "status": "open"},
            {"$set": {"status": "resolved", "action": body.action, "resolved_by": moderator["user_id"], "resolved_at": _now()}},
        )
        return {"ok": True}

    return router


def _preview(kind: str, target: Optional[dict]) -> Optional[dict]:
    if not target:
        return None
    if kind == "user":
        return {"display_name": target.get("display_name"), "bio": target.get("bio")}
    text = target.get("body") or target.get("method") or target.get("description") or ""
    return {
        "title": target.get("title"),
        "text": text[:600],
        "hidden": bool(target.get("hidden")),
        "deleted": bool(target.get("deleted_at")),
    }
