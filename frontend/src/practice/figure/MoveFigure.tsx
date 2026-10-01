// A small ink figure that loops the movement for the current step, so a
// standing set can be followed by eye, not only from the written words.
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Polyline } from "react-native-svg";

import { Txt } from "@/src/components/ui";
import { colors } from "@/src/theme";
import { blend, ease, GROUND, skeleton, type Vec } from "./geometry";
import { sample, type Move } from "./moves";

const FRAME_MS = 33;

function useClock(playing: boolean, resetKey: unknown): number {
  const [t, setT] = useState(0);
  const banked = useRef(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    banked.current = 0;
    startedAt.current = null;
    setT(0);
  }, [resetKey]);

  useEffect(() => {
    if (!playing) return;
    startedAt.current = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame> | null = null;
    let last = 0;
    const tick = () => {
      const now = Date.now();
      if (now - last >= FRAME_MS) {
        last = now;
        setT(banked.current + (now - (startedAt.current ?? now)) / 1000);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (startedAt.current !== null) banked.current += (Date.now() - startedAt.current) / 1000;
      startedAt.current = null;
    };
  }, [playing]);

  return t;
}

const pts = (list: Vec[]) => list.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

export function MoveFigure({
  move,
  playing = true,
  size = 180,
  label,
}: {
  move: Move;
  playing?: boolean;
  size?: number;
  /** Read by screen readers in place of the drawing. */
  label: string;
}) {
  const t = useClock(playing, move);
  const s = sample(move, t);
  const sk = skeleton(blend(s.from, s.to, ease(s.progress)));
  const ink = colors.onSurface;
  const turn = sk.headTurn * 7;

  return (
    <View style={styles.wrap} accessible accessibilityRole="image" accessibilityLabel={label} testID="move-figure">
      <Svg width={size} height={(size * 220) / 200} viewBox="0 0 200 220">
        <Line x1={20} y1={GROUND + 1} x2={180} y2={GROUND + 1} stroke={colors.divider} strokeWidth={2} strokeLinecap="round" />
        {sk.seated ? <Ellipse cx={100} cy={GROUND - 8} rx={46} ry={8} fill={colors.surfaceTertiary} /> : null}
        {sk.glow ? (
          <>
            <Circle cx={sk.glow.c[0]} cy={sk.glow.c[1]} r={16} fill={colors.brandSecondary} opacity={0.18 * sk.glow.opacity} />
            <Circle cx={sk.glow.c[0]} cy={sk.glow.c[1]} r={7} fill={colors.brandSecondary} opacity={0.55 * sk.glow.opacity} />
          </>
        ) : null}
        {sk.ball ? (
          <Circle
            cx={sk.ball.c[0]}
            cy={sk.ball.c[1]}
            r={sk.ball.r}
            fill={colors.brandPrimary}
            fillOpacity={0.08 * sk.ball.opacity}
            stroke={colors.brandPrimary}
            strokeOpacity={0.5 * sk.ball.opacity}
            strokeDasharray="3 4"
            strokeWidth={1.5}
          />
        ) : null}
        <Polyline points={pts(sk.lLeg)} fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={pts(sk.rLeg)} fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={sk.hip[0]} y1={sk.hip[1]} x2={sk.neck[0]} y2={sk.neck[1]} stroke={ink} strokeWidth={6} strokeLinecap="round" />
        <Polyline points={pts([sk.lShoulder, sk.neck, sk.rShoulder])} fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={pts([sk.lShoulder, sk.lElbow, sk.lHand])} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={pts([sk.rShoulder, sk.rElbow, sk.rHand])} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={sk.lHand[0]} cy={sk.lHand[1]} r={3.5} fill={ink} />
        <Circle cx={sk.rHand[0]} cy={sk.rHand[1]} r={3.5} fill={ink} />
        <Circle cx={sk.head[0]} cy={sk.head[1]} r={12} fill={colors.surface} stroke={ink} strokeWidth={3.5} />
        {/* The nose shows which way the head is turned. */}
        <Line x1={sk.head[0] + turn} y1={sk.head[1] - 1} x2={sk.head[0] + turn * 1.25} y2={sk.head[1] + 4} stroke={ink} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <Txt variant="caption" color={colors.brandSecondary} center style={styles.cue}>
        {s.cue ? s.cue.toUpperCase() : " "}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  cue: { marginTop: 2, minHeight: 16, letterSpacing: 1.2 },
});
