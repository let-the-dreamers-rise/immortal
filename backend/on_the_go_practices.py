"""On-the-go practices — done while moving, not while waiting.

The micro-practices are things you do while stationary and waiting: in a
queue, at a desk, on hold. This is the other half of the same problem. Most of
a person's unclaimed time is spent walking somewhere or standing in transit,
and until now the library had nothing for it.

Weighted Daoist, because the walking practices are where the Chinese tradition
is genuinely distinctive — xingqi literally means moving or travelling qi, and
coordinating breath to footfall is documented practice rather than a modern
convenience. The one Ayurvedic entry is here because shatapavali is classical
advice that happens to be the single most practical thing in either tradition.

Same two rules as the rest of the library:

1. `modern_understanding` describes mechanism or sensation, never outcome.
2. Safety notes address the real hazard. For everything here that hazard is
   the same and it is not exotic: attention turned inward while moving through
   traffic. Every entry says so.

Extra fields:
  seconds     — duration where it is short; `minutes_typical` where it is not
  cue         — the moving moment this attaches to
  on_the_go   — True; distinguishes these from the seated micro set
  eyes_open   — always True here, and stated, because it is the safety point
"""

ON_THE_GO_PRACTICES = [
    # ---------------- DAO ----------------
    {
        "practice_id": "otg-xing-gong",
        "title": "Xing Gong — Walking Practice",
        "tradition": "dao",
        "category": "On the Go",
        "difficulty": "beginner",
        "time_min": 10,
        "cue": "Any walk you were already taking",
        "on_the_go": True,
        "eyes_open": True,
        "origin_text": "Xingqi (行氣, 'moving the qi') appears in the Mawangdui and Zhangjiashan manuscripts; walking forms systematised in the 20th c., notably Guo Lin's",
        "historical_context": (
            "The character xing means to walk or travel, and xingqi — moving the qi — is among the oldest "
            "named practices in the Chinese corpus. Walking forms of qigong were formalised much later; "
            "the best known was developed by Guo Lin in the 1970s and spread widely through public parks. "
            "The old texts and the modern form are separated by two thousand years and it is worth not "
            "collapsing them."
        ),
        "modern_understanding": (
            "Walking at a deliberate, even pace with attention on the breath and the soles of the feet. "
            "It is a walk you were taking anyway, done less absently."
        ),
        "instructions": [
            "Walk at a pace slightly slower than your habit. Let the arms swing freely.",
            "Let the breath settle into the walk rather than forcing it to match.",
            "Put attention in the soles of the feet — the contact and release of each step.",
            "When the mind wanders, return to the feet. It will wander often; that is the practice.",
            "Keep the eyes up and open, on the path ahead. This is not an eyes-lowered practice.",
        ],
        "safety_note": (
            "Eyes open and on your surroundings throughout. Do not practise while crossing roads, on "
            "stairs, or anywhere with traffic. Attention turned inward while moving is how people walk "
            "into things."
        ),
    },
    {
        "practice_id": "otg-breath-and-step",
        "title": "Breath and Step",
        "tradition": "dao",
        "category": "On the Go",
        "difficulty": "beginner",
        "time_min": 5,
        "cue": "Walking to class, to the station, anywhere with a steady pace",
        "on_the_go": True,
        "eyes_open": True,
        "origin_text": "Coordination of breath and movement is foundational across Daoyin and Qi Gong; the step-count form is a modern teaching device",
        "historical_context": (
            "Matching breath to movement runs through the whole Chinese tradition — every brocade of Ba "
            "Duan Jin has a breath attached to it. Counting footsteps specifically is a modern teaching "
            "convenience rather than a classical instruction, and is offered here as one."
        ),
        "modern_understanding": (
            "Breathing on a fixed count of steps, which lengthens the breath because walking sets a slower "
            "rhythm than breathing usually does. The longer out-breath is the part most likely to be "
            "doing anything."
        ),
        "instructions": [
            "Walk at your ordinary pace. Do not slow down for this.",
            "Breathe in over four steps. Breathe out over four steps.",
            "When that is easy, lengthen the exhalation: in for four, out for six.",
            "If you run short of air, the count is too long — shorten it. There is no correct number.",
            "Two or three minutes is enough. Then stop counting and let the breath go back to itself.",
        ],
        "safety_note": (
            "Never hold the breath while walking. If you feel light-headed, stop counting and breathe "
            "normally. Eyes up and on the path throughout."
        ),
    },
    {
        "practice_id": "otg-standing-in-transit",
        "title": "Standing in Transit",
        "tradition": "dao",
        "category": "On the Go",
        "difficulty": "beginner",
        "time_min": 5,
        "cue": "Standing on a bus, a train, or in any queue that has stopped moving",
        "on_the_go": True,
        "eyes_open": True,
        "origin_text": "Adapted from Zhan Zhuang (站樁, 'standing like a post'), documented in the internal martial and Qi Gong traditions",
        "historical_context": (
            "Zhan Zhuang is standing still in a held posture — minutes to hours in the serious lineages, "
            "and treated as foundational training in the internal martial arts. This is a much reduced "
            "version that fits somewhere you are already standing and cannot adopt a posture without "
            "being looked at."
        ),
        "modern_understanding": (
            "Standing with knees unlocked and weight distributed, attending to balance. On a moving "
            "vehicle the constant small corrections become very obvious, which is most of the interest."
        ),
        "instructions": [
            "Stand with feet roughly hip-width, weight even between both.",
            "Unlock the knees — soft, not bent. Most people stand with them locked.",
            "Let the tailbone drop slightly and the crown lift. The spine lengthens between the two.",
            "Let the shoulders fall away from the ears. Breathe into the belly.",
            "Notice the small corrections your body makes as the vehicle moves. Do not fight them.",
        ],
        "safety_note": (
            "Hold a rail on a moving vehicle. Unlocked knees make you more stable, not less, but do not "
            "close your eyes and do not do this standing near doors or stairs."
        ),
    },
    {
        "practice_id": "otg-wang-yuan",
        "title": "Wang Yuan — Gazing Into the Distance",
        "tradition": "dao",
        "category": "On the Go",
        "difficulty": "beginner",
        "time_min": 3,
        "cue": "Any walk outdoors, or a window seat",
        "on_the_go": True,
        "eyes_open": True,
        "origin_text": "Eye care in Sun Simiao's Qianjin Fang (652 CE); distance gazing retained in modern Chinese eye routines",
        "historical_context": (
            "Sun Simiao's regimen treats the eyes as something to be maintained rather than merely used, "
            "and looking to the far distance is its simplest instruction. It survives in the eye "
            "exercises taught in Chinese schools, where it follows the palming."
        ),
        "modern_understanding": (
            "Letting the eyes focus at distance after hours of near work, and letting the gaze be wide "
            "rather than pointed. Whether this relieves eye strain is contested; that it is different "
            "from looking at a screen is not."
        ),
        "instructions": [
            "While walking outdoors, lift the gaze to the furthest thing you can see.",
            "Let the focus rest there rather than scanning.",
            "Now soften the gaze — take in the edges of your vision without moving the eyes.",
            "Hold the wide gaze for a minute of walking. Peripheral awareness keeps you safer, not less safe.",
            "Return to ordinary looking. Repeat once or twice on a longer walk.",
        ],
        "safety_note": (
            "Keep enough attention on the ground and on traffic. Do not practise while crossing roads. "
            "Skip this if you have a visual condition that makes changing focus uncomfortable."
        ),
    },

    # ---------------- AYURVEDA ----------------
    {
        "practice_id": "otg-shatapavali",
        "title": "Shatapavali — A Hundred Steps",
        "tradition": "ayurveda",
        "category": "On the Go",
        "difficulty": "beginner",
        "time_min": 10,
        "cue": "Immediately after a meal",
        "on_the_go": True,
        "eyes_open": True,
        "origin_text": "Classical dinacharya instruction; shatapavali — 'a hundred steps' after eating",
        "historical_context": (
            "The classical daily routine instructs a short, slow walk after the main meal — a hundred "
            "steps, taken gently, not as exercise. It is among the most concrete and least mystical "
            "instructions in the whole corpus, which may be why it has survived unchanged in Indian "
            "households that follow none of the rest."
        ),
        "modern_understanding": (
            "A short slow walk after eating. Light post-meal walking is one of the better-supported "
            "behavioural findings in modern nutrition research, which is a rare and genuine convergence "
            "rather than a retrofit."
        ),
        "instructions": [
            "After your main meal, walk for about a hundred steps — roughly five to ten minutes.",
            "Walk slowly. This is deliberately not exercise and should not raise your breathing.",
            "Keep it gentle: no stairs, no hurrying, no carrying anything heavy.",
            "Then sit, or continue with your day. Do not lie down straight after eating.",
        ],
        "safety_note": (
            "Keep the pace slow — vigorous exercise straight after a large meal can cause discomfort or "
            "reflux. Stop if you feel unwell."
        ),
        "evidence_note": (
            "Short light walks after meals have reasonable support in trials for blunting post-meal "
            "blood-glucose rises. Most studies are small and in specific populations, so the size of the "
            "effect for any individual is uncertain — but the direction is consistent."
        ),
    },
]
