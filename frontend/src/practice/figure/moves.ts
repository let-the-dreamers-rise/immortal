// Movements as short loops of poses, and which movement goes with each step
// of each practice. A step with no entry (diet, sleep, seasonal living) shows
// no figure, because there is nothing to watch.
import type { Focus, Pose } from "./geometry";
import * as P from "./poses";

export type Key = {
  pose: Pose;
  /** Seconds to move from the previous pose into this one. */
  secs: number;
  /** A word shown under the figure while this pose is reached, e.g. "Breathe in". */
  cue?: string;
};
export type Move = readonly Key[];

const k = (pose: Pose, secs: number, cue?: string): Key => ({ pose, secs, cue });
const at = (pose: Pose, focus: Focus, glow: number, along = 0): Pose => ({ ...pose, focus, glow, along });

/** A breath cycle: attention brightens on the in-breath and settles on the out-breath. */
function breath(pose: Pose, focus: Focus = "dantian", inSecs = 4, outSecs = 5): Move {
  return [k(at(pose, focus, 1), inSecs, "Breathe in"), k(at(pose, focus, 0.25), outSecs, "Breathe out")];
}

const still = (pose: Pose): Move => [k(pose, 3), k(pose, 3)];

function travel(pose: Pose, focus: Focus, upCue: string, downCue?: string, secs = 5): Move {
  return downCue
    ? [k(at(pose, focus, 0.9, 0), 1, downCue), k(at(pose, focus, 0.9, 1), secs, upCue), k(at(pose, focus, 0.9, 0), secs, downCue)]
    : [k(at(pose, focus, 0.9, 0), 1), k(at(pose, focus, 0.9, 1), secs, upCue)];
}

const walk: Move = [k(P.walkA, 0.6), k(P.walkB, 0.6)];
const walkAt = (focus: Focus, glow = 0.8): Move => [k(at(P.walkA, focus, glow), 0.6), k(at(P.walkB, focus, glow), 0.6)];

