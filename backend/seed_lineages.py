"""Founding lineages, recorded by the Immortal Archive so the space is not empty.

Each one is a long-horizon method drawn from the practice library, written the
way a member would write it: what to do, for how long, and what to watch for.
The framing stays historical and observational, never therapeutic.
"""

ARCHIVE_USER = {
    "user_id": "user_archive",
    "email": "archive@immortal.invalid",
    "display_name": "Immortal Archive",
    "hashed_password": None,
    "auth_provider": "system",
    "picture": None,
    "bio": "Founding lineages drawn from the Daoist yangsheng record.",
    "intention": None,
    "path_choice": "dao",
    # Not onboarded, so the archive never shows up as a practitioner to follow.
    "onboarded": False,
}

FOUNDING_LINEAGES = [
    {
        "lineage_id": "lin_zhanzhuang100",
        "title": "One Hundred Days of Standing",
        "chinese": "站桩百日",
        "summary": "Zhan zhuang, the standing post, held daily for a hundred days. Traditional teachers treat the first hundred days as the foundation before anything else is added.",
        "method": "Stand with feet shoulder-width apart, knees soft, arms rounded as if holding a large tree at chest height. Start at 5 minutes and add a minute every week, up to 20. Breathe naturally through the nose and do not force stillness. Log each day you stand, and leave a note whenever something changes: heat in the hands, trembling, restlessness, or nothing at all.",
        "cautions": "Trembling in the legs is common and usually settles. Stop if you feel dizzy or have pain in the knees; shorten the stance height before you shorten the time.",
        "horizon_days": 100,
        "daily_minutes": 15,
        "based_on_practice_id": "zhan-zhuang",
    },
    {
        "lineage_id": "lin_baduanjinyear",
        "title": "A Year of the Eight Brocades",
        "chinese": "八段锦一年",
        "summary": "The full Ba Duan Jin sequence every morning for a year, recording how the forms change across four seasons.",
        "method": "Each morning, perform all eight brocades in order, 6 to 8 repetitions each, slowly and with the breath. In each season, pick one brocade to study closely and leave a note on what you notice in it. The seasonal notes are the heart of this lineage: how the same form feels in winter and in summer.",
        "cautions": "Keep movements within a comfortable range, especially the backward bend and the head turns if you have neck or back issues.",
        "horizon_days": 365,
        "daily_minutes": 15,
        "based_on_practice_id": "ba-duan-jin",
    },
    {
        "lineage_id": "lin_liuzijue90",
        "title": "Six Healing Sounds, Ninety Days",
        "chinese": "六字诀",
        "summary": "Liuzijue: the six exhaled sounds xu, he, hu, si, chui and xi, practised daily for one season.",
        "method": "Sit or stand upright. On each long exhale, voice one sound softly, six times per sound, moving through all six in order. Keep the inhale natural through the nose. Note which sounds feel easy and which feel strained, and whether that shifts over the ninety days.",
        "cautions": "Never strain the exhale or hold the breath. Stop if you feel light-headed.",
        "horizon_days": 90,
        "daily_minutes": 10,
        "based_on_practice_id": "long-breath",
    },
    {
        "lineage_id": "lin_dantianwinter",
        "title": "Returning to the Lower Dantian",
        "chinese": "意守丹田",
        "summary": "Resting attention at the lower dantian during quiet sitting, daily for 180 days, as the neidan texts describe for laying the foundation.",
        "method": "Sit comfortably with the spine upright. Breathe low into the belly and let attention rest gently just below the navel, without pushing or visualising anything. Start at 10 minutes. When attention wanders, return it without judgement. Record your days and write a note whenever you notice warmth, fullness, or simply a quieter mind.",
        "cautions": "Keep attention light. If you feel pressure in the head or agitation, open your eyes, walk, and shorten the next sitting.",
        "horizon_days": 180,
        "daily_minutes": 20,
        "based_on_practice_id": "dantian-breathing",
    },
    {
        "lineage_id": "lin_smallorbit3y",
        "title": "The Small Heavenly Circuit, Three Years",
        "chinese": "小周天",
        "summary": "The microcosmic orbit taken up as the traditional multi-year work. Nobody has run this as a study; this lineage is where those who try it keep an honest record.",
        "method": "Only begin after at least 100 days of dantian sitting. Sit daily. Let attention follow the breath up the spine on the inhale and down the front on the exhale, slowly and without effort. Most days nothing notable happens, and that belongs in the record too. Leave a note at least once a month.",
        "cautions": "The classical texts warn of 'deviation' (走火入魔) from forcing this practice. Stop and return to plain dantian sitting if you notice persistent heat in the head, insomnia, or anxiety. Anyone with a history of psychosis or dissociation should not take up this lineage.",
        "horizon_days": 1095,
        "daily_minutes": 30,
        "based_on_practice_id": "microcosmic-orbit",
    },
]
