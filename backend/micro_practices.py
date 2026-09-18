"""Micro-practices — the on-ramp into the curriculum.

The library had nothing between a 2-minute habit and a 10-minute sitting, and
nothing at all that could be done standing in a queue. A new practitioner's
first ask was "begin a two-year curriculum", which is a great deal to want from
someone who installed the app ninety seconds ago.

These are 30-90 seconds each and anchored to a waiting cue. They are not a
lighter alternative invented for retention: every one is documented practice.
Tooth tapping and saliva swallowing appear in Ge Hong and Sun Simiao; palm
warming opens nearly every qigong set; the seated neck turn is the fourth
brocade of Ba Duan Jin reduced to what fits in a chair.

Two rules held throughout, both of which the wider dossier requires:

1. `modern_understanding` describes the mechanism or the sensation, never a
   health outcome. "The palms grow warm" is a description. "Improves
   circulation" is a claim, and it is the claim that costs us the General
   Wellness exemption in Section 12.
2. Anything with a real contraindication carries `safety_note`, even where the
   practice looks trivial. Eye palming is the one people get wrong.

Extra fields beyond the main PRACTICES schema:
  seconds  — actual duration; `time_min` stays for list-screen compatibility
  cue      — the waiting moment this attaches to
  discreet — True if it is invisible to someone sitting opposite you
"""

