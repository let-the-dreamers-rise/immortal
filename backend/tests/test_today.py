"""Today-surface logic, checked locally.

These cover the properties that make the Today screen worth having, each of
which is a decision that could be reversed by accident:

  - the pine never regresses, so a missed day costs nothing
  - a newcomer is never handed a twenty-minute practice as their first action
  - night suggests only settling practices
  - the alternative is always a genuinely different, smaller option

The on-ramp gate is the one a future change is most likely to break. It was
itself a bug found by running the payload rather than reading it: a brand-new
user at 8am was being offered a twenty-minute Wu Qin Xi.
"""

from datetime import datetime, timezone

import pytest

from seed_data import PRACTICES, STAGES
from today import (
    GROWTH,
    NIGHT_SAFE,
    ONRAMP_DAYS,
    PHASES,
    build_today,
    growth_for,
    phase_for,
)

STAGE_IDS = STAGES[0]["practices"]


def payload(*, hour=8, days=10, logged=False):
    return build_today(
        now=datetime(2026, 9, 18, hour, tzinfo=timezone.utc),
        practices=PRACTICES,
        stage_practice_ids=STAGE_IDS,
        total_days=days,
        logged_today=logged,
        stage_title="Body Opening",
    )


def is_short(p):
    return bool(p.get("seconds") or p.get("on_the_go"))


class TestPhases:
    @pytest.mark.parametrize("hour", range(24))
    def test_every_hour_maps_to_a_phase(self, hour):
        ph = phase_for(hour)
        assert ph["phase"] in {k for _, k, _, _ in PHASES}
        assert ph["phase_label"] and ph["phase_line"]

    def test_small_hours_are_night(self):
        """Hours before the first boundary wrap to night rather than falling through."""
        for hour in (0, 1, 2, 3):
            assert phase_for(hour)["phase"] == "night"

    def test_boundaries(self):
        assert phase_for(4)["phase"] == "dawn"
        assert phase_for(7)["phase"] == "morning"
        assert phase_for(11)["phase"] == "midday"
        assert phase_for(15)["phase"] == "afternoon"
        assert phase_for(18)["phase"] == "dusk"
        assert phase_for(21)["phase"] == "night"


class TestGrowth:
    def test_never_regresses(self):
        """The whole point: a missed day must never move the tree backwards."""
        order = [g[1] for g in GROWTH]
        indices = [order.index(growth_for(d)["stage"]) for d in range(0, 500)]
        assert indices == sorted(indices), "growth regressed"

    @pytest.mark.parametrize(
        "days,stage",
        [
            (0, "seed"), (1, "sprout"), (6, "sprout"), (7, "seedling"),
            (29, "seedling"), (30, "young pine"), (89, "young pine"),
            (90, "pine"), (180, "old pine"), (365, "pine and crane"),
            (10_000, "pine and crane"),
        ],
    )
    def test_thresholds(self, days, stage):
        assert growth_for(days)["stage"] == stage

    def test_progress_stays_in_range(self):
        for d in range(0, 500):
            assert 0.0 <= growth_for(d)["progress"] <= 1.0, d

    def test_final_stage_has_no_next(self):
        g = growth_for(400)
        assert g["next_at"] is None and g["next_label"] is None
        assert g["progress"] == 1.0

    def test_every_stage_has_a_glyph_and_a_line(self):
        for threshold, _key, glyph, label, line in GROWTH:
            assert glyph and label and line, threshold


class TestSuggestion:
    def test_newcomer_is_never_given_a_long_practice(self):
        """The on-ramp gate. This was a real bug before it was a test."""
        for days in range(0, ONRAMP_DAYS):
            for hour in (5, 8, 12, 16, 19, 22):
                p = payload(hour=hour, days=days)["suggestion"]
                assert p is not None
                assert is_short(p), f"day {days} {hour}:00 offered {p['title']}"

    def test_established_practitioner_gets_the_curriculum(self):
        for hour in (5, 8, 19):
            p = payload(hour=hour, days=ONRAMP_DAYS)["suggestion"]
            assert p["practice_id"] in STAGE_IDS, f"{hour}:00 -> {p['title']}"

    def test_night_only_suggests_settling_practices(self):
        """Kapalabhati at 10pm would be actively bad advice."""
        for days in (0, 5, 200):
            p = payload(hour=22, days=days)["suggestion"]
            assert p["practice_id"] in NIGHT_SAFE, f"night offered {p['title']}"

    def test_alternative_is_always_smaller_and_different(self):
        for days in (0, 5, 200):
            for hour in (5, 8, 12, 16, 19, 22):
                d = payload(hour=hour, days=days)
                alt, sug = d["alternative"], d["suggestion"]
                assert alt is not None
                assert alt["practice_id"] != sug["practice_id"]
                assert is_short(alt), f"alternative {alt['title']} is not short"

    def test_suggestion_rotates_across_days(self):
        """The same practice every morning becomes wallpaper."""
        seen = {
            build_today(
                now=datetime(2026, 9, d, 8, tzinfo=timezone.utc),
                practices=PRACTICES,
                stage_practice_ids=STAGE_IDS,
                total_days=0,
                logged_today=False,
                stage_title="x",
            )["suggestion"]["practice_id"]
            for d in range(1, 15)
        }
        assert len(seen) > 1

    def test_suggestion_is_stable_within_a_day(self):
        """Reopening the app must not reroll the suggestion."""
        ids = {payload(hour=h, days=0)["suggestion"]["practice_id"] for h in (11, 12, 13, 14)}
        assert len(ids) == 1


class TestPayload:
    def test_logged_day_closes_rather_than_nags(self):
        d = payload(days=10, logged=True)
        assert d["logged_today"] is True
        assert d["closing_line"]

    def test_unlogged_day_has_no_closing_line(self):
        assert payload(days=10, logged=False)["closing_line"] is None

    def test_payload_shape(self):
        d = payload()
        for key in (
            "phase", "phase_label", "phase_line", "date", "logged_today",
            "stage_title", "suggestion", "alternative", "growth", "closing_line",
        ):
            assert key in d, key

    def test_survives_an_empty_library(self):
        """Seeding runs after startup; the endpoint must not 500 before it finishes."""
        d = build_today(
            now=datetime(2026, 9, 18, 8, tzinfo=timezone.utc),
            practices=[],
            stage_practice_ids=[],
            total_days=0,
            logged_today=False,
            stage_title=None,
        )
        assert d["suggestion"] is None and d["alternative"] is None
        assert d["growth"]["stage"] == "seed"
