// Pose maths for the practice figure: a front-view ink figure drawn from a
// handful of numbers, so a movement is a short list of poses rather than a
// video. Pure functions only; the component in MoveFigure.tsx draws the result.

export type Vec = readonly [number, number];

export type Focus = "dantian" | "mouth" | "eyes" | "palms" | "soles" | "spine" | "crown" | "chest" | "arms";

export type Pose = {
  lift: number; // whole body raised, as in rising on the toes (px)
  drop: number; // hips lowered by bending the knees (px)
  tilt: number; // torso leaning sideways, degrees; + leans to screen right
  fold: number; // 0..1 forward fold from the hips
  head: number; // -1..1 head turned toward screen left / right
  shrug: number; // 0..1 shoulders lifted toward the ears
  seated: number; // 0 standing, 1 sitting cross-legged (snaps at 0.5)
  lHand: Vec; // screen-left hand
  rHand: Vec; // screen-right hand
  lFoot: Vec;
  rFoot: Vec;
  lKnee: number; // 0..1 knee raised in front (one-leg balance)
  rKnee: number;
  ball: number; // 0..1 visibility of the held ball in standing practice
  glow: number; // 0..1 brightness of the point of attention
  focus: Focus | null;
  along: number; // 0..1 position along the spine or arms for travelling attention
};

export const GROUND = 206;
const HIP: Vec = [100, 125];
const SEAT_HIP: Vec = [100, 172];
const TORSO = 55;
const UPPER_ARM = 30;
const FOREARM = 30;
const THIGH = 40;
const SHIN = 40;
const HEAD_R = 12;

