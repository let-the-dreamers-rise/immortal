"""Full-length Ayurvedic and yogic practices.

The Ayurvedic side of the library was thin in three specific ways. It had no
movement practice at all, no meditation at all, and — most consequentially —
every entry was tagged `beginner`. A practitioner who chose the Ayurveda path
had nothing to grow into, which is the real reason the staged curriculum is
Daoist all the way through.

These twelve fill all three gaps and carry a genuine difficulty ladder:
four beginner, five intermediate, three advanced.

Same two rules as the micro set:

1. `modern_understanding` describes mechanism or sensation, never a health
   outcome. Where trial evidence genuinely exists it goes in `evidence_note`
   and is reported with its limitations rather than its headline.
2. Safety notes are written to the actual documented hazard, not to a generic
   "consult your doctor". Two practices here can injure or kill a careless
   practitioner and their notes say so plainly: Jala Neti (water-borne
   amoebic infection) and Kapalabhati (hyperventilation preceding retention).

DELIBERATELY EXCLUDED, per the exclusion screen in the dossier's Section 8:

  Kunjal / Vamana Dhauti (voluntary induced vomiting, practised regularly).
  It has a documented mechanism of harm — dental erosion, oesophageal injury
  and electrolyte disturbance — and a self-directed app has no way to screen
  for the eating-disorder history that makes repeated induced vomiting
  actively dangerous to teach. Excluded on mechanism, exactly as waidan and
  bigu are excluded on the Daoist side.
"""

