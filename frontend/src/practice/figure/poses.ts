// The pose vocabulary the practices are drawn from. Coordinates are in the
// figure's 200 x 220 box; a standing body has its hips at (100, 125), a
// seated one at (100, 172). See geometry.ts for what each field means.
import { GROUND, STAND, type Pose } from "./geometry";

const pose = (p: Partial<Pose>, from: Pose = STAND): Pose => ({ ...from, ...p });

/** Mirror a pose left to right. */
export function mirror(p: Pose): Pose {
  const m = (v: readonly [number, number]) => [200 - v[0], v[1]] as const;
  return {
    ...p,
    tilt: -p.tilt,
    head: -p.head,
    lHand: m(p.rHand),
    rHand: m(p.lHand),
    lFoot: m(p.rFoot),
    rFoot: m(p.lFoot),
    lKnee: p.rKnee,
    rKnee: p.lKnee,
  };
}

export const stand = STAND;
export const standSoft = pose({ drop: 3, lFoot: [88, GROUND], rFoot: [112, GROUND] });
export const standWide = pose({ drop: 4, lFoot: [84, GROUND], rFoot: [116, GROUND] });
export const handsOnBelly = pose({ lHand: [95, 117], rHand: [105, 117], focus: "dantian", glow: 0.8 }, standSoft);
export const shrugUp = pose({ shrug: 1 }, standSoft);

// Ba Duan Jin and friends
export const palmsAtChest = pose({ lHand: [90, 84], rHand: [110, 84] }, standWide);
export const armsUp = pose({ lHand: [92, 16], rHand: [108, 16], lift: 2 }, standWide);
export const horse = pose({ drop: 16, lFoot: [72, GROUND], rFoot: [128, GROUND], lHand: [92, 114], rHand: [108, 114] });
export const bowLeft = pose({ lHand: [30, 80], rHand: [104, 84], head: -1 }, horse);
export const bowRight = mirror(bowLeft);
export const separateLeft = pose({ lHand: [86, 14], rHand: [124, 134], head: -0.3 }, standWide);
export const separateRight = mirror(separateLeft);
export const lookLeft = pose({ head: -1, lHand: [86, 130], rHand: [114, 130] }, standWide);
export const lookRight = mirror(lookLeft);
export const swayLeft = pose({ tilt: -18, lHand: [72, 146], rHand: [112, 146], head: -0.5 }, horse);
export const swayRight = mirror(swayLeft);
export const halfFold = pose({ fold: 0.5, lHand: [90, 160], rHand: [110, 160] }, standWide);
export const fold = pose({ fold: 1, lHand: [93, 198], rHand: [107, 198] }, standWide);
export const punchLeft = pose({ lHand: [26, 92], rHand: [108, 114], head: -0.6 }, horse);
export const punchRight = mirror(punchLeft);
export const heelsUp = pose({ lift: 9 }, stand);

// Zhan zhuang: holding the ball
export const holdBall = pose({ drop: 6, lHand: [80, 100], rHand: [120, 100], ball: 1 }, standWide);
export const holdBallCrown = pose({ focus: "crown", glow: 0.7 }, holdBall);

// Wu Qin Xi, the five animals
export const tigerReach = pose({ fold: 0.2, lHand: [64, 36], rHand: [136, 36] }, standWide);
export const tigerDown = pose({ fold: 0.6, drop: 6, lHand: [86, 168], rHand: [114, 168] }, standWide);
// Hands raised beside the head like antlers, the waist turning.
export const deerLeft = pose({ tilt: -10, lHand: [66, 30], rHand: [96, 22], head: -0.6 }, standWide);
export const deerRight = mirror(deerLeft);
export const bearLeft = pose({ tilt: -9, drop: 10, lHand: [90, 120], rHand: [106, 116] }, standWide);
export const bearRight = mirror(bearLeft);
export const monkeyLeft = pose({ lKnee: 0.55, rHand: [112, 46], lHand: [88, 110], head: 0.6 });
export const monkeyRight = mirror(monkeyLeft);
export const craneLeft = pose({ rKnee: 0.8, lHand: [36, 64], rHand: [164, 64] });
export const craneRight = mirror(craneLeft);

// Walking, seen from the front: weight shifts, arms swing a little.
export const walkA = pose({ lFoot: [90, GROUND - 6], rFoot: [110, GROUND], lHand: [88, 128], rHand: [118, 126] });
export const walkB = mirror(walkA);

// Seated
const SEATED: Partial<Pose> = { seated: 1, lHand: [93, 170], rHand: [107, 170] };
export const seated = pose(SEATED);
export const seatedBelly = pose({ ...SEATED, lHand: [96, 160], rHand: [104, 160], focus: "dantian", glow: 0.6 });
export const seatedPalmsTogether = pose({ ...SEATED, lHand: [98, 140], rHand: [102, 140] });
export const seatedRubA = pose({ ...SEATED, lHand: [98, 134], rHand: [102, 144], focus: "palms", glow: 0.5 });
export const seatedRubB = pose({ ...SEATED, lHand: [98, 144], rHand: [102, 134], focus: "palms", glow: 0.5 });
export const seatedPalmsApart = pose({ ...SEATED, lHand: [89, 140], rHand: [111, 140], focus: "palms", glow: 0.9 });
export const seatedEyes = pose({ ...SEATED, lHand: [95, 101], rHand: [105, 101], focus: "eyes", glow: 0.6 });
export const seatedOwlLeft = pose({ ...SEATED, head: -1 });
export const seatedOwlRight = pose({ ...SEATED, head: 1 });
