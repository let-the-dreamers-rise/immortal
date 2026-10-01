"""The practitioner's own clock.

A day of practice is the practitioner's day, not UTC's. Before this, someone
in India practising at 6am IST (00:30 UTC) was logged against the previous
day, and Today suggested night-time practices at breakfast. The app sends its
IANA time zone in ``X-Timezone`` (and its UTC offset in ``X-UTC-Offset`` as a
fallback); anything missing or invalid falls back to UTC, which is what the
server did before.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone, tzinfo
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import Header


def resolve_tz(name: Optional[str], offset_minutes: Optional[str]) -> tzinfo:
    if name and len(name) <= 64:
        try:
            return ZoneInfo(name.strip())
        except Exception:  # noqa: BLE001 - unknown zone or bad key
            pass
    if offset_minutes:
        try:
            minutes = int(offset_minutes)
        except ValueError:
            minutes = None
        if minutes is not None and -14 * 60 <= minutes <= 14 * 60:
            return timezone(timedelta(minutes=minutes))
    return timezone.utc


async def client_tz(
    x_timezone: Optional[str] = Header(default=None),
    x_utc_offset: Optional[str] = Header(default=None),
) -> tzinfo:
    return resolve_tz(x_timezone, x_utc_offset)


def local_now(tz: tzinfo) -> datetime:
    return datetime.now(timezone.utc).astimezone(tz)


def local_date(dt: datetime, tz: tzinfo) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(tz).strftime("%Y-%m-%d")
