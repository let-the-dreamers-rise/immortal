"""Usage events and the numbers that say whether Immortal is working.

First-party only: events go to our own database, never to an analytics
company. Each event carries a random device ID (so a visitor without an
account can be counted once) and the account ID when someone is signed in.
No journal text, notes or other content is ever sent as an event.

The one question this exists to answer: do people come back? The stats
route counts, over the last 30 days, how many devices opened the app, how
many finished a practice, how many created an account, and how many
returned on a later day.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Awaitable, Callable, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

EVENT_NAMES = {
    "app_open",
    "practice_started",
    "practice_finished",
    "day_counted",
    "signup",
    "lineage_joined",
    "invite_shared",
    "error",
}
MAX_EVENTS = 20
MAX_PROPS = 8
MAX_VALUE = 300
KEEP_DAYS = 400
DEVICE_ID = re.compile(r"^[A-Za-z0-9_-]{8,64}$")

Value = Union[str, int, float, bool, None]


class EventIn(BaseModel):
    name: str = Field(max_length=40)
    props: Dict[str, Value] = Field(default_factory=dict)


class EventsIn(BaseModel):
    device_id: str = Field(max_length=64)
    events: List[EventIn] = Field(max_length=MAX_EVENTS)


def clean_props(props: Dict[str, Value]) -> dict:
    out = {}
    for k, v in list(props.items())[:MAX_PROPS]:
        key = str(k)[:40]
        out[key] = v[:MAX_VALUE] if isinstance(v, str) else v
    return out


def summarise(events: List[dict], today: date) -> dict:
    """Funnel and return counts from raw events (one dict per event)."""
    first_seen: Dict[str, date] = {}
    days: Dict[str, set] = defaultdict(set)
    finished, signed_up = set(), set()
    errors: Counter = Counter()
    for e in events:
        who = e.get("device_id")
        if not who:
            continue
        d = e["day"] if isinstance(e["day"], date) else date.fromisoformat(e["day"])
        if e["name"] == "app_open":
            days[who].add(d)
            first_seen[who] = min(first_seen.get(who, d), d)
        elif e["name"] == "practice_finished":
            finished.add(who)
        elif e["name"] == "signup":
            signed_up.add(who)
        elif e["name"] == "error" and (today - d).days < 7:
            errors[str((e.get("props") or {}).get("message", ""))[:120]] += 1

    def returned(after: int) -> Dict[str, int]:
        # Of the devices first seen long enough ago to have had the chance,
        # how many opened the app again `after` or more days later.
        eligible = [w for w, f in first_seen.items() if (today - f).days >= after]
        back = [w for w in eligible if any((d - first_seen[w]).days >= after for d in days[w])]
        return {"eligible": len(eligible), "returned": len(back)}

    return {
        "visitors": len(first_seen),
        "finished_a_practice": len(finished),
        "created_an_account": len(signed_up),
        "came_back_next_day_or_later": returned(1),
        "came_back_after_a_week": returned(7),
        "errors_last_7_days": [{"message": m, "count": c} for m, c in errors.most_common(10)],
    }


def build_router(
    db,
    optional_user: Callable[..., Awaitable[Optional[dict]]],
    get_current_user: Callable[..., Awaitable[dict]],
    is_admin: Callable[[dict], bool],
) -> APIRouter:
    router = APIRouter()

    @router.post("/events")
    async def record(body: EventsIn, user: Optional[dict] = Depends(optional_user)):
        if not DEVICE_ID.match(body.device_id):
            raise HTTPException(status_code=400, detail="Invalid device id")
        now = datetime.now(timezone.utc)
        docs = [
            {
                "name": e.name,
                "device_id": body.device_id,
                "user_id": (user or {}).get("user_id"),
                "props": clean_props(e.props),
                "at": now,
                "day": now.date().isoformat(),
            }
            for e in body.events
            if e.name in EVENT_NAMES
        ]
        if docs:
            await db.events.insert_many(docs)
        return {"ok": True, "recorded": len(docs)}

    @router.get("/admin/stats")
    async def stats(user: dict = Depends(get_current_user)):
        if not is_admin(user):
            raise HTTPException(status_code=403, detail="Only the app's owner can see usage.")
        today = datetime.now(timezone.utc).date()
        since = (today - timedelta(days=30)).isoformat()
        events = await db.events.find(
            {"day": {"$gte": since}}, {"_id": 0, "name": 1, "device_id": 1, "day": 1, "props": 1}
        ).to_list(200000)
        return {"since": since, **summarise(events, today)}

    return router


async def erase_user(db, user_id: str) -> None:
    """Account deletion removes every event tied to the account."""
    await db.events.delete_many({"user_id": user_id})
