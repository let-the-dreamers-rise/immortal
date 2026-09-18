"""The Today surface — one thing to do now, and a tree that remembers.

Two problems this solves.

The first is structural: the app had no answer to "what do I do today". Home
was a journey map, so a practitioner on day four had to decide for themselves
every single time, and a decision paid daily is the most reliable way to lose
a habit. Today answers the question before it is asked.

The second is the standing conflict between retention and honesty. Streaks
retain, and streaks are also the thing that makes this look like every other
wellness app — they punish a missed day and they turn practice into a score.
The growth model here replaces that: a pine, which in Chinese art is the
longevity emblem (松鶴延年, pine and crane, extended years), grown from days
practised in total and NEVER regressing. Miss a week and the tree is exactly
where you left it. Trees do not die of one dry day.

That distinction matters beyond feel. A streak is a claim about your
consistency. Accumulated days is a fact about what you did.

ON THE IMMORTALITY FRAMING, DELIBERATELY

The tradition's own vocabulary is used and attributed — changsheng (長生,
long life), the pine and crane emblem, xian (仙) as the transcendent of the
texts. What the tradition hoped for is reported as what the tradition hoped
for. Nothing here says, implies, or arranges pixels to suggest that the
practitioner will live longer. That is the line the dossier's Section 12 draws
around the General Wellness position, and poetry is available on this side of
it. The texts are more beautiful than any claim we could make anyway.
"""

from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# The daily cycle
# ---------------------------------------------------------------------------
# The classical regimens divide the day and prescribe differently across it —
# brahma muhurta before dawn in the Ayurvedic texts, the pre-dawn hours in
# Sun Simiao. Phase drives what gets suggested.

PHASES = [
    # (start_hour, key, label, line)
    (4,  "dawn",      "Before dawn",  "The old texts call this the clearest hour."),
    (7,  "morning",   "Morning",      "The body is awake and the day is not yet loud."),
    (11, "midday",    "Midday",       "A gap in the middle of things."),
    (15, "afternoon", "Afternoon",    "The long stretch. Something small is enough."),
    (18, "dusk",      "Dusk",         "The day is turning over."),
    (21, "night",     "Night",        "Let it be short, and let it settle."),
]


def phase_for(hour: int) -> dict:
    """The phase containing this hour. Hours before the first boundary belong to night."""
    current = PHASES[-1]
    for start, key, label, line in PHASES:
        if hour >= start:
            current = (start, key, label, line)
    _, key, label, line = current
    return {"phase": key, "phase_label": label, "phase_line": line}


# ---------------------------------------------------------------------------
# The pine
# ---------------------------------------------------------------------------
# Thresholds are days practised in total, never the current streak. The stage
# can only ever move forward.

GROWTH = [
    (0,   "seed",       "種",   "A seed",             "Not yet in the ground. That is where everything starts."),
    (1,   "sprout",     "芽",   "A sprout",           "One day is not a habit. It is still the thing a habit is made of."),
    (7,   "seedling",   "苗",   "A seedling",         "A week of days. Thin, and standing."),
    (30,  "young pine", "幼松", "A young pine",       "A month. Pines are slow, which is the point of them."),
    (90,  "pine",       "松",   "A pine",             "Ninety days. The tradition considers this the beginning, not the end."),
    (180, "old pine",   "古松", "An old pine",        "Half a year of returning to the same thing."),
    (365, "pine and crane", "松鶴", "Pine and crane", "A full year. 松鶴延年 — the old emblem for years extended, painted for people the painters hoped would keep going."),
]


def growth_for(total_days: int) -> dict:
    """Growth stage from accumulated days. Never regresses — a missed day costs nothing."""
    stage = GROWTH[0]
    for threshold, key, glyph, label, line in GROWTH:
        if total_days >= threshold:
            stage = (threshold, key, glyph, label, line)
    threshold, key, glyph, label, line = stage

    nxt = next((g for g in GROWTH if g[0] > total_days), None)
    return {
        "stage": key,
        "glyph": glyph,
        "label": label,
        "line": line,
        "days": total_days,
        "next_at": nxt[0] if nxt else None,
        "next_label": nxt[3] if nxt else None,
        # Progress toward the next stage, for a quiet arc rather than a number.
        "progress": (
            round((total_days - threshold) / (nxt[0] - threshold), 3)
            if nxt and nxt[0] > threshold
            else 1.0
        ),
    }


