"""Content and Today-logic invariants, checked locally.

The rest of this suite is integration: it logs into a deployed preview and
exercises the API. Useful, but it cannot run without that deployment, and it
tests none of the properties the practice library actually depends on.

These do, and they need nothing but the repository. They exist because five
modules and roughly a thousand lines of practice content were added without a
single test asserting any of it, and every property below was verified by hand
exactly once. Hand-verification does not survive the next contributor.

The claim-language test is the one that matters most. The whole General
Wellness position in Section 12 of the dossier rests on the library describing
mechanism and sensation rather than promising outcomes. Nothing enforced that
before; one careless `modern_understanding` would quietly cost it.
"""

import re

import pytest

from ayurveda_practices import AYURVEDA_PRACTICES
from micro_practices import MICRO_PRACTICES
from on_the_go_practices import ON_THE_GO_PRACTICES
from seed_data import PRACTICES, STAGES, TEACHINGS

NEW_PRACTICES = AYURVEDA_PRACTICES + MICRO_PRACTICES + ON_THE_GO_PRACTICES

BASE_FIELDS = {
    "practice_id",
    "title",
    "tradition",
    "category",
    "difficulty",
    "time_min",
    "origin_text",
    "historical_context",
    "modern_understanding",
    "instructions",
    "safety_note",
}


class TestLibraryIntegrity:
    def test_practice_ids_unique(self):
        ids = [p["practice_id"] for p in PRACTICES]
        dupes = {i for i in ids if ids.count(i) > 1}
        assert not dupes, f"duplicate practice_id: {dupes}"

    def test_every_practice_has_base_schema(self):
        for p in PRACTICES:
            missing = BASE_FIELDS - set(p)
            assert not missing, f"{p.get('practice_id')} missing {missing}"

    def test_traditions_are_known(self):
        for p in PRACTICES:
            assert p["tradition"] in ("dao", "ayurveda"), p["practice_id"]

    def test_difficulties_are_known(self):
        for p in PRACTICES:
            assert p["difficulty"] in ("beginner", "intermediate", "advanced"), p["practice_id"]

    def test_instructions_are_substantive(self):
        """A practice a user cannot follow is worse than no practice."""
        for p in PRACTICES:
            assert isinstance(p["instructions"], list)
            assert len(p["instructions"]) >= 3, f"{p['practice_id']} has too few steps"
            for step in p["instructions"]:
                assert step.strip(), f"{p['practice_id']} has an empty step"

    def test_stage_practice_references_resolve(self):
        """A stage pointing at a practice_id that does not exist renders an empty stage."""
        known = {p["practice_id"] for p in PRACTICES}
        for st in STAGES:
            for pid in st["practices"]:
                assert pid in known, f"stage {st['stage_id']} references unknown practice {pid}"

    def test_stage_orders_unique_and_contiguous(self):
        """stage_status() unlocks on order - 1, so a gap locks everything after it forever."""
        orders = sorted(s["order"] for s in STAGES)
        assert len(orders) == len(set(orders)), "duplicate stage order"
        assert orders == list(range(1, len(orders) + 1)), f"non-contiguous stage orders: {orders}"

    def test_teaching_ids_unique(self):
        ids = [t["teaching_id"] for t in TEACHINGS]
        assert len(ids) == len(set(ids))