AYURVEDA_PRACTICES = [
    # ---------------- BEGINNER ----------------
    {
        "practice_id": "surya-namaskar",
        "title": "Surya Namaskar — Salutation to the Sun",
        "tradition": "ayurveda",
        "category": "Movement",
        "difficulty": "beginner",
        "time_min": 15,
        "origin_text": "Modern sequence, codified early 20th c.; the salutation of the sun is far older in Indian devotional practice",
        "historical_context": (
            "The twelve-position sequence practised today was assembled and popularised in the early "
            "twentieth century — the Raja of Aundh promoted it through the 1920s and 30s, and Krishnamacharya's "
            "school carried it into the yoga that spread worldwide. The devotional salutation of the sun it "
            "draws on is genuinely ancient; the sequence of postures, as a fixed set, is not. Both things "
            "are true and the tradition is more interesting for saying so."
        ),
        "modern_understanding": (
            "A linked sequence of forward folds, back extensions and a plank, cycled with the breath. It "
            "moves the spine through most of its range and raises the heart rate modestly."
        ),
        "instructions": [
            "Stand at the front of the mat, palms together at the chest. Settle the breath first.",
            "Inhale, reach the arms overhead. Exhale, fold forward from the hips.",
            "Inhale, lengthen the spine halfway up. Exhale, step back to a plank, then lower.",
            "Inhale into a gentle back extension. Exhale, lift the hips into an inverted V. Rest five breaths.",
            "Step forward, fold, and rise on an inhale. That is one round. Begin with three; build slowly.",
        ],
        "safety_note": (
            "Fold from the hips rather than rounding the lower back. Avoid or heavily modify with disc "
            "problems, uncontrolled blood pressure, glaucoma or retinal conditions, late pregnancy, or "
            "recent abdominal or spinal surgery. Come out of any position that produces sharp pain."
        ),
    },
    {
        "practice_id": "bhramari",
        "title": "Bhramari — Humming Bee Breath",
        "tradition": "ayurveda",
        "category": "Pranayama",
        "difficulty": "beginner",
        "time_min": 10,
        "origin_text": "Hatha Yoga Pradipika (15th c.), II.68; Gheranda Samhita (17th c.)",
        "historical_context": (
            "Named for the humming of a black bee. The Hatha Yoga Pradipika places it among the eight "
            "retentions and describes the practitioner's mind dissolving into the sound. It is one of the "
            "few classical pranayama taught without caveat to beginners."
        ),
        "modern_understanding": (
            "A long, hummed exhalation. The out-breath becomes much longer than the in-breath simply "
            "because humming takes time, and the sound is felt as vibration in the skull."
        ),
        "instructions": [
            "Sit upright. Close the eyes. Rest the hands anywhere comfortable.",
            "Breathe in through the nose, unhurried and not to full capacity.",
            "Breathe out humming steadily — mouth closed, jaw loose, an even low note.",
            "Let the hum last as long as it lasts without straining. Then breathe in again.",
            "Continue for ten rounds, then sit for a minute in the quiet afterwards.",
        ],
        "safety_note": "Skip this with an ear infection or an ear condition. Do not force the hum or squeeze the throat.",
        "evidence_note": (
            "Small randomised trials have reported short-term reductions in blood pressure and heart rate "
            "after bhramari. The studies are mostly small, short, and unblinded — difficult to blind a "
            "humming practice — so they are suggestive rather than settled."
        ),
    },
    {
        "practice_id": "yoga-nidra",
        "title": "Yoga Nidra — Conscious Sleep",
        "tradition": "ayurveda",
        "category": "Meditation",
        "difficulty": "beginner",
        "time_min": 30,
        "origin_text": "Systematised by Swami Satyananda Saraswati (Bihar School of Yoga, 1960s) from tantric nyasa practice",
        "historical_context": (
            "The form practised today was assembled in the 1960s from older tantric practices of rotating "
            "awareness through the body — nyasa — and given a fixed sequence. The name is borrowed from the "
            "older literature, where it meant something closer to a yogic state than a technique."
        ),
        "modern_understanding": (
            "Lying still while attention is moved systematically through the body. Many people fall asleep "
            "during it, which the tradition treats as missing the point and most practitioners treat as fine."
        ),
        "instructions": [
            "Lie on your back, legs apart, palms up. Use a blanket — the body cools when it stops moving.",
            "Resolve to stay awake. State one short intention, the same words each time.",
            "Rotate attention through the body in a fixed order: right hand, arm, shoulder, then the left, then the back, front, head.",
            "Move to the breath: count breaths backward from twenty-seven without losing the thread.",
            "Return to the intention. Then move the fingers, and come back slowly.",
        ],
        "safety_note": (
            "Extended stillness with the eyes closed can surface distressing thoughts or memories. If that "
            "happens, open the eyes and sit up — stopping is a reasonable response, not a failure. Seek "
            "qualified support if it recurs."
        ),
    },
    {
        "practice_id": "ratricharya",
        "title": "Ratricharya — The Evening Routine",
        "tradition": "ayurveda",
        "category": "Daily Rhythm",
        "difficulty": "beginner",
        "time_min": 0,
        "origin_text": "Ashtanga Hridayam, Sutrasthana; the classical counterpart to dinacharya",
        "historical_context": (
            "The classical texts give the night its own regimen: eat earlier and lighter, wind down as "
            "light fails, oil the feet and scalp, sleep on the left side, and rise before dawn. It is the "
            "mirror of dinacharya and gets far less attention, largely because the morning routine is "
            "easier to sell."
        ),
        "modern_understanding": (
            "A wind-down sequence tied to falling light and an earlier, lighter evening meal. Much of it "
            "overlaps with what sleep researchers now recommend, which is interesting but not evidence "
            "that the classical reasoning was right."
        ),
        "instructions": [
            "Finish eating two to three hours before sleeping. Keep the evening meal lighter than the midday one.",
            "As the light goes, dim yours. Reduce screens where you reasonably can.",
            "Oil the soles of the feet, and the scalp if you like — a minute is enough.",
            "Keep a consistent sleeping time, including at weekends.",
            "Rise before sunrise. The tradition calls the pre-dawn window brahma muhurta and treats it as the clearest hour.",
        ],
        "safety_note": None,
    },

    # ---------------- INTERMEDIATE ----------------
    {
        "practice_id": "sheetali-sheetkari",
        "title": "Sheetali & Sheetkari — The Cooling Breaths",
        "tradition": "ayurveda",
        "category": "Pranayama",
        "difficulty": "intermediate",
        "time_min": 10,
        "origin_text": "Hatha Yoga Pradipika II.54-57; Gheranda Samhita",
        "historical_context": (
            "Two related practices that draw breath across a wet tongue. Sheetali rolls the tongue into a "
            "tube; sheetkari draws air through the teeth for those who cannot roll it — the texts supply "
            "the alternative themselves, which is unusually practical of them. Both are prescribed for heat, "
            "and in India they are summer practices."
        ),
        "modern_understanding": (
            "Air drawn over a moist surface arrives cooler by evaporation. The sensation of cooling in the "
            "mouth and throat is immediate and unmistakable; whether it changes core temperature is a "
            "different and much weaker claim."
        ),
        "instructions": [
            "Sit upright. For sheetali, roll the tongue lengthwise into a tube and let it protrude slightly.",
            "If the tongue will not roll — it is partly genetic — use sheetkari instead: teeth lightly together, lips parted, draw air across the teeth.",
            "Breathe in slowly through the tube or the teeth. Feel the coolness.",
            "Close the mouth. Breathe out slowly through the nose.",
            "Nine rounds. Stop sooner if the throat feels dry or irritated.",
        ],
        "safety_note": (
            "Avoid in cold weather, with a respiratory infection, asthma, chronic bronchitis, or low blood "
            "pressure. Do not practise with cold air or in air conditioning directly on you."
        ),
    },
    {
        "practice_id": "antar-mouna",
        "title": "Antar Mouna — Inner Silence",
        "tradition": "ayurveda",
        "category": "Meditation",
        "difficulty": "intermediate",
        "time_min": 20,
        "origin_text": "Tantric practice systematised by the Bihar School of Yoga; related to the Vijnana Bhairava Tantra",
        "historical_context": (
            "A staged practice of watching the mind rather than stilling it. The stages move from noticing "
            "sense impressions, to watching spontaneous thoughts without interference, to deliberately "
            "producing and dropping thoughts, and finally to the gap between them. It is explicitly "
            "sequential and the texts warn against skipping ahead."
        ),
        "modern_understanding": (
            "Open-monitoring attention, staged. The third phase — creating a thought deliberately and then "
            "dropping it — is the part with no obvious counterpart in most modern meditation instruction."
        ),
        "instructions": [
            "Sit comfortably, eyes closed. Spend two minutes simply hearing whatever sounds arrive.",
            "Turn to thoughts. Watch whatever comes without following it and without pushing it away.",
            "Now produce a thought on purpose. Hold it. Let it go. Repeat, so that arising is something you do rather than something done to you.",
            "Then stop producing. Watch the space where thoughts were.",
            "Close by returning to sound, then to the body, then open the eyes.",
        ],
        "safety_note": (
            "Watching the mind closely can surface difficult material. Stop and open the eyes if it becomes "
            "distressing. Not advisable during acute psychological crisis, and speak to a professional first "
            "if you have a history of psychosis, dissociation, or severe trauma."
        ),
    },
    {
        "practice_id": "trataka",
        "title": "Trataka — Steady Gazing",
        "tradition": "ayurveda",
        "category": "Meditation",
        "difficulty": "intermediate",
        "time_min": 15,
        "origin_text": "Hatha Yoga Pradipika II.31-32; Gheranda Samhita I.53-54 — listed among the shatkarma",
        "historical_context": (
            "Classified in the classical texts not as meditation but as a cleansing practice — one of the "
            "six shatkarma. The instruction is to gaze without blinking at a small point until the eyes "
            "water, then to close them and hold the after-image. A lamp flame is traditional; a dot on a "
            "wall works and is safer."
        ),
        "modern_understanding": (
            "Sustained fixation on a small target, followed by attention to the after-image. The watering "
            "of the eyes is simply what happens when you stop blinking."
        ),
        "instructions": [
            "Place a candle flame or a small dot at eye level, roughly an arm's length away.",
            "Sit still and gaze at it without blinking for as long as is comfortable — begin with thirty seconds.",
            "When the eyes water or strain, close them and watch the after-image until it fades.",
            "Repeat twice more. Finish by palming the closed eyes with warmed hands.",
            "Build the gazing time slowly over weeks. There is no prize for forcing it.",
        ],
        "safety_note": (
            "Do not practise with glaucoma, a retinal condition, or recent eye surgery. Avoid the candle "
            "version entirely if you have epilepsy or are photosensitive — use a static dot. Stop if the "
            "eyes ache rather than simply water."
        ),
    },
    {
        "practice_id": "jala-neti",
        "title": "Jala Neti — Nasal Cleansing",
        "tradition": "ayurveda",
        "category": "Cleansing",
        "difficulty": "intermediate",
        "time_min": 10,
        "origin_text": "Gheranda Samhita I.57-58 — among the shatkarma",
        "historical_context": (
            "Rinsing the nasal passages with salted water using a small spouted pot. Described in the "
            "Gheranda Samhita as a cleansing practice preparing the body for pranayama, and still part of "
            "daily routine for many practitioners in India."
        ),
        "modern_understanding": (
            "Saline nasal irrigation. This is one of the few practices in this library that has crossed "
            "fully into conventional medicine — it is routinely recommended by ENT specialists for "
            "rhinitis and sinus congestion."
        ),
        "instructions": [
            "Use ONLY distilled, sterile, or previously boiled and cooled water. Read the safety note before you do anything else.",
            "Dissolve about a quarter-teaspoon of non-iodised salt in 250ml of lukewarm water.",
            "Lean forward over a basin, head tilted to one side. Breathe through the open mouth throughout.",
            "Pour into the upper nostril and let the water run out of the lower one.",
            "Repeat on the other side. Then clear the nose gently — blow softly, never hard.",
        ],
        "safety_note": (
            "NEVER use untreated tap water. Fatal amoebic infections (Naegleria fowleri) have been caused "
            "by nasal irrigation with contaminated tap water. Use distilled, sterile, or boiled-and-cooled "
            "water only, every single time. Do not practise with a blocked nose, an ear infection, a "
            "perforated eardrum, a recent nosebleed, or after nasal or ear surgery. Blowing hard afterwards "
            "can drive water into the ears."
        ),
        "evidence_note": (
            "Saline nasal irrigation has reasonable trial support for chronic rhinosinusitis symptoms and "
            "is recommended in several clinical guidelines — a rare case here of a traditional practice "
            "adopted more or less intact by conventional medicine. That support is specific to sinus symptoms in people who have them; no trial extends it to general wellbeing."
        ),
    },
    {
        "practice_id": "jalandhara-mula-bandha",
        "title": "Jalandhara & Mula Bandha — The Locks",
        "tradition": "ayurveda",
        "category": "Internal",
        "difficulty": "intermediate",
        "time_min": 15,
        "origin_text": "Hatha Yoga Pradipika III.55-82; Gheranda Samhita III",
        "historical_context": (
            "Bandha means bond or lock. The classical texts describe them as ways of containing energy "
            "rather than letting it disperse — jalandhara at the throat, mula at the pelvic floor, uddiyana "
            "at the abdomen. They are taught as the gateway to advanced pranayama and are almost never "
            "taught first."
        ),
        "modern_understanding": (
            "Deliberate, isolated engagement of the pelvic floor and a chin-to-chest flexion of the neck. "
            "Mula bandha is a pelvic floor contraction; finding it precisely, without also gripping the "
            "abdomen or buttocks, is the whole skill."
        ),
        "instructions": [
            "Sit upright, spine long, hands on the knees.",
            "Jalandhara: breathe in, then lower the chin toward the notch at the top of the sternum, lifting the sternum slightly to meet it.",
            "Mula bandha: draw up the pelvic floor — the perineum specifically, not the buttocks or belly.",
            "Hold both gently while the breath is comfortably in. Release the chin before you breathe out.",
            "Rest a full breath between rounds. Five rounds is plenty.",
        ],
        "safety_note": (
            "Only hold the breath for as long as is entirely comfortable — release at the first urge. "
            "Avoid with uncontrolled blood pressure, heart conditions, glaucoma, raised intracranial "
            "pressure, neck injury, or during pregnancy. Release everything immediately if you feel "
            "pressure in the head."
        ),
    },

    # ---------------- ADVANCED ----------------
    {
        "practice_id": "kapalabhati",
        "title": "Kapalabhati — Skull-Shining Breath",
        "tradition": "ayurveda",
        "category": "Pranayama",
        "difficulty": "advanced",
        "time_min": 12,
        "origin_text": "Gheranda Samhita I.55 — among the shatkarma; Hatha Yoga Pradipika II.35",
        "historical_context": (
            "A rapid series of forceful exhalations driven from the abdomen, the inhalations passive. The "
            "classical texts group it with the cleansing practices rather than the pranayama, and place it "
            "well into the sequence — after the body has been prepared, never at the start."
        ),
        "modern_understanding": (
            "Forceful rapid breathing. It lowers blood carbon dioxide, which is what produces the "
            "light-headedness and tingling many practitioners report and mistake for an effect of the "
            "practice rather than a symptom of the mechanism."
        ),
        "instructions": [
            "Sit upright. Breathe normally first and establish a steady base.",
            "Exhale sharply through the nose by contracting the lower abdomen. Let the in-breath happen by itself.",
            "Begin at about one per second. Twenty strokes, then stop completely.",
            "Breathe normally for a full minute before the next round. Three rounds at most.",
            "Read the safety note before attempting this. It is the most hazardous practice in this library.",
        ],
        "safety_note": (
            "NEVER follow kapalabhati with a breath hold. Rapid breathing before retention delays the urge "
            "to breathe without adding oxygen, so consciousness can be lost before any warning arrives — "
            "this is the mechanism behind hypoxic blackout, and it has killed experienced practitioners in "
            "water. Never practise near water or before driving. Avoid entirely with pregnancy, high or "
            "uncontrolled blood pressure, heart disease, stroke history, epilepsy, glaucoma or retinal "
            "detachment, hernia, ulcers, or recent abdominal surgery. Stop at once if you feel dizzy or "
            "your hands tingle."
        ),
    },
    {
        "practice_id": "uddiyana-bandha",
        "title": "Uddiyana Bandha — The Upward Lock",
        "tradition": "ayurveda",
        "category": "Internal",
        "difficulty": "advanced",
        "time_min": 15,
        "origin_text": "Hatha Yoga Pradipika III.55-60; Gheranda Samhita III.10-12",
        "historical_context": (
            "Uddiyana means flying up. After a complete exhalation, the abdomen is drawn back and up under "
            "the ribcage while the breath is held out. The Pradipika calls it the lion that conquers the "
            "elephant of death, which is the register these texts write in and not a claim this application "
            "makes."
        ),
        "modern_understanding": (
            "With the lungs empty and the glottis closed, expanding the ribcage lowers pressure in the "
            "chest and the abdominal contents move upward. The hollow under the ribs is a mechanical "
            "consequence of that, not an effort of the abdominal muscles."
        ),
        "instructions": [
            "Practise only on a completely empty stomach — first thing in the morning is traditional and sensible.",
            "Stand with feet apart, knees bent, hands on the thighs. Or sit upright.",
            "Breathe out completely. Then close the throat and do not breathe in.",
            "Expand the ribcage as though inhaling. The abdomen draws up and back on its own.",
            "Hold only as long as is entirely comfortable. Release the abdomen first, then the throat, then breathe in.",
        ],
        "safety_note": (
            "Empty stomach only — at least four hours after eating. Avoid entirely with pregnancy, "
            "menstruation, hernia, ulcers, heart disease, uncontrolled blood pressure, glaucoma, or recent "
            "abdominal or thoracic surgery. Release immediately at any pain or urge to breathe. Never "
            "combine with kapalabhati in the same round."
        ),
    },
    {
        "practice_id": "ajapa-japa",
        "title": "Ajapa Japa — So-Ham",
        "tradition": "ayurveda",
        "category": "Meditation",
        "difficulty": "advanced",
        "time_min": 25,
        "origin_text": "Tantric and Nath lineages; the so-ham breath described across the hatha and tantric literature",
        "historical_context": (
            "Ajapa means unrepeated — the mantra said to be sounding already in the breath itself, so that "
            "the practitioner notices it rather than produces it. So on the in-breath, ham on the out. It "
            "is placed late in most curricula because it requires the attention built by everything before it."
        ),
        "modern_understanding": (
            "Sustained attention on the breath with a silent syllable attached to each phase. The claim "
            "that the sound is already present in the breath is a teaching device, and a good one."
        ),
        "instructions": [
            "Sit upright, eyes closed. Let the breath settle without managing it.",
            "Follow the breath's passage between the navel and the throat, up and down, for several minutes.",
            "Add the sound: so as the breath rises, ham as it falls. Silently — never aloud.",
            "Do not impose a rhythm. Let the sound attach to the breath that is already happening.",
            "When attention wanders, return without comment. Twenty minutes, then sit quietly before moving.",
        ],
        "safety_note": (
            "Long sittings can surface difficult psychological material. Stop if it becomes distressing. "
            "Speak to a qualified professional before extended practice if you have a history of psychosis, "
            "dissociation, or severe trauma."
        ),
    },
]
