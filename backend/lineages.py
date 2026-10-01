"""Lineages (传承): long-horizon practices the community carries together.

Most Daoist cultivation methods were never tested the way modern practices
are: they run for years and were passed down, adjusted and recorded by the
people who did them. A lineage is one such practice written down by a member,
then adopted by others who log their days and leave field notes on what they
noticed. Anyone can start a new lineage that builds on an existing one (a
branch), so adjustments stay attached to the method they came from.

Nothing here ranks people. Progress is shown as days practised, never as a
streak or a leaderboard.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, tzinfo
from typing import Awaitable, Callable, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from billing import enforcing, user_is_premium
from localtime import client_tz, local_now

FREE_LINEAGE_LIMIT = 1
NOTE_KINDS = ("observation", "adjustment", "caution", "question")


class LineageIn(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    chinese: str = Field(default="", max_length=20)
    summary: str = Field(min_length=10, max_length=400)
    method: str = Field(min_length=10, max_length=4000)
    cautions: str = Field(default="", max_length=1000)
    horizon_days: int = Field(ge=7, le=3650)
    daily_minutes: int = Field(ge=1, le=240)
    based_on_practice_id: Optional[str] = None
    parent_id: Optional[str] = None


class NoteIn(BaseModel):
    body: str = Field(min_length=2, max_length=2000)
    kind: str = "observation"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def progress_for(member: Optional[dict], horizon_days: int, now: datetime) -> Optional[dict]:
    """Days practised and days since starting, for one member of a lineage.

    ``now`` is in the viewer's time zone, and the start date is read in the
    same zone, so "day 1" and "today" are the viewer's days.
    """
    if not member:
        return None
    days = len(member.get("checkin_dates") or [])
    started = _as_utc(member["started_at"])
    since = (now.date() - started.astimezone(now.tzinfo or timezone.utc).date()).days + 1
    return {
        "started_at": started,
        "days_practised": days,
        "days_since_start": since,
        "percent": min(100, round(days * 100 / horizon_days)) if horizon_days else 0,
        "checked_in_today": now.strftime("%Y-%m-%d") in (member.get("checkin_dates") or []),
    }


async def _no_one(_user_id: str) -> set:
    return set()


def build_router(
    db,
    get_current_user: Callable[..., Awaitable[dict]],
    hidden_user_ids: Callable[[str], Awaitable[set]] = _no_one,
) -> APIRouter:
    router = APIRouter()

    async def authors_for(ids: List[str]) -> dict:
        return {
            u["user_id"]: {"user_id": u["user_id"], "display_name": u.get("display_name"), "picture": u.get("picture")}
            async for u in db.users.find({"user_id": {"$in": list(set(ids))}}, {"_id": 0})
        }

    async def get_live(lineage_id: str, user: Optional[dict] = None) -> dict:
        doc = await db.lineages.find_one({"lineage_id": lineage_id, "deleted_at": None}, {"_id": 0})
        if doc and user and doc["author_id"] != user["user_id"]:
            if doc.get("hidden") or doc["author_id"] in await hidden_user_ids(user["user_id"]):
                doc = None
        if not doc:
            raise HTTPException(status_code=404, detail="Lineage not found")
        return doc

    async def cards(docs: List[dict], user_id: str, now: Optional[datetime] = None) -> List[dict]:
        ids = [d["lineage_id"] for d in docs]
        authors = await authors_for([d["author_id"] for d in docs])
        members: dict = {}
        mine: dict = {}
        async for m in db.lineage_members.find({"lineage_id": {"$in": ids}}, {"_id": 0}):
            members[m["lineage_id"]] = members.get(m["lineage_id"], 0) + 1
            if m["user_id"] == user_id:
                mine[m["lineage_id"]] = m
        notes: dict = {}
        async for n in db.lineage_notes.find({"lineage_id": {"$in": ids}, "deleted_at": None}, {"_id": 0, "lineage_id": 1}):
            notes[n["lineage_id"]] = notes.get(n["lineage_id"], 0) + 1
        branches: dict = {}
        async for b in db.lineages.find({"parent_id": {"$in": ids}, "deleted_at": None}, {"_id": 0, "parent_id": 1}):
            branches[b["parent_id"]] = branches.get(b["parent_id"], 0) + 1
        now = now or _now()
        return [
            {
                **d,
                "author": authors.get(d["author_id"], {"user_id": d["author_id"], "display_name": None}),
                "practitioners": members.get(d["lineage_id"], 0),
                "note_count": notes.get(d["lineage_id"], 0),
                "branch_count": branches.get(d["lineage_id"], 0),
                "my_progress": progress_for(mine.get(d["lineage_id"]), d["horizon_days"], now),
                "is_author": d["author_id"] == user_id,
            }
            for d in docs
        ]

    @router.get("/lineages")
    async def list_lineages(scope: str = "all", user: dict = Depends(get_current_user), tz: tzinfo = Depends(client_tz)):
        q: dict = {"deleted_at": None}
        if scope == "mine":
            joined = [m["lineage_id"] async for m in db.lineage_members.find({"user_id": user["user_id"]}, {"_id": 0})]
            q["$or"] = [{"author_id": user["user_id"]}, {"lineage_id": {"$in": joined}}]
        else:
            hidden = await hidden_user_ids(user["user_id"])
            q["hidden"] = {"$ne": True}
            q["author_id"] = {"$nin": list(hidden)}
        # Newest 200 at most. Before, an unsorted 200 meant that once there
        # were more, which ones showed was down to storage order.
        docs = await db.lineages.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
        out = await cards(docs, user["user_id"], local_now(tz))
        # Most carried first, then newest: a lineage many people keep is the
        # most useful one to find, and that is a fact about the method.
        out.sort(key=lambda c: (c["practitioners"], c["created_at"]), reverse=True)
        return {"lineages": out}

    @router.post("/lineages")
    async def create_lineage(body: LineageIn, user: dict = Depends(get_current_user)):
        if enforcing() and not user_is_premium(user):
            authored = await db.lineages.count_documents({"author_id": user["user_id"], "deleted_at": None})
            if authored >= FREE_LINEAGE_LIMIT:
                raise HTTPException(
                    status_code=402,
                    detail="Recording more than one lineage is part of the Inner Chamber membership.",
                )
        parent = await get_live(body.parent_id, user) if body.parent_id else None
        doc = {
            "lineage_id": "lin_" + uuid.uuid4().hex[:12],
            "author_id": user["user_id"],
            "title": body.title.strip(),
            "chinese": body.chinese.strip(),
            "summary": body.summary.strip(),
            "method": body.method.strip(),
            "cautions": body.cautions.strip(),
            "horizon_days": body.horizon_days,
            "daily_minutes": body.daily_minutes,
            "based_on_practice_id": body.based_on_practice_id or (parent or {}).get("based_on_practice_id"),
            "parent_id": parent["lineage_id"] if parent else None,
            "created_at": _now(),
            "deleted_at": None,
        }
        await db.lineages.insert_one(dict(doc))
        # The author carries their own lineage from day one.
        await db.lineage_members.update_one(
            {"lineage_id": doc["lineage_id"], "user_id": user["user_id"]},
            {"$setOnInsert": {"started_at": _now(), "checkin_dates": []}},
            upsert=True,
        )
        (card,) = await cards([doc], user["user_id"])
        return {"lineage": card}

    @router.get("/lineages/{lineage_id}")
    async def get_lineage(lineage_id: str, user: dict = Depends(get_current_user), tz: tzinfo = Depends(client_tz)):
        doc = await get_live(lineage_id, user)
        now = local_now(tz)
        hidden = await hidden_user_ids(user["user_id"])
        (card,) = await cards([doc], user["user_id"], now)
        parent = None
        if doc.get("parent_id"):
            p = await db.lineages.find_one({"lineage_id": doc["parent_id"], "deleted_at": None}, {"_id": 0})
            if p:
                parent = {"lineage_id": p["lineage_id"], "title": p["title"], "chinese": p.get("chinese")}
        branch_docs = await db.lineages.find(
            {"parent_id": lineage_id, "deleted_at": None, "hidden": {"$ne": True}, "author_id": {"$nin": list(hidden)}},
            {"_id": 0},
        ).to_list(50)
        branches = await cards(branch_docs, user["user_id"], now)
        notes = (
            await db.lineage_notes.find(
                {"lineage_id": lineage_id, "deleted_at": None, "hidden": {"$ne": True}, "user_id": {"$nin": list(hidden)}},
                {"_id": 0},
            )
            .sort("created_at", -1)
            .to_list(200)
        )
        members = await db.lineage_members.find(
            {"lineage_id": lineage_id, "user_id": {"$nin": list(hidden)}}, {"_id": 0}
        ).to_list(500)
        people = await authors_for([n["user_id"] for n in notes] + [m["user_id"] for m in members])
        for n in notes:
            n["author"] = people.get(n["user_id"], {"user_id": n["user_id"], "display_name": None})
        carriers = sorted(
            (
                {**people.get(m["user_id"], {"user_id": m["user_id"]}), **progress_for(m, doc["horizon_days"], now)}
                for m in members
            ),
            key=lambda c: c["started_at"],
        )
        practice = None
        if doc.get("based_on_practice_id"):
            practice = await db.practices.find_one(
                {"practice_id": doc["based_on_practice_id"]}, {"_id": 0, "practice_id": 1, "title": 1}
            )
        return {
            "lineage": {**card, "parent": parent, "practice": practice},
            "branches": branches,
            "notes": notes,
            "carriers": carriers[:50],
        }

    @router.delete("/lineages/{lineage_id}")
    async def delete_lineage(lineage_id: str, user: dict = Depends(get_current_user)):
        res = await db.lineages.update_one(
            {"lineage_id": lineage_id, "author_id": user["user_id"], "deleted_at": None},
            {"$set": {"deleted_at": _now()}},
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lineage not found")
        return {"ok": True}

    @router.post("/lineages/{lineage_id}/join")
    async def join(lineage_id: str, user: dict = Depends(get_current_user)):
        await get_live(lineage_id, user)
        await db.lineage_members.update_one(
            {"lineage_id": lineage_id, "user_id": user["user_id"]},
            {"$setOnInsert": {"started_at": _now(), "checkin_dates": []}},
            upsert=True,
        )
        return {"ok": True}

    @router.delete("/lineages/{lineage_id}/join")
    async def leave(lineage_id: str, user: dict = Depends(get_current_user)):
        await db.lineage_members.delete_one({"lineage_id": lineage_id, "user_id": user["user_id"]})
        return {"ok": True}

    @router.post("/lineages/{lineage_id}/checkin")
    async def checkin(lineage_id: str, user: dict = Depends(get_current_user), tz: tzinfo = Depends(client_tz)):
        doc = await get_live(lineage_id, user)
        now = local_now(tz)
        today = now.strftime("%Y-%m-%d")
        res = await db.lineage_members.update_one(
            {"lineage_id": lineage_id, "user_id": user["user_id"]},
            {"$addToSet": {"checkin_dates": today}},
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=403, detail="Take up this lineage before logging a day.")
        member = await db.lineage_members.find_one({"lineage_id": lineage_id, "user_id": user["user_id"]}, {"_id": 0})
        return {"my_progress": progress_for(member, doc["horizon_days"], now)}

    @router.post("/lineages/{lineage_id}/notes")
    async def add_note(
        lineage_id: str, body: NoteIn, user: dict = Depends(get_current_user), tz: tzinfo = Depends(client_tz)
    ):
        await get_live(lineage_id, user)
        if body.kind not in NOTE_KINDS:
            raise HTTPException(status_code=400, detail="Invalid note kind")
        member = await db.lineage_members.find_one({"lineage_id": lineage_id, "user_id": user["user_id"]}, {"_id": 0})
        day = None
        if member:
            now = local_now(tz)
            day = (now.date() - _as_utc(member["started_at"]).astimezone(tz).date()).days + 1
        note = {
            "note_id": "lnote_" + uuid.uuid4().hex[:12],
            "lineage_id": lineage_id,
            "user_id": user["user_id"],
            "kind": body.kind,
            "body": body.body.strip(),
            "day": day,
            "created_at": _now(),
            "deleted_at": None,
        }
        await db.lineage_notes.insert_one(dict(note))
        note["author"] = {"user_id": user["user_id"], "display_name": user.get("display_name"), "picture": user.get("picture")}
        return {"note": note}

    @router.delete("/lineage-notes/{note_id}")
    async def delete_note(note_id: str, user: dict = Depends(get_current_user)):
        res = await db.lineage_notes.update_one(
            {"note_id": note_id, "user_id": user["user_id"]}, {"$set": {"deleted_at": _now()}}
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"ok": True}

    return router


async def erase_user(db, user_id: str) -> None:
    """Account deletion: remove everything this user wrote in lineages."""
    await db.lineage_members.delete_many({"user_id": user_id})
    await db.lineage_notes.delete_many({"user_id": user_id})
    authored = [d["lineage_id"] async for d in db.lineages.find({"author_id": user_id}, {"_id": 0, "lineage_id": 1})]
    if authored:
        await db.lineage_members.delete_many({"lineage_id": {"$in": authored}})
        await db.lineage_notes.delete_many({"lineage_id": {"$in": authored}})
        # Branches survive their parent; they just stop pointing at it.
        await db.lineages.update_many({"parent_id": {"$in": authored}}, {"$set": {"parent_id": None}})
        await db.lineages.delete_many({"lineage_id": {"$in": authored}})