export const MOVES = {
  standSoft: still(P.standSoft),
  handsOnBelly: breath(P.handsOnBelly, "dantian", 4, 5),
  neckRoll: [k(P.lookLeft, 2.5), k(P.standSoft, 2), k(P.lookRight, 2.5), k(P.standSoft, 2), k(P.shrugUp, 1.5), k(P.standSoft, 1.5)],
  foldSlow: [k(P.standWide, 2), k(P.halfFold, 3), k(P.fold, 3), k(P.halfFold, 3), k(P.standWide, 3)],
  stretchFlow: [k(P.standWide, 2), k(P.armsUp, 3, "Breathe in"), k(P.deerLeft, 3, "Breathe out"), k(P.armsUp, 3, "Breathe in"), k(P.deerRight, 3, "Breathe out")],

  holdHeavens: [k(P.standWide, 2), k(P.palmsAtChest, 2.5, "Breathe in"), k(P.armsUp, 2.5), k(P.standWide, 4, "Breathe out")],
  drawBow: [k(P.horse, 2), k(P.bowLeft, 3, "Draw left"), k(P.horse, 2), k(P.bowRight, 3, "Draw right")],
  separate: [k(P.standWide, 2), k(P.separateLeft, 3, "Left hand up"), k(P.standWide, 2), k(P.separateRight, 3, "Right hand up")],
  wiseOwl: [k(P.standWide, 2), k(P.lookLeft, 3, "Turn on the out-breath"), k(P.standWide, 2.5), k(P.lookRight, 3, "Turn on the out-breath"), k(P.standWide, 2.5)],
  swayTail: [k(P.horse, 2), k(P.swayLeft, 3), k(P.horse, 2), k(P.swayRight, 3)],
  reachFeet: [k(P.standWide, 2), k(P.armsUp, 2.5), k(P.halfFold, 2.5), k(P.fold, 2.5), k(P.halfFold, 2.5), k(P.standWide, 2.5)],
  punch: [k(P.horse, 2), k(P.punchLeft, 1.4, "Left"), k(P.horse, 1.6), k(P.punchRight, 1.4, "Right"), k(P.horse, 1.6)],
  heels: [k(P.stand, 1), k(P.heelsUp, 1, "Rise"), k(P.stand, 0.5, "Drop")],

  tiger: [k(P.standWide, 2), k(P.tigerReach, 2.5), k(P.tigerDown, 2.5), k(P.standWide, 2)],
  deer: [k(P.standWide, 2), k(P.deerLeft, 3), k(P.standWide, 2), k(P.deerRight, 3)],
  bear: [k(P.bearLeft, 3), k(P.bearRight, 3)],
  monkey: [k(P.stand, 1.2), k(P.monkeyLeft, 1.2), k(P.stand, 1.2), k(P.monkeyRight, 1.2)],
  crane: [k(P.stand, 2), k(P.craneLeft, 3), k(P.stand, 2), k(P.craneRight, 3)],
  frolic: [k(P.tigerReach, 2), k(P.deerLeft, 2), k(P.bearRight, 2), k(P.monkeyLeft, 1.5), k(P.craneLeft, 2.5), k(P.stand, 2)],

  standWide: still(P.standWide),
  holdBall: [k(P.standWide, 2), k(P.holdBall, 3), k(P.holdBall, 6)],
  holdBallTall: [k(P.holdBallCrown, 3), k({ ...P.holdBallCrown, glow: 0.3 }, 3)],
  holdBallBreath: breath(P.holdBall, "dantian", 4, 5),

  seatedStill: still(P.seated),
  seatedBreath: breath(P.seated, "dantian"),
  seatedChestToBelly: [k(at(P.seated, "chest", 0.9), 4, "Breathe in"), k(at(P.seated, "dantian", 0.9), 5, "Breathe out")],
  seatedHandBelly: breath(P.seatedBelly, "dantian", 4, 5),
  longBreath: breath(P.seatedBelly, "dantian", 5, 8),
  shortBreath: breath(P.seatedBelly, "dantian", 3, 3),
  seatedRubOpen: [k(P.seatedPalmsTogether, 1.5), k(P.seatedRubA, 0.3), k(P.seatedRubB, 0.3), k(P.seatedRubA, 0.3), k(P.seatedRubB, 0.3), k(P.seatedEyes, 2), k(P.seated, 2)],
  crown: breath(P.seated, "crown", 4, 5),
  bodyScan: travel(P.seated, "spine", "Crown", "Feet", 8),
  orbitUp: travel(P.seated, "spine", "Up the back", undefined, 5),
  orbitFull: travel(P.seated, "spine", "Up the back", "Down the front", 5),

  armTrace: [k(at(P.palmsAtChest, "arms", 0.9, 0), 1), k(at({ ...P.bowLeft, drop: 6 }, "arms", 0.9, 1), 5, "Along the arm"), k(at(P.standSoft, "arms", 0.3, 0), 3)],
  armBreath: [k(P.standSoft, 2), k(P.palmsAtChest, 4, "Breathe in"), k(P.standSoft, 5, "Breathe out")],

  mouth: [k(at(P.seated, "mouth", 0.8), 2), k(at(P.seated, "mouth", 0.4), 2)],
  teethTap: [k(at(P.seated, "mouth", 1), 0.5, "Tap"), k(at(P.seated, "mouth", 0.3), 0.5)],
  swallow: [k(at(P.seated, "mouth", 1), 1.5), k(at(P.seated, "chest", 0.9), 1.5, "Swallow"), k(at(P.seated, "dantian", 0.9), 2)],
  palmsTogether: still(P.seatedPalmsTogether),
  rubHands: [k(P.seatedRubA, 0.25), k(P.seatedRubB, 0.25)],
  palmsApart: [k(P.seatedPalmsApart, 2), k({ ...P.seatedPalmsApart, glow: 0.4 }, 3)],
  eyesCover: breath(P.seatedEyes, "eyes", 4, 5),
  lookFar: [k(at(P.seated, "eyes", 0.8), 3, "Look far"), k(at(P.seated, "eyes", 0.4), 3)],
  owl: [k(P.seated, 2), k(P.seatedOwlLeft, 3, "Out-breath, turn"), k(P.seated, 3, "In-breath, centre"), k(P.seatedOwlRight, 3, "Out-breath, turn"), k(P.seated, 3, "In-breath, centre")],
  dropShoulders: [k({ ...P.seated, shrug: 1 }, 2), k(P.seated, 3, "Let them drop")],
  threeBreaths: [...breath(P.seatedBelly, "dantian", 4, 6), ...breath(P.seatedBelly, "dantian", 4, 6), ...breath(P.seatedBelly, "dantian", 4, 6)],

  walk,
  walkSoles: walkAt("soles"),
  walkEyes: walkAt("eyes", 0.7),
  walkBreath44: [
    ...[1, 2, 3, 4].map((n) => k(n % 2 ? P.walkA : P.walkB, 0.6, `In ${n}`)),
    ...[1, 2, 3, 4].map((n) => k(n % 2 ? P.walkA : P.walkB, 0.6, `Out ${n}`)),
  ],
  walkBreath46: [
    ...[1, 2, 3, 4].map((n) => k(n % 2 ? P.walkA : P.walkB, 0.6, `In ${n}`)),
    ...[1, 2, 3, 4, 5, 6].map((n) => k(n % 2 ? P.walkA : P.walkB, 0.6, `Out ${n}`)),
  ],
  transitKnees: [k(P.stand, 2, "Locked"), k(P.standSoft, 2, "Soft"), k(P.standSoft, 2)],
  transitTall: [k(P.standSoft, 2), k(at(P.standSoft, "crown", 0.9), 3, "Crown lifts"), k(at(P.standSoft, "crown", 0.3), 3)],
  transitShoulders: [k(P.shrugUp, 2), k(at(P.standSoft, "dantian", 0.8), 3, "Breathe into the belly")],
  transitSway: [k({ ...P.standSoft, tilt: -3 }, 2), k({ ...P.standSoft, tilt: 3 }, 2)],
} satisfies Record<string, Move>;