class TestSafety:
    """Safety notes are the part of this library that can prevent an injury."""

    def test_advanced_and_intermediate_carry_safety_notes(self):
        for p in PRACTICES:
            if p["difficulty"] in ("intermediate", "advanced"):
                assert p["safety_note"], f"{p['practice_id']} is {p['difficulty']} with no safety_note"

    def test_on_the_go_practices_are_eyes_open_and_warned(self):
        """Attention turned inward while moving through traffic is the hazard."""
        for p in ON_THE_GO_PRACTICES:
            assert p.get("on_the_go") is True, p["practice_id"]
            assert p.get("eyes_open") is True, p["practice_id"]
            assert p["safety_note"], p["practice_id"]

    def test_breath_retention_hazard_is_named_where_it_applies(self):
        """Hyperventilation before a breath hold is the hypoxic-blackout mechanism.

        Kapalabhati is the practice in this library where that combination is
        most likely to be attempted, so its note must name it explicitly rather
        than offering a generic caution.
        """
        kap = next(p for p in PRACTICES if p["practice_id"] == "kapalabhati")
        note = kap["safety_note"].lower()
        assert "never follow kapalabhati with a breath hold" in note
        assert "hypoxic blackout" in note
        assert "water" in note

    def test_neti_water_hazard_is_named(self):
        """Untreated tap water in nasal irrigation has caused fatal infections."""
        neti = next(p for p in PRACTICES if p["practice_id"] == "jala-neti")
        note = neti["safety_note"]
        assert "NEVER use untreated tap water" in note
        assert "Naegleria" in note
        # The warning must also be in step one — people skim notes and follow steps.
        assert any("sterile" in s or "boiled" in s for s in neti["instructions"])

    def test_eye_practices_warn_against_pressure(self):
        for pid in ("micro-eye-rest", "trataka"):
            p = next(x for x in PRACTICES if x["practice_id"] == pid)
            assert "glaucoma" in p["safety_note"].lower(), pid

    @pytest.mark.parametrize("excluded", ["kunjal", "vamana", "waidan", "bigu"])
    def test_excluded_practices_are_not_in_the_library(self, excluded):
        """Section 8 excludes these on documented mechanism of harm."""
        ids = " ".join(p["practice_id"] for p in PRACTICES)
        assert excluded not in ids


class TestClaimLanguage:
    """Section 12's General Wellness position depends on this holding.

    historical_context MAY report what a tradition claimed — that is history.
    modern_understanding may NOT make a health claim in the app's own voice.
    """

    CLAIM = re.compile(
        r"\b("
        r"cures?|heals?"
        r"|prevents?\s+\w*\s*(disease|illness|cancer)"
        r"|boosts?\s+(immunity|the immune)"
        r"|detoxif\w+"
        r"|reverses?\s+(aging|ageing)"
        r"|treats?\s+(a\s+)?(condition|disease|illness|depression|anxiety|insomnia)"
        r"|will\s+(make you|help you)\s+live"
        r"|extends?\s+(your\s+)?(life|lifespan)"
        r")\b",
        re.I,
    )

    def test_modern_understanding_makes_no_outcome_claims(self):
        offenders = []
        for p in PRACTICES:
            hit = self.CLAIM.search(p["modern_understanding"])
            if hit:
                offenders.append((p["practice_id"], hit.group(0)))
        assert not offenders, f"outcome claims in modern_understanding: {offenders}"

    def test_titles_and_categories_make_no_claims(self):
        for p in PRACTICES:
            assert not self.CLAIM.search(p["title"]), p["practice_id"]
            assert not self.CLAIM.search(p["category"]), p["practice_id"]

    def test_evidence_notes_state_their_limits(self):
        """An evidence_note that only reports a headline is worse than none."""
        # Any explicit statement of a limitation counts: sample size, blinding,
        # population, or — as with Ba Duan Jin — that the trials only ever test
        # the whole set, so effects cannot be attributed to individual forms.
        hedges = (
            "small", "limited", "contested", "uncertain", "suggestive",
            "unblind", "mixed", "not settled", "caveat", "specific populations",
            "all studies", "cannot", "no trial", "short", "difficult to",
            # Reporting that some people are harmed is itself a stated limit.
            "minority", "both directions", "adverse", "stop if",
        )
        for p in PRACTICES:
            note = p.get("evidence_note")
            if note:
                assert any(h in note.lower() for h in hedges), (
                    f"{p['practice_id']} evidence_note states no limitation"
                )


class TestShortPractices:
    def test_micro_durations_are_actually_short(self):
        for p in MICRO_PRACTICES:
            assert 30 <= p["seconds"] <= 90, f"{p['practice_id']} is {p['seconds']}s"

    def test_micro_practices_declare_a_cue_and_discretion(self):
        for p in MICRO_PRACTICES:
            assert p.get("cue"), p["practice_id"]
            assert isinstance(p.get("discreet"), bool), p["practice_id"]

    def test_short_practices_are_beginner(self):
        """An on-ramp a newcomer is locked out of is not an on-ramp."""
        for p in MICRO_PRACTICES + ON_THE_GO_PRACTICES:
            assert p["difficulty"] == "beginner", p["practice_id"]
