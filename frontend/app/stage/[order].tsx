import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, CaretRight, Info } from "phosphor-react-native";

import { Badge, Button, Loading, Txt } from "@/src/components/ui";
import { apiFetch, mediaUri } from "@/src/api/client";
import { colors, IMAGES, radius, spacing } from "@/src/theme";

type Practice = { practice_id: string; title: string; category: string; time_min: number; illustration_url: string; has_illustration: boolean };
type Stage = {
  order: number;
  months: string;
  title: string;
  chinese: string;
  subtitle: string;
  description: string;
  daily_guidance: string;
  timeline_expectation: string;
  honest_note: string;
  min_checkins: number;
  recommended_days: number;
  state: "completed" | "in_progress" | "available" | "locked";
  checkins: number;
  practices_full: Practice[];
};

export default function StageDetail() {
  const { order } = useLocalSearchParams<{ order: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [busy, setBusy] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ stage: Stage }>(`/path/stages/${order}`);
    setStage(res.stage);
  }, [order]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const begin = async () => {
    setBusy(true);
    try {
      await apiFetch(`/path/stages/${order}/start`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const assess = async (ready: boolean) => {
    setBusy(true);
    setAssessing(false);
    try {
      const res = await apiFetch<{ unlocked: boolean; reason: string }>(`/path/stages/${order}/complete`, {
        method: "POST",
        body: { self_assessment: ready ? "ready" : "more_time" },
      });
      setResult(res.reason);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!stage) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: IMAGES.pathHero }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(26,25,24,0.35)", "rgba(26,25,24,0.8)"]} style={StyleSheet.absoluteFill} />
          <Pressable style={[styles.back, { top: insets.top + spacing.sm }]} onPress={() => router.back()} testID="stage-back-button" hitSlop={10}>
            <CaretLeft size={22} color={colors.onSurfaceInverse} weight="bold" />
          </Pressable>
          <View style={styles.heroContent}>
            <Txt variant="caption" color={colors.onSurfaceInverse} style={{ opacity: 0.85 }}>{stage.months} · {stage.chinese}</Txt>
            <Txt variant="display" color={colors.onSurfaceInverse} style={{ fontSize: 38, lineHeight: 42, marginTop: 2 }}>{stage.title}</Txt>
            <Txt variant="subtitle" color={colors.onSurfaceInverse} style={{ opacity: 0.9 }}>{stage.subtitle}</Txt>
          </View>
        </View>

        <View style={styles.body}>
          <Txt variant="body">{stage.description}</Txt>

          <Section title="What to do">
            <Txt variant="body">{stage.daily_guidance}</Txt>
          </Section>

          <Section title="Expected timeline">
            <Txt variant="body">{stage.timeline_expectation}</Txt>
          </Section>

          <View style={styles.honest}>
            <Info size={16} color={colors.brandSecondary} weight="regular" />
            <Txt variant="body" style={{ flex: 1, marginLeft: spacing.sm, fontStyle: "italic" }} color={colors.onSurfaceSecondary}>
              {stage.honest_note}
            </Txt>
          </View>

          <Section title="Practices in this stage">
            {stage.practices_full.map((p) => (
              <Pressable key={p.practice_id} style={styles.practiceRow} onPress={() => router.push(`/practice/${p.practice_id}`)} testID={`stage-practice-${p.practice_id}`}>
                <View style={styles.practiceThumb}>
                  <LinearGradient colors={["#8C9A86", "#5E6C58"]} style={StyleSheet.absoluteFill} />
                  {p.has_illustration ? <Image source={{ uri: mediaUri(p.illustration_url) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} /> : null}
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Txt variant="label">{p.title}</Txt>
                  <Txt variant="caption">{p.category.toUpperCase()}{p.time_min ? ` · ${p.time_min} MIN` : ""}</Txt>
                </View>
                <CaretRight size={18} color={colors.muted} weight="regular" />
              </Pressable>
            ))}
          </Section>

          {/* Actions */}
          <View style={{ marginTop: spacing.xl }}>
            {stage.state === "locked" ? (
              <View style={styles.lockedNote}>
                <Txt variant="body" center color={colors.onSurfaceSecondary}>
                  Complete the previous stage to open this one. The path unfolds in order.
                </Txt>
              </View>
            ) : stage.state === "available" ? (
              <Button label="Begin this stage" onPress={begin} loading={busy} testID="stage-begin-button" />
            ) : stage.state === "completed" ? (
              <Badge label="STAGE COMPLETE" tone="brand" />
            ) : (
              <View>
                <View style={styles.progressCard}>
                  <Txt variant="label">In progress</Txt>
                  <Txt variant="bodySm" style={{ marginTop: 2 }}>
                    {stage.checkins} check-in{stage.checkins === 1 ? "" : "s"} logged · {stage.min_checkins} suggested before moving on.
                  </Txt>
                </View>
                <Button
                  label="Log a check-in"
                  variant="secondary"
                  onPress={() => router.push(`/log/new?stage=${stage.order}`)}
                  testID="stage-checkin-button"
                  style={{ marginTop: spacing.md }}
                />
                {result ? (
                  <View style={styles.resultBox}>
                    <Txt variant="body" color={colors.onSurfaceSecondary}>{result}</Txt>
                  </View>
                ) : assessing ? (
                  <View style={styles.assessBox}>
                    <Txt variant="label" center>Do you feel genuinely ready to move on?</Txt>
                    <Txt variant="bodySm" center style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
                      There is no reward for rushing. Readiness is a felt sense, not a date.
                    </Txt>
                    <Button label="I feel ready" onPress={() => assess(true)} loading={busy} testID="stage-ready-button" />
                    <Button label="I need more time" variant="ghost" onPress={() => assess(false)} style={{ marginTop: spacing.sm }} testID="stage-moretime-button" />
                  </View>
                ) : (
                  <Button
                    label="I'm ready for the next stage"
                    onPress={() => setAssessing(true)}
                    style={{ marginTop: spacing.md }}
                    testID="stage-assess-button"
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Txt variant="caption" color={colors.brandPrimary} style={{ marginBottom: spacing.sm }}>{title.toUpperCase()}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 280 },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: spacing.xl },
  back: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(26,25,24,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  body: { padding: spacing.xl },
  honest: {
    flexDirection: "row",
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandSecondary,
  },
  practiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  practiceThumb: { width: 52, height: 52, borderRadius: radius.md, overflow: "hidden" },
  lockedNote: { padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md },
  progressCard: { padding: spacing.lg, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md },
  assessBox: { marginTop: spacing.md, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  resultBox: { marginTop: spacing.md, padding: spacing.lg, backgroundColor: colors.brandTertiary, borderRadius: radius.md },
});