export type MoveId = keyof typeof MOVES;

// One entry per step, in the order the practice lists its steps.
export const PRACTICE_MOVES: Record<string, readonly MoveId[]> = {
  daoyin: ["standSoft", "neckRoll", "foldSlow", "stretchFlow", "handsOnBelly"],
  "ba-duan-jin": ["holdHeavens", "drawBow", "separate", "wiseOwl", "swayTail", "reachFeet", "punch", "heels"],
  "wu-qin-xi": ["tiger", "deer", "bear", "monkey", "crane", "frolic"],
  "shun-hu-xi": ["seatedStill", "seatedBreath", "seatedBreath", "seatedChestToBelly", "seatedBreath"],
  "abdominal-breathing": ["seatedHandBelly", "seatedHandBelly", "seatedHandBelly", "seatedHandBelly", "seatedHandBelly"],
  "long-breath": ["seatedHandBelly", "longBreath", "longBreath", "shortBreath", "longBreath"],
  "zhan-zhuang": ["standWide", "holdBall", "holdBallTall", "holdBallBreath", "holdBall"],
  jinggong: ["seatedStill", "seatedStill", "seatedBreath", "seatedBreath", "seatedRubOpen"],
  "meridian-qigong": ["standSoft", "armTrace", "armBreath", "armTrace", "handsOnBelly"],
  "deep-body-awareness": ["seatedBreath", "bodyScan", "bodyScan", "seatedStill", "seatedBreath"],
  "dantian-breathing": ["seatedStill", "seatedBreath", "seatedBreath", "seatedBreath", "seatedBreath"],
  "microcosmic-orbit": ["seatedStill", "seatedBreath", "orbitUp", "orbitFull", "orbitFull"],
  "three-treasures": ["seatedStill", "seatedBreath", "crown", "seatedBreath", "seatedStill"],
  "extended-sitting": ["seatedStill", "seatedStill", "seatedBreath", "seatedStill", "seatedStill"],
  "micro-kou-chi": ["mouth", "teethTap", "teethTap", "mouth"],
  "micro-yan-jin": ["mouth", "mouth", "swallow", "swallow"],
  "micro-laogong": ["palmsTogether", "rubHands", "palmsApart", "palmsApart"],
  "micro-eye-rest": ["rubHands", "eyesCover", "eyesCover", "lookFar"],
  "micro-wise-owl": ["dropShoulders", "owl", "owl", "owl"],
  "micro-dantian-breaths": ["seatedHandBelly", "seatedHandBelly", "longBreath", "threeBreaths"],
  "otg-xing-gong": ["walk", "walk", "walkSoles", "walkSoles", "walkEyes"],
  "otg-breath-and-step": ["walk", "walkBreath44", "walkBreath46", "walkBreath44", "walk"],
  "otg-standing-in-transit": ["standSoft", "transitKnees", "transitTall", "transitShoulders", "transitSway"],
  "otg-wang-yuan": ["walkEyes", "walkEyes", "walkEyes", "walkEyes", "walk"],
};

/** The movement for a step, or null when the practice has nothing to show. */
export function moveFor(practiceId: string, step: number): Move | null {
  const list = PRACTICE_MOVES[practiceId];
  if (!list || list.length === 0) return null;
  return MOVES[list[Math.min(step, list.length - 1)]];
}

export function moveLength(move: Move): number {
  return move.reduce((s, key) => s + key.secs, 0);
}

/**
 * Where a looping move is at time `t` seconds: the pose to blend from, the
 * pose to blend to, how far between them, and the cue to show.
 */
export function sample(move: Move, t: number): { from: Pose; to: Pose; progress: number; cue?: string } {
  const total = moveLength(move);
  let x = total > 0 ? ((t % total) + total) % total : 0;
  for (let i = 0; i < move.length; i++) {
    const key = move[i];
    if (x < key.secs || i === move.length - 1) {
      const from = move[(i - 1 + move.length) % move.length].pose;
      return { from, to: key.pose, progress: key.secs > 0 ? Math.min(1, x / key.secs) : 1, cue: key.cue };
    }
    x -= key.secs;
  }
  const last = move[move.length - 1];
  return { from: last.pose, to: last.pose, progress: 1, cue: last.cue };
}
