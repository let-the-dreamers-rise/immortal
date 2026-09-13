import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, Warning, Clock, Barbell } from "phosphor-react-native";

import { Button, Loading, Txt } from "@/src/components/ui";
import { apiFetch, mediaUri } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Practice = {
  practice_id: string;
  title: string;
  tradition: string;
  category: string;
  difficulty: string;
  time_min: number;
  origin_text: string;
  historical_context: string;
  modern_understanding: string;
  evidence_note?: string | null;
  instructions: string[];
  safety_note?: string | null;
  illustration_url: string;
  has_illustration: boolean;
};

export default function PracticeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [p, setP] = useState<Practice | null>(null);

  useEffect(() => {
    apiFetch<{ practice: Practice }>(`/practices/${id}`).then((r) => setP(r.practice)).catch(() => setP(null));
  }, [id]);

  if (!p) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  const grad: [string, string] = p.tradition === "dao" ? ["#8C9A86", "#5E6C58"] : ["#C7A97C", "#8C7A6B"];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LinearGradient colors={grad} style={StyleSheet.absoluteFill} />
          {p.has_illustration ? (
            <Image source={{ uri: mediaUri(p.illustration_url) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          ) : null}
          <LinearGradient colors={["rgba(26,25,24,0.15)", "rgba(26,25,24,0.55)"]} style={StyleSheet.absoluteFill} />
          <Pressable style={[styles.back, { top: insets.top + spacing.sm }]} onPress={() => router.back()} testID="practice-back-button" hitSlop={10}>
            <CaretLeft size={22} color={colors.onSurfaceInverse} weight="bold" />
          </Pressable>
          <View style={styles.heroContent}>
            <Txt variant="caption" color={colors.onSurfaceInverse} style={{ opacity: 0.85 }}>{p.tradition === "dao" ? "DAO TRADITION" : "AYURVEDA"}</Txt>
            <Txt variant="display" color={colors.onSurfaceInverse} style={{ fontSize: 34, lineHeight: 38, marginTop: 2 }}>{p.title}</Txt>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Meta icon={<Barbell size={16} color={colors.brandSecondary} weight="regular" />} label={p.difficulty} />
            {p.time_min > 0 ? <Meta icon={<Clock size={16} color={colors.brandSecondary} weight="regular" />} label={`${p.time_min} min`} /> : null}
            <Meta label={p.category} />
          </View>

          {p.safety_note ? (
            <View style={styles.safety}>
              <Warning size={16} color={colors.warning} weight="fill" />
              <Txt variant="bodySm" color={colors.warning} style={{ flex: 1, marginLeft: spacing.sm }}>{p.safety_note}</Txt>
            </View>
          ) : null}

          {["Breathwork", "Pranayama", "Internal"].includes(p.category) ? (
            <View style={styles.readiness}>
              <Txt variant="label" style={{ marginBottom: spacing.xs }}>Before you begin</Txt>
              <Txt variant="bodySm" color={colors.onSurfaceSecondary}>
                Breath and internal practices ask a little of the body. Please skip today, ease off, or check with your
                doctor first if you are pregnant, have a heart, blood-pressure or respiratory condition, a seizure or
                fainting history, or simply feel unwell. Never force the breath — stop if you feel dizzy.
              </Txt>
            </View>
          ) : null}

          <Section label="Historical context">
            <Txt variant="caption" color={colors.brandSecondary} style={{ marginBottom: 4 }}>{p.origin_text}</Txt>
            <Txt variant="body">{p.historical_context}</Txt>
          </Section>

          <Section label="Modern understanding">
            <Txt variant="body">{p.modern_understanding}</Txt>
          </Section>

          {p.evidence_note ? (
            <Section label="What the evidence says">
              <Txt variant="body">{p.evidence_note}</Txt>
            </Section>
          ) : null}

          <Section label="How to practise">
            {p.instructions.map((step, i) => (
              <View key={i} style={styles.step}>
                <Txt style={{ fontFamily: fonts.display, fontSize: 22, color: colors.brandPrimary, width: 28 }}>{i + 1}</Txt>
                <Txt variant="body" style={{ flex: 1 }}>{step}</Txt>
              </View>
            ))}
          </Section>

          <Button
            label="Log this practice"
            onPress={() => router.push(`/log/new?practice=${p.practice_id}`)}
            style={{ marginTop: spacing.xl }}
            testID="practice-log-button"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Meta({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <View style={styles.meta}>
      {icon}
      <Txt variant="caption" style={{ marginLeft: icon ? 4 : 0 }}>{label.toUpperCase()}</Txt>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Txt variant="caption" color={colors.brandPrimary} style={{ marginBottom: spacing.sm }}>{label.toUpperCase()}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 300 },
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
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  meta: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  safety: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: "#F0E6D0",
    borderRadius: radius.md,
  },
  step: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md, gap: spacing.sm },
  readiness: { marginTop: spacing.lg, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: colors.info },
});
