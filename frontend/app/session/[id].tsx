// A guided session: the practice, one step at a time, with a quiet timer,
// and one tap at the end to count the day.
//
// Before this, the core loop was "read an article, remember the steps, then
// write a journal entry to get credit". That is three chances to give up, and
// the person this app is for (busy, easily put off) takes the first one.
// Here the phone holds the steps and the time, the screen stays awake, and
// the day is counted with or without a word written.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { CaretLeft, Pause, Play, SkipForward } from "@/src/components/icons";

import { Button, Chip, ErrorState, Loading, Txt } from "@/src/components/ui";
import { apiFetch, errorMessage } from "@/src/api/client";
import { goBack } from "@/src/utils/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { shareApp } from "@/src/utils/share";
import { MoveFigure } from "@/src/practice/figure/MoveFigure";
import { moveFor } from "@/src/practice/figure/moves";
import { StepDetailCard, type StepDetail } from "@/src/practice/StepDetail";
import { track } from "@/src/analytics/track";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Practice = {
  practice_id: string;
  title: string;
  time_min: number;
  seconds?: number;
  instructions: string[];
  /** Relative length of each step; without it the time is split evenly. */
  step_weights?: number[];
  step_details?: StepDetail[];
  safety_note?: string | null;
};

// A step that itself says how to breathe gets no separate breath cue under
// the figure, so the two can never disagree.
const SAYS_HOW_TO_BREATHE = /\b(breathe|breath|breathing|inhale|exhale|in-breath|out-breath)\b/i;

type Growth = { label: string; line: string; days: number; glyph: string };

const MOODS = [
  { key: "still", label: "Still" },
  { key: "open", label: "Open" },
  { key: "light", label: "Light" },
  { key: "tired", label: "Tired" },
  { key: "restless", label: "Restless" },
];

