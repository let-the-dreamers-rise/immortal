"""Growth metrics for the founder: is anyone still practising on day 30?

``GET /api/admin/metrics`` returns signups, activation, D1/D7/D30 retention,
daily/weekly/monthly practitioners and Inner Chamber conversion. It is off
unless ``ADMIN_METRICS_KEY`` is set, and then needs that key in the
``X-Admin-Key`` header. Nothing here is shown to members.

A day counts as practised when the member wrote a journal log or checked in
to a lineage that day. Retention for day N is the share of members who
practised at least once in the window starting N days after they joined;
only members whose window has fully passed are counted.
"""

from __future__ import annotations

import hmac
import os
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Iterable, Optional, Set

from fastapi import APIRouter, Header, HTTPException

from billing import user_is_premium

SYSTEM_USERS = {"user_archive"}

# (first day, last day) after signup, inclusive.
RETENTION_WINDOWS = {"d1": (1, 1), "d7": (7, 13), "d30": (30, 36)}


def _day(value) -> Optional[date]:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).date()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _rate(part: int, whole: int) -> Optional[float]:
    return round(part / whole, 4) if whole else None


def compute_metrics(users: Iterable[dict], activity: Dict[str, Set[date]], now: datetime) -> dict:
    """Pure calculation, so it can be tested without a database.

    ``activity`` maps user_id to the set of UTC dates that user practised.
    """
    today = _day(now)
    members = [u for u in users if u.get("user_id") not in SYSTEM_USERS and _day(u.get("created_at"))]

    new_7d = new_30d = activated = premium = 0
    retention = {k: {"eligible": 0, "retained": 0} for k in RETENTION_WINDOWS}
    for u in members:
        joined = _day(u["created_at"])
        age = (today - joined).days
        days = activity.get(u["user_id"], set())
        offsets = {(d - joined).days for d in days}
        if age < 7:
            new_7d += 1
        if age < 30:
            new_30d += 1
        if offsets & {0, 1}:
            activated += 1
        if user_is_premium(u, now):
            premium += 1
        for key, (start, end) in RETENTION_WINDOWS.items():
            if age > end:
                retention[key]["eligible"] += 1
                if any(start <= o <= end for o in offsets):
                    retention[key]["retained"] += 1

    member_ids = {u["user_id"] for u in members}

    def practising(within_days: int) -> int:
        since = today - timedelta(days=within_days - 1)
        return sum(1 for uid, days in activity.items() if uid in member_ids and any(d >= since for d in days))

    total = len(members)
    return {
        "generated_at": now,
        "users": {"total": total, "new_7d": new_7d, "new_30d": new_30d},
        "activation": {"practised_by_day_1": activated, "rate": _rate(activated, total)},
        "retention": {k: {**v, "rate": _rate(v["retained"], v["eligible"])} for k, v in retention.items()},
        "practising": {"today": practising(1), "last_7d": practising(7), "last_30d": practising(30)},
        "inner_chamber": {"members": premium, "conversion_rate": _rate(premium, total)},
    }


def build_router(db) -> APIRouter:
    router = APIRouter()

    @router.get("/admin/metrics")
    async def metrics(x_admin_key: Optional[str] = Header(default=None)):
        expected = (os.environ.get("ADMIN_METRICS_KEY") or "").strip()
        if not expected:
            raise HTTPException(status_code=404, detail="Not Found")
        if not hmac.compare_digest((x_admin_key or "").strip(), expected):
            raise HTTPException(status_code=401, detail="Unauthorized")

        fields = {"_id": 0, "user_id": 1, "created_at": 1, "is_premium": 1, "premium_expires_at": 1}
        users = [u async for u in db.users.find({}, fields)]
        activity: Dict[str, Set[date]] = {}
        async for log in db.logs.find({}, {"_id": 0, "user_id": 1, "created_at": 1}):
            d = _day(log.get("created_at"))
            if d:
                activity.setdefault(log["user_id"], set()).add(d)
        async for m in db.lineage_members.find({}, {"_id": 0, "user_id": 1, "checkin_dates": 1}):
            for raw in m.get("checkin_dates") or []:
                d = _day(raw)
                if d:
                    activity.setdefault(m["user_id"], set()).add(d)
        return compute_metrics(users, activity, datetime.now(timezone.utc))

    return router