# ---------------------------------------------------------------------------
# What to suggest
# ---------------------------------------------------------------------------
# Longer practice sits where the classical regimens put it — early, and at
# dusk. The middle of the day gets something that fits in the middle of a day.

PHASE_PREFERENCE = {
    "dawn":      ["stage", "micro"],
    "morning":   ["stage", "on_the_go"],
    "midday":    ["on_the_go", "micro"],
    "afternoon": ["on_the_go", "micro"],
    "dusk":      ["stage", "micro"],
    "night":     ["micro"],
}

# At night, suggest only practices that settle. Anything stimulating is wrong
# here, and kapalabhati at 10pm would be actively bad advice.
NIGHT_SAFE = {
    "micro-yan-jin",
    "micro-kaya-sthairyam",
    "micro-dantian-breaths",
    "micro-eye-rest",
    "micro-dirgha",
}


# Days of practice below which the stage curriculum is never suggested. A
# twenty-minute set is the right ask for someone established and the wrong one
# for someone on day one — which is the whole reason the short practices exist.
ONRAMP_DAYS = 3


def pick_suggestion(
    phase: str, practices: list, stage_practice_ids: list, seed: int, total_days: int = 0
) -> dict | None:
    """One practice for right now.

    `seed` rotates the choice day by day so the same practice does not appear
    every morning, without needing to store what was shown.
    """
    by_id = {p["practice_id"]: p for p in practices}

    def pool(kind: str) -> list:
        if kind == "stage":
            return [by_id[i] for i in stage_practice_ids if i in by_id]
        if kind == "micro":
            return [p for p in practices if p.get("seconds")]
        if kind == "on_the_go":
            return [p for p in practices if p.get("on_the_go")]
        return []

    order = PHASE_PREFERENCE.get(phase, ["micro"])
    if total_days < ONRAMP_DAYS:
        # Early on, offer only what can be said yes to standing up.
        order = ["micro"] if phase == "night" else ["on_the_go", "micro"]

    for kind in order:
        candidates = pool(kind)
        if phase == "night":
            candidates = [p for p in candidates if p["practice_id"] in NIGHT_SAFE]
        if candidates:
            candidates.sort(key=lambda p: p["practice_id"])
            return candidates[seed % len(candidates)]
    return None


def build_today(
    *,
    now: datetime,
    practices: list,
    stage_practice_ids: list,
    total_days: int,
    logged_today: bool,
    stage_title: str | None,
) -> dict:
    """Assemble the Today payload."""
    ph = phase_for(now.hour)
    seed = now.toordinal()

    suggestion = pick_suggestion(ph["phase"], practices, stage_practice_ids, seed, total_days)
    # A second, always-smaller option, so there is a way to say yes on a bad day.
    smalls = [p for p in practices if p.get("seconds") or p.get("on_the_go")]
    smalls.sort(key=lambda p: p["practice_id"])
    alt = None
    if smalls:
        alt = smalls[(seed + 3) % len(smalls)]
        if suggestion and alt["practice_id"] == suggestion["practice_id"]:
            alt = smalls[(seed + 4) % len(smalls)]

    return {
        **ph,
        "date": now.date().isoformat(),
        "logged_today": logged_today,
        "stage_title": stage_title,
        "suggestion": suggestion,
        "alternative": alt,
        "growth": growth_for(total_days),
        # When the day's practice is already logged, the app says so and stops
        # asking. An app willing to be finished is rarer than one that is not.
        "closing_line": (
            "You have practised today. Nothing further is asked."
            if logged_today
            else None
        ),
    }
