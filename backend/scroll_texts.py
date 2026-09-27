"""The open scrolls: one chapter of the Daodejing for each early mark.

Each scroll opens on the practice day that matches its chapter number, so the
first months follow the book itself: chapter 1 on day one, chapter 81, the
last, on day eighty-one. Nobody is told the rule; it is there to be noticed.

Chinese is the received (Wang Bi) text. The English is Immortal's own
rendering. The commentary reports what the tradition said and what a day count
is; it never says what practice will do for anyone.

The later scrolls (day 100 onwards) are not here. They are sealed: see
cultivation.py and scroll_commitments.py.
"""

OPEN_SCROLLS = {
    "gate": {
        "zh": "道可道，非常道。名可名，非常名。……玄之又玄，眾妙之門。",
        "translation": (
            "The Way that can be told is not the constant Way. The name that can be named is not "
            "the constant name. … Dark upon dark: the gate of all mysteries."
        ),
        "body": [
            "The Daodejing begins by admitting that what it is about cannot be said, and then it ends "
            "its first chapter by naming a gate.",
            "The tradition's word for starting to practise is 入門, rùmén: entering the gate. That is "
            "all a first day is. It does not need to have felt like anything.",
            "The scrolls in Immortal open on days you practise, not on days that pass. The next one "
            "opens on your seventh.",
        ],
        "source": "Daodejing, chapter 1. Rendered for Immortal from the received text.",
    },
    "heaven-and-earth": {
        "zh": "天長地久。天地所以能長且久者，以其不自生，故能長生。",
        "translation": (
            "Heaven lasts long and earth endures. They can last and endure because they do not live "
            "for themselves. That is why they can live long."
        ),
        "body": [
            "This is one of the oldest sentences in Chinese about long life, and it is not advice "
            "about the body. Heaven and earth last, the chapter says, because they are not trying to.",
            "Seven days in, the useful part is small. Practice that is not straining toward a result "
            "is the kind that keeps going. Stand, breathe, stop. Come back tomorrow.",
            "The next scroll opens on your sixteenth day.",
        ],
        "source": "Daodejing, chapter 7. Rendered for Immortal from the received text.",
    },
    "root": {
        "zh": "致虛極，守靜篤。萬物並作，吾以觀復。夫物芸芸，各復歸其根。歸根曰靜。",
        "translation": (
            "Reach the utmost emptiness. Hold stillness steadily. The ten thousand things rise "
            "together, and I watch them return. However things flourish, each goes back to its root. "
            "Going back to the root is called stillness."
        ),
        "body": [
            "Later internal alchemists read this chapter as instructions, and its first two phrases "
            "became the posture of whole schools of seated practice.",
            "You do not have to read it that way. Sixteen days is enough to notice that your practice "
            "has a root of its own: a time of day, a place in the room, the first breath. That is the "
            "part to protect. The pine on your Today screen grows from it.",
            "The next scroll opens on your thirty-third day.",
        ],
        "source": "Daodejing, chapter 16. Rendered for Immortal from the received text.",
    },
    "not-perish": {
        "zh": "知人者智，自知者明。勝人者有力，自勝者強。知足者富。強行者有志。不失其所者久。死而不亡者壽。",
        "translation": (
            "Knowing others is cleverness; knowing yourself is clarity. Overcoming others takes "
            "force; overcoming yourself takes strength. Knowing what is enough is wealth. Keeping "
            "going is will. Not losing your place is lasting. To die and not perish: that is long life."
        ),
        "body": [
            "Read the last line twice. The Daodejing's long life, 壽 (shòu), is something that does "
            "not perish when the body does. Commentators have argued about what that is for two "
            "thousand years.",
            "One of the oldest copies of the book, written on silk and buried in a tomb at Mawangdui "
            "in 168 BCE, has a different character in that line: 死不忘者壽, to die and not be "
            "forgotten is long life.",
            "Immortal is built on that version. Nobody here will promise you more years. What you "
            "practise, and what you write down for the people who practise after you, can outlast "
            "you. That is what a lineage is for.",
        ],
        "source": (
            "Daodejing, chapter 33, with the Mawangdui silk manuscript's reading. Rendered for "
            "Immortal from the received text."
        ),
    },
    "deep-roots": {
        "zh": "治人事天，莫若嗇。……是謂深根固柢，長生久視之道。",
        "translation": (
            "In governing people and serving heaven, nothing is better than sparing. … This is "
            "called deep roots and a firm stem: the way of long life and lasting sight."
        ),
        "body": [
            "Now you know where the names come from. Everyone who takes a name in Immortal receives "
            "one character of this line, generation by generation: 深, deep, for the first 108; 根, "
            "root, for the next 1,080; then 固 firm, 柢 taproot, 長 long, 生 life, 久 lasting, 視 "
            "seeing, 之, and 道, the Way.",
            "Daoist orders have named their disciples this way for centuries. The Longmen lineage "
            "gives each generation one character of a hundred-character poem. Immortal's verse is "
            "ten characters long and each generation is ten times the size of the one before, so "
            "there is room in it for everyone alive.",
            "The chapter itself is about 嗇 (sè), sparing: the farmer who keeps back seed instead of "
            "spending all of it. It calls that the way of long life. Fifty-nine days is the "
            "beginning of a root.",
        ],
        "source": "Daodejing, chapter 59. Rendered for Immortal from the received text.",
    },
    "last-chapter": {
        "zh": "信言不美，美言不信。……聖人不積，既以為人己愈有，既以與人己愈多。",
        "translation": (
            "True words are not beautiful; beautiful words are not true. … The sage does not hoard. "
            "Having done everything for others, the sage has more. Having given everything to "
            "others, the sage has more still."
        ),
        "body": [
            "Eighty-one is nine nines, and the Daodejing ends here. Its last word on the matter is "
            "that what is given away is not lost.",
            "That is the other half of practice. At some point what you have learned belongs where "
            "another person can use it: a field note on a lineage, a caution, the adjustment that "
            "made standing possible for you.",
            "The First Pass opens on your hundredth day. It is the first sealed scroll. Its text is "
            "not in the app and not in Immortal's code; only its fingerprint is public.",
        ],
        "source": "Daodejing, chapter 81. Rendered for Immortal from the received text.",
    },
}
