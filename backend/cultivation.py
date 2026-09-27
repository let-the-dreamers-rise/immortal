"""The passes (關): what only days of practice can open.

The practices in Immortal are two thousand years old and its code is public,
so anything in the app can be copied except time. This module turns days
practised into three things a copy could never give anyone.

SCROLLS ON THE NEIDAN SCHEDULE
The internal alchemists gave their work a schedule that later manuals repeat
like a proverb: a hundred days to lay the foundation (百日築基), ten months of
gestation (十月懷胎), three years of nursing (三年乳哺), nine years facing the
wall (九年面壁). Each of those, counted in practice days, opens a scroll.
Before the hundredth day, six chapters of the Daodejing open on the day that
matches their chapter number (scroll_texts.py).

A practice day is a distinct date on which the member logged practice, dated
by the server. Days cannot be backdated, bought or earned faster than the
calendar allows, and the Inner Chamber opens the Year 2 path, never a scroll.
Nobody can read the last scroll before nine years of practice.

SEALED SCROLLS
The scrolls from day 100 on are not in the app or in this repository. The
server loads their text from SEALED_SCROLLS_PATH. What is published is a
fingerprint of each (scroll_commitments.py): SHA-256 over the scroll's text
and a random nonce, the nonce so that nobody can confirm a guess. A scroll
that does not match its published fingerprint is never served, so when one
opens, years from now, anyone can check that it was never changed.

NAMES AND GENERATIONS
Daoist orders name disciples by generation, one character of a lineage poem
to each generation. Immortal's verse is Daodejing 59's 深根固柢，長生久視之道,
"deep roots, firm stem: the way of long life and lasting sight". The first 108
people to take a name are the first generation, 深; each generation after is
ten times the size of the one before. A practice name is the generation's
character plus one the member chooses, and it is permanent.

Nothing here ranks anyone. A day count is a fact about what someone did, and a
generation is a fact about when they arrived.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Awaitable, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo import ReturnDocument

from scroll_commitments import FINGERPRINTS
from scroll_texts import OPEN_SCROLLS

logger = logging.getLogger("immortality.cultivation")

# ---------------------------------------------------------------------------
# The passes
# ---------------------------------------------------------------------------
PASSES = [
    {"day": 1, "key": "gate", "glyph": "門", "title": "The gate", "subtitle": "Daodejing, chapter 1"},
    {"day": 7, "key": "heaven-and-earth", "glyph": "天", "title": "Heaven lasts, earth endures", "subtitle": "Daodejing, chapter 7"},
    {"day": 16, "key": "root", "glyph": "根", "title": "Returning to the root", "subtitle": "Daodejing, chapter 16"},
    {"day": 33, "key": "not-perish", "glyph": "壽", "title": "To die and not perish", "subtitle": "Daodejing, chapter 33"},
    {"day": 59, "key": "deep-roots", "glyph": "深", "title": "Deep roots, firm stem", "subtitle": "Daodejing, chapter 59"},
    {"day": 81, "key": "last-chapter", "glyph": "信", "title": "The last chapter", "subtitle": "Daodejing, chapter 81"},
    {"day": 100, "key": "first-pass", "glyph": "基", "title": "The First Pass", "subtitle": "百日築基 · a hundred days to lay the foundation", "sealed": True},
    {"day": 300, "key": "middle-pass", "glyph": "胎", "title": "The Middle Pass", "subtitle": "十月懷胎 · ten months of gestation", "sealed": True},
    {"day": 1095, "key": "three-years", "glyph": "乳", "title": "Three Years", "subtitle": "三年乳哺 · three years of nursing", "sealed": True},
    {"day": 3285, "key": "upper-pass", "glyph": "壁", "title": "The Upper Pass", "subtitle": "九年面壁 · nine years facing the wall", "sealed": True},
]
PASS_BY_KEY = {p["key"]: p for p in PASSES}
PASS_BY_DAY = {p["day"]: p for p in PASSES}

# The passes a member can vow to reach.
VOWS = ("first-pass", "middle-pass", "upper-pass")

# Fields covered by a sealed scroll's fingerprint.
SEALED_FIELDS = ("key", "title", "zh", "translation", "body", "nonce")


def nth(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n:,}{suffix}"


def pass_meta(p: dict) -> dict:
    return {
        "key": p["key"],
        "day": p["day"],
        "glyph": p["glyph"],
        "title": p["title"],
        "subtitle": p["subtitle"],
        "sealed": bool(p.get("sealed")),
    }


def passes_state(days: int) -> List[dict]:
    out = []
    for p in PASSES:
        item = {**pass_meta(p), "opened": days >= p["day"], "days_left": max(0, p["day"] - days)}
        if p.get("sealed"):
            item["fingerprint"] = FINGERPRINTS.get(p["key"])
        out.append(item)
    return out


def next_pass(days: int) -> Optional[dict]:
    p = next((p for p in PASSES if p["day"] > days), None)
    return {**pass_meta(p), "days_left": p["day"] - days} if p else None


# ---------------------------------------------------------------------------
# Sealed scrolls
# ---------------------------------------------------------------------------
def fingerprint(scroll: dict) -> str:
    """SHA-256 over the sealed fields as compact, key-sorted UTF-8 JSON."""
    payload = {k: scroll.get(k, "") for k in SEALED_FIELDS}
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


_sealed_cache: Dict[str, tuple] = {}


def sealed_scrolls() -> Dict[str, dict]:
    """Sealed texts from SEALED_SCROLLS_PATH that match their published fingerprint."""
    path = (os.environ.get("SEALED_SCROLLS_PATH") or "").strip()
    if not path:
        return {}
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        logger.warning("SEALED_SCROLLS_PATH is set but %s cannot be read", path)
        return {}
    cached = _sealed_cache.get(path)
    if cached and cached[0] == mtime:
        return cached[1]
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        logger.error("Sealed scrolls at %s could not be parsed", path)
        return {}
    verified: Dict[str, dict] = {}
    for s in data.get("scrolls", []):
        key = s.get("key")
        if not PASS_BY_KEY.get(key, {}).get("sealed"):
            continue
        expected = FINGERPRINTS.get(key)
        if not expected or not hmac.compare_digest(fingerprint(s), expected):
            logger.error("Sealed scroll %s does not match its published fingerprint and will not be served", key)
            continue
        verified[key] = s
    _sealed_cache[path] = (mtime, verified)
    return verified


def paragraphs(text: str) -> List[str]:
    return [p.strip() for p in text.split("\n\n") if p.strip()]


# ---------------------------------------------------------------------------
# Names and generations
# ---------------------------------------------------------------------------
GENERATION_VERSE = [
    ("深", "Shēn", "deep"),
    ("根", "Gēn", "root"),
    ("固", "Gù", "firm"),
    ("柢", "Dǐ", "taproot"),
    ("長", "Cháng", "long"),
    ("生", "Shēng", "life"),
    ("久", "Jiǔ", "lasting"),
    ("視", "Shì", "seeing"),
    ("之", "Zhī", "of"),
    ("道", "Dào", "the Way"),
]
FIRST_GENERATION = 108  # 36 + 72, the heavenly and earthly stars.
GENERATION_WORDS = ("First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth")

NAME_CHARACTERS = [
    ("松", "Sōng", "pine"),
    ("鶴", "Hè", "crane"),
    ("雲", "Yún", "cloud"),
    ("山", "Shān", "mountain"),
    ("泉", "Quán", "spring"),
    ("谷", "Gǔ", "valley"),
    ("石", "Shí", "stone"),
    ("竹", "Zhú", "bamboo"),
    ("月", "Yuè", "moon"),
    ("星", "Xīng", "star"),
    ("風", "Fēng", "wind"),
    ("雪", "Xuě", "snow"),
    ("玄", "Xuán", "mystery"),
    ("虛", "Xū", "emptiness"),
    ("靜", "Jìng", "stillness"),
    ("樸", "Pǔ", "simplicity"),
    ("素", "Sù", "plainness"),
    ("真", "Zhēn", "truth"),
    ("清", "Qīng", "clarity"),
    ("和", "Hé", "harmony"),
    ("明", "Míng", "brightness"),
    ("一", "Yī", "oneness"),
    ("柔", "Róu", "softness"),
    ("元", "Yuán", "origin"),
]
NAME_BY_CHAR = {c[0]: c for c in NAME_CHARACTERS}

COUNTER_ID = "practice_names"


def generation_of(ordinal: int) -> dict:
    """The generation and seat of the nth practice name ever taken (1-based)."""
    if ordinal < 1:
        raise ValueError("ordinal starts at 1")
    gen, start, size = 1, 1, FIRST_GENERATION
    while ordinal >= start + size:
        start += size
        size *= 10
        gen += 1
    char, pinyin, gloss = GENERATION_VERSE[(gen - 1) % len(GENERATION_VERSE)]
    word = GENERATION_WORDS[gen - 1] if gen <= len(GENERATION_WORDS) else nth(gen)
    return {
        "generation": gen,
        "label": f"{word} generation",
        "character": char,
        "pinyin": pinyin,
        "gloss": gloss,
        "seat": ordinal - start + 1,
        "size": size,
    }


def open_generation(taken: int) -> dict:
    """The generation the next name will join, and how many places it has left."""
    g = generation_of(taken + 1)
    return {**g, "remaining": g["size"] - g["seat"] + 1}


def make_name(ordinal: int, character: str, now: datetime) -> dict:
    g = generation_of(ordinal)
    char, pinyin, gloss = NAME_BY_CHAR[character]
    return {
        "name": g["character"] + char,
        "romanized": f"{g['pinyin']} {pinyin}",
        "gloss": f"{g['gloss'].capitalize()} {gloss}",
        "character": char,
        "generation": g["generation"],
        "generation_label": g["label"],
        "generation_character": g["character"],
        "seat": g["seat"],
        "generation_size": g["size"],
        "ordinal": ordinal,
        "taken_at": now,
    }


def public_name(user: dict) -> Optional[dict]:
    """The practice name as anyone may see it."""
    n = user.get("practice_name")
    if not n:
        return None
    return {k: n[k] for k in (
        "name", "romanized", "gloss", "generation", "generation_label",
        "generation_character", "seat", "generation_size", "taken_at",
    )}


def vow_state(user: dict, days: int) -> Optional[dict]:
    v = user.get("vow")
    if not v or v.get("key") not in PASS_BY_KEY:
        return None
    p = PASS_BY_KEY[v["key"]]
    return {
        "key": p["key"],
        "title": p["title"],
        "day": p["day"],
        "taken_at": v.get("taken_at"),
        "days_left": max(0, p["day"] - days),
        "fulfilled": days >= p["day"],
    }


# ---------------------------------------------------------------------------
# Queries shared with server.py
# ---------------------------------------------------------------------------
async def practice_dates(db, user_id: str) -> List[str]:
    """Distinct dates with a journal log. Uncapped: nine years is 3,285 of them."""
    return list(await db.logs.distinct("date", {"user_id": user_id, "deleted_at": None}))


async def names_taken(db) -> int:
    doc = await db.counters.find_one({"_id": COUNTER_ID})
    return int((doc or {}).get("n", 0))


async def today_summary(db, user: dict, days: int, logged_today: bool) -> dict:
    """What the Today screen shows of the passes: one line, never a dashboard."""
    opened = PASS_BY_DAY.get(days) if logged_today else None
    return {
        "name": public_name(user),
        "next": next_pass(days),
        "opened_today": pass_meta(opened) if opened else None,
        "open_generation": None if user.get("practice_name") else open_generation(await names_taken(db)),
    }


async def opened_by_new_day(db, user_id: str) -> Optional[dict]:
    """After the first log of a new practice day: the scroll that day opened, if any."""
    days = len(await practice_dates(db, user_id))
    p = PASS_BY_DAY.get(days)
    return pass_meta(p) if p else None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
class NameIn(BaseModel):
    character: str
    vow: str = "first-pass"


class VowIn(BaseModel):
    vow: str


def build_router(db, get_current_user: Callable[..., Awaitable[dict]]) -> APIRouter:
    router = APIRouter()

    async def day_count(user: dict) -> int:
        return len(await practice_dates(db, user["user_id"]))

    @router.get("/passes")
    async def overview(user: dict = Depends(get_current_user)):
        days = await day_count(user)
        return {
            "days": days,
            "passes": passes_state(days),
            "next": next_pass(days),
            "name": public_name(user),
            "vow": vow_state(user, days),
            "open_generation": open_generation(await names_taken(db)),
            "name_characters": [{"character": c, "pinyin": p, "gloss": g} for c, p, g in NAME_CHARACTERS],
            "vows": [pass_meta(PASS_BY_KEY[k]) for k in VOWS],
        }

    @router.get("/passes/{key}")
    async def read_scroll(key: str, user: dict = Depends(get_current_user)):
        p = PASS_BY_KEY.get(key)
        if not p:
            raise HTTPException(status_code=404, detail="There is no such scroll.")
        days = await day_count(user)
        if days < p["day"]:
            raise HTTPException(
                status_code=403,
                detail=f"This scroll opens on your {nth(p['day'])} day of practice.",
            )
        scroll = pass_meta(p)
        if p.get("sealed"):
            text = sealed_scrolls().get(key)
            scroll["fingerprint"] = FINGERPRINTS.get(key)
            scroll["verified"] = bool(text)
            if text:
                scroll.update(
                    zh=text.get("zh", ""),
                    translation=text.get("translation", ""),
                    body=paragraphs(text["body"]),
                    nonce=text["nonce"],
                )
            else:
                scroll.update(zh="", translation="", body=None)
        else:
            text = OPEN_SCROLLS[key]
            scroll.update(zh=text["zh"], translation=text["translation"], body=text["body"], source=text["source"])
        return {"scroll": scroll}

    @router.post("/passes/name")
    async def take_name(body: NameIn, user: dict = Depends(get_current_user)):
        if user.get("practice_name"):
            raise HTTPException(status_code=409, detail="You already have a practice name, and it is permanent.")
        if body.character not in NAME_BY_CHAR:
            raise HTTPException(status_code=400, detail="Choose one of the offered characters.")
        if body.vow not in VOWS:
            raise HTTPException(status_code=400, detail="Choose a pass to vow toward.")
        counter = await db.counters.find_one_and_update(
            {"_id": COUNTER_ID},
            {"$inc": {"n": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        now = datetime.now(timezone.utc)
        name = make_name(int(counter["n"]), body.character, now)
        vow = {"key": body.vow, "taken_at": now}
        res = await db.users.update_one(
            {"user_id": user["user_id"], "practice_name": {"$exists": False}},
            {"$set": {"practice_name": name, "vow": vow}},
        )
        if res.modified_count == 0:
            raise HTTPException(status_code=409, detail="You already have a practice name, and it is permanent.")
        days = await day_count(user)
        return {"name": public_name({"practice_name": name}), "vow": vow_state({"vow": vow}, days)}

    @router.post("/passes/vow")
    async def renew_vow(body: VowIn, user: dict = Depends(get_current_user)):
        if not user.get("practice_name"):
            raise HTTPException(status_code=400, detail="Take your name first.")
        if body.vow not in VOWS:
            raise HTTPException(status_code=400, detail="Choose a pass to vow toward.")
        days = await day_count(user)
        if PASS_BY_KEY[body.vow]["day"] <= days:
            raise HTTPException(status_code=400, detail="Vow toward a pass you have not reached yet.")
        vow = {"key": body.vow, "taken_at": datetime.now(timezone.utc)}
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"vow": vow}})
        return {"vow": vow_state({"vow": vow}, days)}

    return router