MICRO_PRACTICES = [
    # ---------------- DAO ----------------
    {
        "practice_id": "micro-kou-chi",
        "title": "Kou Chi — Tapping the Teeth",
        "tradition": "dao",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 40,
        "cue": "In a queue, or anywhere you cannot be seen to be doing anything",
        "discreet": True,
        "origin_text": "Ge Hong, Baopuzi (318 CE); Sun Simiao, Qianjin Fang (652 CE)",
        "historical_context": (
            "Tapping the upper and lower teeth together — classically thirty-six times — opens the "
            "morning regimen in some of the oldest surviving yangsheng manuals. Ge Hong lists it among "
            "the practices to be done on waking, before speaking to anyone. It survived twelve centuries "
            "of Chinese medical writing largely unchanged, which is unusual."
        ),
        "modern_understanding": (
            "A short, rhythmic jaw movement. Most people hold more tension in the jaw than they notice, "
            "and tapping tends to make that obvious before it makes anything else happen."
        ),
        "instructions": [
            "Close your lips. Let the jaw hang rather than clench.",
            "Tap the upper and lower teeth together lightly — the sound should be small.",
            "Count thirty-six taps, unhurried. Roughly one per second.",
            "Stop and notice the jaw for a moment before you carry on.",
        ],
        "safety_note": "Tap lightly. Skip this if you have jaw pain, a TMJ disorder, loose teeth, or recent dental work.",
    },
    {
        "practice_id": "micro-yan-jin",
        "title": "Yan Jin — Swallowing the Jade Fluid",
        "tradition": "dao",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 45,
        "cue": "Immediately after Kou Chi, or any moment you are simply waiting",
        "discreet": True,
        "origin_text": "Baopuzi (318 CE); Zunsheng Bajian (Gao Lian, ~1591)",
        "historical_context": (
            "Saliva was treated in the Daoist tradition as a substance worth conserving rather than "
            "discarding — called jade fluid or sweet dew, and classically swallowed in three parts, "
            "directed in the imagination toward the lower dantian. It is traditionally paired with tooth "
            "tapping, which is one reason the two appear together in the same passages."
        ),
        "modern_understanding": (
            "Moving the tongue around the mouth produces saliva; swallowing deliberately is a slow, "
            "attention-holding action. The tradition's claims about where the fluid goes are not claims "
            "we are making."
        ),
        "instructions": [
            "Run the tongue slowly around the outside of the teeth, upper then lower.",
            "Continue until saliva gathers — usually two or three circuits.",
            "Swallow in three deliberate parts rather than one.",
            "Let your attention follow each swallow downward, as far as it will go.",
        ],
        "safety_note": None,
    },
    {
        "practice_id": "micro-laogong",
        "title": "Warming the Palms — Laogong",
        "tradition": "dao",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 40,
        "cue": "Before anything else, or when your hands are cold",
        "discreet": True,
        "origin_text": "Standard opening of Daoyin and Qi Gong sets; Laogong (PC8) named in classical acupuncture texts",
        "historical_context": (
            "Rubbing the palms together opens almost every qigong set that has ever been written down. "
            "The point at the centre of the palm — Laogong, 'Palace of Toil' — is one of the oldest named "
            "points in Chinese medicine, and warming it is the conventional preparation before the hands "
            "are placed anywhere else on the body."
        ),
        "modern_understanding": (
            "Friction warms skin. The practice is chiefly a way of bringing attention into the hands "
            "before using them for anything else, which is why it comes first."
        ),
        "instructions": [
            "Place the palms together, fingers loose.",
            "Rub briskly — not hard — for about twenty seconds, until they are clearly warm.",
            "Stop. Hold the palms a few centimetres apart.",
            "Notice whatever is there: warmth, prickling, or nothing at all. Nothing at all is a common and honest result.",
        ],
        "safety_note": None,
    },
    {
        "practice_id": "micro-eye-rest",
        "title": "Palming and the Distant Gaze",
        "tradition": "dao",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 60,
        "cue": "After a long stretch at a screen",
        "discreet": False,
        "origin_text": "Sun Simiao, Qianjin Fang (652 CE); formalised in modern Chinese school eye exercises (眼保健操, from 1963)",
        "historical_context": (
            "Eye care appears in Sun Simiao's regimen alongside diet and sleep, and warmed palms over "
            "closed eyes is its most persistent element. The routine taught in Chinese schools since the "
            "1960s is a direct descendant, which makes this among the most widely practised things in "
            "this library, by a very large margin."
        ),
        "modern_understanding": (
            "Closing the eyes and then looking at something far away changes what the eye is doing after "
            "a long period of fixed near focus. Whether that relieves eye strain is genuinely contested; "
            "that it is a pause is not."
        ),
        "instructions": [
            "Warm the palms first, as in Laogong.",
            "Cup them over closed eyes. Rest the weight on the cheekbones and brow — never on the eyeballs.",
            "Stay for five slow breaths in the dark.",
            "Lower the hands, open the eyes, and look at the furthest thing you can see for twenty seconds.",
        ],
        "safety_note": (
            "Never press on the eyeballs — rest the hands on the bone around the eye. Skip this entirely "
            "if you have glaucoma, a retinal condition, an eye infection, or recent eye surgery."
        ),
    },
    {
        "practice_id": "micro-wise-owl",
        "title": "Wise Owl, Seated",
        "tradition": "dao",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 50,
        "cue": "At a desk, after sitting still too long",
        "discreet": True,
        "origin_text": "Fourth of the Eight Brocades (Ba Duan Jin), reduced to a seated form",
        "historical_context": (
            "'Wise Owl Gazes Backward' is the fourth brocade, traditionally said to ease the five strains "
            "and seven injuries — the classical shorthand for the wear of overwork. The standing version "
            "turns the whole torso; this keeps the turn in the neck and upper spine so it fits in a chair."
        ),
        "modern_understanding": (
            "A slow neck rotation through a comfortable range. It is the most ordinary thing in this "
            "library and it is here because people at desks stop turning their heads."
        ),
        "instructions": [
            "Sit tall. Let the shoulders drop.",
            "Breathe in. On the out-breath, turn the head slowly to the left, as though looking over the shoulder.",
            "Go only as far as is easy. Pause for one breath at the end of the turn.",
            "Return to centre on an in-breath. Repeat to the right. Two turns each side.",
        ],
        "safety_note": (
            "Move slowly and never force the turn — stop where it stops. Avoid this if you have a neck "
            "injury, disc problem, vertigo, or dizziness on turning your head."
        ),
    },
    {
        "practice_id": "micro-dantian-breaths",
        "title": "Three Breaths to the Lower Dantian",
        "tradition": "dao",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 45,
        "cue": "Anywhere. Standing, sitting, or waiting to be called in",
        "discreet": True,
        "origin_text": "Lower dantian described in Baopuzi (318 CE) and throughout the neidan literature",
        "historical_context": (
            "The lower dantian — a region a few finger-widths below the navel — is where the internal "
            "alchemical tradition places the foundation of everything built later. Nearly every longer "
            "practice in this library begins by putting attention there. This is that beginning, on its own."
        ),
        "modern_understanding": (
            "Three unhurried breaths with a hand on the belly, which makes it obvious whether you are "
            "breathing into the belly or the chest. Most people are surprised by the answer."
        ),
        "instructions": [
            "Rest one palm below the navel. In public, a hand in a pocket or folded across works as well.",
            "Breathe in without effort and let the belly move outward under the hand.",
            "Breathe out slowly, a little longer than the in-breath. Let the belly settle.",
            "Three breaths. No holding, no counting beyond three.",
        ],
        "safety_note": "Never hold the breath in this practice. If you feel light-headed, return to ordinary breathing.",
    },

    # ---------------- AYURVEDA ----------------
    {
        "practice_id": "micro-nadi-shodhana",
        "title": "Nadi Shodhana — One Round",
        "tradition": "ayurveda",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 60,
        "cue": "Sitting somewhere semi-private — a parked car, a stairwell, your desk",
        "discreet": False,
        "origin_text": "Hatha Yoga Pradipika (15th c.); Gheranda Samhita (17th c.)",
        "historical_context": (
            "Alternate nostril breathing is among the most consistently described pranayama practices in "
            "the hatha literature, where it is presented as preparation — the thing done before the "
            "practices the texts actually consider advanced. The classical instructions include retention; "
            "this version does not."
        ),
        "modern_understanding": (
            "Slow breathing with a longer exhalation, alternating nostrils. The extended out-breath is "
            "the part most likely to be doing something; the alternation is traditional and pleasant."
        ),
        "instructions": [
            "Rest the right thumb beside the right nostril, the ring finger beside the left.",
            "Close the right nostril. Breathe in slowly through the left.",
            "Close the left, release the right. Breathe out slowly through the right.",
            "In through the right. Close it, release the left. Out through the left. That is one round — do two.",
        ],
        "safety_note": (
            "No retention in this version — breathe continuously. Skip it if a nostril is blocked, and "
            "stop if you feel light-headed."
        ),
    },
    {
        "practice_id": "micro-dirgha",
        "title": "Dirgha — Three-Part Breath, Short Form",
        "tradition": "ayurveda",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 60,
        "cue": "Sitting anywhere. Nobody can tell.",
        "discreet": True,
        "origin_text": "Classical yogic pranayama; the foundation form taught before all others",
        "historical_context": (
            "The three-part breath fills belly, then ribs, then upper chest, and empties in reverse. In "
            "most teaching lineages it is the first pranayama given and the one returned to when a "
            "student's practice has gone astray."
        ),
        "modern_understanding": (
            "Deliberately extending the breath through its full range. It is slower than habitual "
            "breathing, which is most of what it is."
        ),
        "instructions": [
            "Breathe out fully first, further than feels necessary.",
            "Breathe in: let the belly fill, then the ribs widen, then the upper chest rise.",
            "Breathe out in reverse: chest, ribs, belly.",
            "Three rounds. If it starts to feel forced, you are working too hard — go smaller.",
        ],
        "safety_note": "No holding at the top or bottom. Return to ordinary breathing if you feel light-headed.",
    },
    {
        "practice_id": "micro-hasta-marma",
        "title": "Hasta Marma — The Points in the Hand",
        "tradition": "ayurveda",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 50,
        "cue": "Under a table, on a train, mid-conversation if you like",
        "discreet": True,
        "origin_text": "Sushruta Samhita (~6th c. BCE) — the marma described as vital points of the body",
        "historical_context": (
            "The Sushruta Samhita catalogues 107 marma — junctions of flesh, vessel, sinew, bone and "
            "joint — originally as sites a surgeon must avoid. Later practice inverted this, treating the "
            "same points as places worth touching. Several sit in the hand, which is why hand work "
            "survives in Ayurvedic daily routine."
        ),
        "modern_understanding": (
            "Firm attention paid to one hand with the other. Whether marma correspond to anything "
            "anatomically specific is not established; that the hands are densely innervated and easy to "
            "feel is not in question."
        ),
        "instructions": [
            "Take the left hand in the right.",
            "Press the web between thumb and index finger with your thumb. Hold for three breaths.",
            "Work along the centre of the palm, pausing wherever it feels tender.",
            "Draw down each finger from base to tip, once. Then swap hands.",
        ],
        "safety_note": "Press firmly but never into pain. Avoid pressing on injuries, wounds, or inflamed joints.",
    },
    {
        "practice_id": "micro-kaya-sthairyam",
        "title": "Kaya Sthairyam — Sixty Seconds of Stillness",
        "tradition": "ayurveda",
        "category": "Micro",
        "difficulty": "beginner",
        "time_min": 1,
        "seconds": 60,
        "cue": "Anywhere you are already sitting and waiting",
        "discreet": True,
        "origin_text": "Preparatory stage of Yoga Nidra and Antar Mouna in the tantric yoga lineages",
        "historical_context": (
            "Kaya sthairyam — steadiness of body — is the stage before the longer practices begin: the "
            "practitioner sits and does not move, and attends to the body doing nothing. It is treated as "
            "preparation rather than as practice in its own right, which is roughly how it is offered here."
        ),
        "modern_understanding": (
            "Sitting still on purpose and noticing the body. Sixty seconds of it is not long; deliberately "
            "not moving for sixty seconds is longer than it sounds."
        ),
        "instructions": [
            "Sit as you already are. Do not rearrange yourself.",
            "Decide not to move for one minute — no shifting, no scratching, no reaching for the phone.",
            "Move attention through the body: feet, legs, back, hands, shoulders, face.",
            "When the minute ends, notice where you wanted to move first.",
        ],
        "safety_note": (
            "If sitting still brings up distress, restlessness or difficult thoughts, stop and move. That "
            "is a reasonable response and not a failure of the practice."
        ),
    },
]