export const STAND: Pose = {
  lift: 0,
  drop: 0,
  tilt: 0,
  fold: 0,
  head: 0,
  shrug: 0,
  seated: 0,
  lHand: [84, 131],
  rHand: [116, 131],
  lFoot: [91, GROUND],
  rFoot: [109, GROUND],
  lKnee: 0,
  rKnee: 0,
  ball: 0,
  glow: 0,
  focus: null,
  along: 0,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpVec = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Smooth start and stop, so a figure eases into a pose the way a body does. */
export function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export function blend(a: Pose, b: Pose, t: number): Pose {
  const half = t < 0.5;
  return {
    lift: lerp(a.lift, b.lift, t),
    drop: lerp(a.drop, b.drop, t),
    tilt: lerp(a.tilt, b.tilt, t),
    fold: lerp(a.fold, b.fold, t),
    head: lerp(a.head, b.head, t),
    shrug: lerp(a.shrug, b.shrug, t),
    seated: half ? a.seated : b.seated,
    lHand: lerpVec(a.lHand, b.lHand, t),
    rHand: lerpVec(a.rHand, b.rHand, t),
    lFoot: lerpVec(a.lFoot, b.lFoot, t),
    rFoot: lerpVec(a.rFoot, b.rFoot, t),
    lKnee: lerp(a.lKnee, b.lKnee, t),
    rKnee: lerp(a.rKnee, b.rKnee, t),
    ball: lerp(a.ball, b.ball, t),
    // Attention moves with the body; when it changes place it fades across.
    glow: a.focus === b.focus ? lerp(a.glow, b.glow, t) : half ? a.glow * (1 - 2 * t) : b.glow * (2 * t - 1),
    focus: a.focus === b.focus || !half ? b.focus : a.focus,
    along: a.focus === b.focus ? lerp(a.along, b.along, t) : half ? a.along : b.along,
  };
}

/**
 * Two-bone reach from `root` toward `target`. Of the two possible middle
 * joints, takes the one further from the body's centre line, so elbows and
 * knees bend outward the way they do in standing practice.
 */
export function reach(
  root: Vec,
  target: Vec,
  l1: number,
  l2: number,
  centreX = 100,
  prefer: "outward" | "down" = "outward"
): { joint: Vec; end: Vec } {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const dist = Math.hypot(dx, dy) || 0.0001;
  const d = Math.min(Math.max(dist, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const ux = dx / dist;
  const uy = dy / dist;
  const end: Vec = [root[0] + ux * d, root[1] + uy * d];
  const a = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(uy, ux);
  const c1: Vec = [root[0] + Math.cos(base + a) * l1, root[1] + Math.sin(base + a) * l1];
  const c2: Vec = [root[0] + Math.cos(base - a) * l1, root[1] + Math.sin(base - a) * l1];
  const joint =
    prefer === "down"
      ? c1[1] >= c2[1]
        ? c1
        : c2
      : Math.abs(c1[0] - centreX) >= Math.abs(c2[0] - centreX)
        ? c1
        : c2;
  return { joint, end };
}

export type Skeleton = {
  hip: Vec;
  neck: Vec;
  head: Vec;
  headTurn: number;
  lShoulder: Vec;
  rShoulder: Vec;
  lElbow: Vec;
  rElbow: Vec;
  lHand: Vec;
  rHand: Vec;
  /** Each leg as a polyline from hip to foot. */
  lLeg: Vec[];
  rLeg: Vec[];
  seated: boolean;
  ball: { c: Vec; r: number; opacity: number } | null;
  glow: { c: Vec; opacity: number } | null;
};

function deg(d: number) {
  return (d * Math.PI) / 180;
}

function standingLeg(hipJoint: Vec, foot: Vec, knee: number, side: -1 | 1): Vec[] {
  if (knee > 0.01) {
    // A raised knee seen from the front: the thigh comes toward the viewer
    // (so it looks short) and the shin hangs below it.
    const k: Vec = [hipJoint[0] + side * 2, hipJoint[1] + THIGH * (1 - 0.85 * knee)];
    const f: Vec = [lerp(foot[0], k[0] + side * 2, knee), lerp(foot[1], k[1] + SHIN, knee)];
    return [hipJoint, k, f];
  }
  const { joint, end } = reach(hipJoint, foot, THIGH, SHIN);
  return [hipJoint, joint, end];
}

export function skeleton(p: Pose): Skeleton {
  const seated = p.seated >= 0.5;
  const base = seated ? SEAT_HIP : HIP;
  const hip: Vec = [base[0], base[1] + (seated ? 0 : p.drop - p.lift)];
  const t = deg(p.tilt);
  const len = TORSO * (1 - 0.55 * p.fold);
  const up: Vec = [Math.sin(t), -Math.cos(t)];
  const side: Vec = [Math.cos(t), Math.sin(t)];
  const neck: Vec = [hip[0] + up[0] * len, hip[1] + up[1] * len];
  // In a forward fold the head drops below the shoulders.
  const headLift = (HEAD_R + 2) * (1 - 2 * p.fold);
  const head: Vec = [neck[0] + up[0] * headLift, neck[1] + up[1] * headLift];
  const sy = 4 - 6 * p.shrug;
  const lShoulder: Vec = [neck[0] - side[0] * 18 - up[0] * sy, neck[1] - side[1] * 18 - up[1] * sy];
  const rShoulder: Vec = [neck[0] + side[0] * 18 - up[0] * sy, neck[1] + side[1] * 18 - up[1] * sy];
  // Hand positions are absolute, so seated poses give them in seated height.
  // Elbows hang down unless the hand is raised well above the shoulder, when
  // they open outward instead.
  const elbow = (shoulder: Vec, hand: Vec) => (hand[1] < shoulder[1] - 20 ? "outward" : "down");
  const lArm = reach(lShoulder, p.lHand, UPPER_ARM, FOREARM, neck[0], elbow(lShoulder, p.lHand));
  const rArm = reach(rShoulder, p.rHand, UPPER_ARM, FOREARM, neck[0], elbow(rShoulder, p.rHand));

  const lHip: Vec = [hip[0] - 9, hip[1]];
  const rHip: Vec = [hip[0] + 9, hip[1]];
  let lLeg: Vec[];
  let rLeg: Vec[];
  if (seated) {
    // Cross-legged: knees out to the sides, feet tucked in front.
    lLeg = [lHip, [hip[0] - 36, hip[1] + 14], [hip[0] + 12, hip[1] + 22]];
    rLeg = [rHip, [hip[0] + 36, hip[1] + 14], [hip[0] - 12, hip[1] + 24]];
  } else {
    lLeg = standingLeg(lHip, [p.lFoot[0], p.lFoot[1] - p.lift], p.lKnee, -1);
    rLeg = standingLeg(rHip, [p.rFoot[0], p.rFoot[1] - p.lift], p.rKnee, 1);
  }

  const ball =
    p.ball > 0.02
      ? {
          c: [(lArm.end[0] + rArm.end[0]) / 2, (lArm.end[1] + rArm.end[1]) / 2 + 4] as Vec,
          r: Math.max(6, Math.hypot(rArm.end[0] - lArm.end[0], rArm.end[1] - lArm.end[1]) / 2 - 3),
          opacity: p.ball,
        }
      : null;

  const sk: Skeleton = {
    hip,
    neck,
    head,
    headTurn: p.head,
    lShoulder,
    rShoulder,
    lElbow: lArm.joint,
    rElbow: rArm.joint,
    lHand: lArm.end,
    rHand: rArm.end,
    lLeg,
    rLeg,
    seated,
    ball,
    glow: null,
  };
  if (p.focus && p.glow > 0.02) sk.glow = { c: focusPoint(sk, p.focus, p.along), opacity: p.glow };
  return sk;
}

export function focusPoint(s: Skeleton, focus: Focus, along: number): Vec {
  const onTorso = (k: number): Vec => [lerp(s.hip[0], s.neck[0], k), lerp(s.hip[1], s.neck[1], k)];
  switch (focus) {
    case "dantian":
      return onTorso(0.18);
    case "chest":
      return onTorso(0.7);
    case "mouth":
      return [s.head[0], s.head[1] + 5];
    case "eyes":
      return [s.head[0], s.head[1] - 2];
    case "crown":
      return [s.head[0], s.head[1] - 12];
    case "palms":
      return [(s.lHand[0] + s.rHand[0]) / 2, (s.lHand[1] + s.rHand[1]) / 2];
    case "soles": {
      const l = s.lLeg[s.lLeg.length - 1];
      const r = s.rLeg[s.rLeg.length - 1];
      return [(l[0] + r[0]) / 2, Math.max(l[1], r[1])];
    }
    case "spine": {
      // 0 at the lower belly, 1 at the crown of the head.
      if (along <= 0.8) return onTorso(0.18 + (0.82 * along) / 0.8);
      const k = (along - 0.8) / 0.2;
      return [lerp(s.neck[0], s.head[0], k), lerp(s.neck[1], s.head[1] - 12, k)];
    }
    case "arms": {
      // 0 at the shoulder, 1 at the hand, travelling down the left arm.
      const k = along * 2;
      return k <= 1 ? lerpVec(s.lShoulder, s.lElbow, k) : lerpVec(s.lElbow, s.lHand, k - 1);
    }
  }
}