function clock(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const SHORT_SECONDS = 5 * 60;

function say(text: string) {
  Speech.stop();
  Speech.speak(text, { rate: 0.9, pitch: 1.0 });
}

function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const KEEP_AWAKE_TAG = "session";

export default function Session() {
  // Keep the screen on. A browser can refuse (a hidden tab, no permission);
  // that only means the screen may dim, so the refusal is not an error.
  useEffect(() => {
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      Promise.resolve()
        .then(() => deactivateKeepAwake(KEEP_AWAKE_TAG))
        .catch(() => {});
    };
  }, []);
  const { id, stage } = useLocalSearchParams<{ id: string; stage?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { height } = useWindowDimensions();

  const [p, setP] = useState<Practice | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<"ready" | "running" | "paused" | "finish" | "saved">("ready");
  const [elapsed, setElapsed] = useState(0);
  const [manualStep, setManualStep] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [growth, setGrowth] = useState<Growth | null>(null);
  // Most sets run 15 to 25 minutes; the promise is five. Outside the Path a
  // long practice starts as its five-minute version, and the full length is
  // one tap away.
  const [short, setShort] = useState(!stage);
  // Steps read aloud, so the eyes can close and nobody has to read mid-practice.
  const [voice, setVoice] = useState(true);

  // Wall-clock based, so a locked screen or a busy JS thread cannot slow the
  // timer down: elapsed = time already banked + time since the last start.
  const banked = useRef(0);
  const startedAt = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      setP((await apiFetch<{ practice: Practice }>(`/practices/${id}`)).practice);
    } catch (e) {
      setLoadErr(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => {
    if (!p) return 300;
    if (p.seconds) return p.seconds;
    const full = Math.max(60, (p.time_min || 5) * 60);
    return short ? Math.min(full, SHORT_SECONDS) : full;
  }, [p, short]);
  const canShorten = !!p && !p.seconds && (p.time_min || 0) * 60 > SHORT_SECONDS;

  const steps = p?.instructions?.length ? p.instructions : ["Rest the attention on the breath."];
  // Each step ends at its share of the total, weighted by how long it takes:
  // three slow breaths need longer than "rest a palm on the belly".
  const weights = steps.map((_, i) => Math.max(0.1, p?.step_weights?.[i] ?? 1));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const stepEnds = weights.reduce<number[]>((acc, w) => [...acc, (acc[acc.length - 1] ?? 0) + (w / weightSum) * total], []);
  const firstOpen = stepEnds.findIndex((end) => elapsed < end);
  const autoStep = firstOpen === -1 ? steps.length - 1 : firstOpen;
  const step = manualStep !== null ? Math.max(manualStep, autoStep) : autoStep;
  const remaining = total - elapsed;

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      const now = Date.now();
      const e = banked.current + (startedAt.current ? (now - startedAt.current) / 1000 : 0);
      setElapsed(Math.min(e, total));
      if (e >= total) {
        banked.current = total;
        startedAt.current = null;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setPhase("finish");
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase, total]);

  // A gentle tap on each new step, so the eyes can stay closed.
  const lastStep = useRef(0);
  const [showHow, setShowHow] = useState(false);
  useEffect(() => {
    if (phase === "running" && step !== lastStep.current) {
      tap();
      if (voice) say(steps[step]);
    }
    lastStep.current = step;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, phase]);

  // A spoken close, so someone with closed eyes knows the time is up.
  useEffect(() => {
    if (phase === "finish") {
      track("practice_finished", {
        practice_id: id,
        seconds: Math.round(banked.current || elapsed),
        guest: !user,
        short,
      });
    }
    if (phase === "finish" && voice) say("That is the practice. Open your eyes when you are ready.");
    if (phase === "paused" || phase === "saved") Speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => () => void Speech.stop(), []);

  // Coming back to the app re-reads the clock at once.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && startedAt.current) {
        setElapsed(Math.min(total, banked.current + (Date.now() - startedAt.current) / 1000));
      }
    });
    return () => sub.remove();
  }, [total]);

  const start = () => {
    if (phase === "ready") track("practice_started", { practice_id: id, guest: !user, short });
    if (phase === "ready" && voice) say(steps[step]);
    startedAt.current = Date.now();
    setPhase("running");
    tap();
  };
  const pause = () => {
    if (startedAt.current) banked.current += (Date.now() - startedAt.current) / 1000;
    startedAt.current = null;
    setPhase("paused");
  };
  const next = () => {
    if (step >= steps.length - 1) return finishEarly();
    setManualStep(step + 1);
    tap();
  };
  const finishEarly = () => {
    if (startedAt.current) banked.current += (Date.now() - startedAt.current) / 1000;
    startedAt.current = null;
    setElapsed(banked.current);
    setPhase("finish");
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const res = await apiFetch<{ growth: Growth }>("/logs", {
        method: "POST",
        body: {
          body: body.trim(),
          mood,
          nothing_happened: !body.trim(),
          visibility: "private",
          practice_ids: [id],
          stage_order: stage ? Number(stage) : null,
          duration_seconds: Math.round(banked.current || elapsed),
        },
      });
      setGrowth(res.growth);
      setPhase("saved");
      track("day_counted", { from: "session", practice_id: id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setSaveErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const top = (
    <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router)} hitSlop={12} testID="session-close">
        <CaretLeft size={22} color={colors.onSurface} weight="bold" />
      </Pressable>
      <Txt variant="label" numberOfLines={1} style={{ flex: 1, textAlign: "center", marginHorizontal: spacing.md }}>
        {p?.title ?? ""}
      </Txt>
      <View style={{ width: 22 }} />
    </View>
  );

  if (!p) {
    return (
      <View style={styles.container}>
        {top}
        {loadErr ? <ErrorState message={loadErr} onRetry={load} /> : <Loading />}
      </View>
    );
  }

  if (phase === "saved") {
    return (
      <View style={styles.container}>
        {top}
        <View style={styles.center} testID="session-saved">
          <Txt style={styles.glyph}>{growth?.glyph ?? "芽"}</Txt>
          <Txt variant="title" center style={{ marginTop: spacing.md }}>
            {growth ? `${growth.days} ${growth.days === 1 ? "day" : "days"} of practice` : "Today is counted"}
          </Txt>
          {growth ? (
            <Txt variant="bodySm" center color={colors.muted} style={{ marginTop: spacing.sm, maxWidth: 300 }}>
              {growth.line}
            </Txt>
          ) : null}
          <Txt variant="bodySm" center color={colors.onSurfaceSecondary} style={{ marginTop: spacing.xl, maxWidth: 300 }}>
            The old practitioners kept at this for decades, a few minutes at a time. You did today’s.
          </Txt>
          <Button
            label="Back to Today"
            onPress={() => router.replace("/(tabs)/today")}
            style={{ marginTop: spacing.xxl, alignSelf: "stretch" }}
            testID="session-done"
          />
          <Button
            label="Invite someone to practise too"
            variant="ghost"
            onPress={shareApp}
            style={{ marginTop: spacing.md, alignSelf: "stretch" }}
            testID="session-share"
          />
        </View>
      </View>
    );
  }

  if (phase === "finish") {
    return (
      <View style={styles.container}>
        {top}
        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          <Txt variant="displaySm">Finished.</Txt>
          <Txt variant="bodySm" color={colors.muted} style={{ marginTop: spacing.xs }}>
            {clock(banked.current || elapsed)} of practice.{user ? " Count today, with or without a word about it." : ""}
          </Txt>

          {user ? (
            <>
            <Txt variant="caption" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>HOW WAS IT? (OPTIONAL)</Txt>
            <View style={styles.moods}>
              {MOODS.map((m) => (
                <Chip
                  key={m.key}
                  label={m.label}
                  active={mood === m.key}
                  onPress={() => setMood(mood === m.key ? null : m.key)}
                  testID={`session-mood-${m.key}`}
                />
              ))}
            </View>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="A line about it, if you like. Nothing noticed is a fine answer."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={5000}
              style={styles.input}
              testID="session-note"
            />
            </>
          ) : null}
          {saveErr ? (
            <Txt variant="bodySm" color={colors.error} style={{ marginTop: spacing.md }}>
              {saveErr}
            </Txt>
          ) : null}
          {user ? (
            <>
              <Button label="Count today" onPress={save} loading={saving} style={{ marginTop: spacing.xl }} testID="session-save" />
              <Txt variant="caption" center style={{ marginTop: spacing.md }}>
                Saved privately to your journal. You can share reflections from there.
              </Txt>
            </>
          ) : (
            <>
              <Button
                label="Create a free account to keep your days"
                onPress={() => router.replace("/auth?mode=register")}
                style={{ marginTop: spacing.xl }}
                testID="session-guest-register"
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => router.replace("/welcome")}
                style={{ marginTop: spacing.md }}
                testID="session-guest-back"
              />
              <Txt variant="caption" center style={{ marginTop: spacing.md }}>
                That was the whole practice. An account counts your days and picks the next one for you.
              </Txt>
            </>
          )}
        </KeyboardAwareScrollView>
      </View>
    );
  }

  const progress = Math.min(1, elapsed / total);
  const move = moveFor(p.practice_id, step);
  const detail = p.step_details?.[step];

  return (
    <View style={styles.container}>
      {top}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {move ? (
          <MoveFigure
            move={move}
            playing={phase !== "paused"}
            restartKey={`${step}-${phase === "ready" ? "preview" : "live"}`}
            showCue={!SAYS_HOW_TO_BREATHE.test(steps[step])}
            size={height < 720 ? 120 : 170}
            label={`A figure showing step ${step + 1}`}
          />
        ) : null}
        <Txt variant="caption" color={colors.brandSecondary} center style={move ? { marginTop: spacing.md } : undefined}>
          STEP {step + 1} OF {steps.length}
        </Txt>
        <Txt variant="title" center style={styles.step} testID="session-step">
          {steps[step]}
        </Txt>
        {detail ? (
          <View style={{ alignSelf: "stretch", alignItems: "center", marginTop: spacing.md }}>
            <Chip label={showHow ? "Hide how" : "How to do it"} active={showHow} onPress={() => setShowHow(!showHow)} testID="session-how" />
            {showHow ? (
              <View style={{ alignSelf: "stretch", marginTop: spacing.md, maxWidth: 480, width: "100%" }}>
                <StepDetailCard detail={detail} />
              </View>
            ) : null}
          </View>
        ) : null}
        {phase === "ready" && p.safety_note ? (
          <Txt variant="caption" center color={colors.warning} style={{ marginTop: spacing.lg, maxWidth: 320 }}>
            {p.safety_note}
          </Txt>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Txt style={styles.clock} testID="session-clock">{clock(remaining)}</Txt>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(1, progress * 100)}%` }]} />
        </View>

        {phase === "ready" ? (
          <>
            <View style={styles.options}>
              {canShorten ? (
                <>
                  <Chip label="5 min" active={short} onPress={() => setShort(true)} testID="session-short" />
                  <Chip label={`Full ${p.time_min} min`} active={!short} onPress={() => setShort(false)} testID="session-full" />
                </>
              ) : null}
              <Chip
                label={voice ? "Voice on" : "Voice off"}
                active={voice}
                onPress={() => {
                  if (voice) Speech.stop();
                  setVoice(!voice);
                }}
                testID="session-voice"
              />
            </View>
            <Button label="Begin" onPress={start} style={{ marginTop: spacing.lg }} testID="session-begin" />
          </>
        ) : (
          <View style={styles.controls}>
            <Pressable
              onPress={phase === "running" ? pause : start}
              style={styles.round}
              accessibilityLabel={phase === "running" ? "Pause" : "Resume"}
              testID="session-toggle"
            >
              {phase === "running" ? (
                <Pause size={26} color={colors.onBrandPrimary} weight="fill" />
              ) : (
                <Play size={26} color={colors.onBrandPrimary} weight="fill" />
              )}
            </Pressable>
            <Pressable onPress={next} style={styles.roundGhost} accessibilityLabel="Next step" testID="session-next">
              <SkipForward size={22} color={colors.onSurface} />
            </Pressable>
          </View>
        )}
        {phase !== "ready" ? (
          <Pressable onPress={finishEarly} style={{ marginTop: spacing.lg }} testID="session-finish-early">
            <Txt variant="bodySm" color={colors.muted} center>
              Finish here. Shorter still counts.
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xl },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  body: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  step: { marginTop: spacing.md, fontSize: 24, lineHeight: 34, maxWidth: 420 },
  footer: { paddingHorizontal: spacing.xl, alignItems: "stretch" },
  clock: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 64,
    color: colors.onSurface,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  track: { height: 3, backgroundColor: colors.divider, borderRadius: 2, overflow: "hidden", marginTop: spacing.md },
  fill: { height: 3, backgroundColor: colors.brandSecondary },
  controls: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xl, marginTop: spacing.xl },
  round: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  roundGhost: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  glyph: { fontFamily: fonts.display, fontSize: 72, lineHeight: 84, color: colors.onSurface },
  moods: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  input: {
    marginTop: spacing.lg,
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
});
