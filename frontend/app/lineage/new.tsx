import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "phosphor-react-native";

import { Button, Chip, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";
import type { Lineage, LineageDetail } from "@/src/lineages/types";

const HORIZONS = [
  { days: 40, label: "40 days" },
  { days: 100, label: "100 days" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 1095, label: "3 years" },
  { days: 3285, label: "9 years" },
];
const MINUTES = [5, 10, 15, 20, 30, 45, 60];

export default function NewLineage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { parent } = useLocalSearchParams<{ parent?: string }>();
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [chinese, setChinese] = useState("");
  const [summary, setSummary] = useState("");
  const [method, setMethod] = useState("");
  const [cautions, setCautions] = useState("");
  const [horizon, setHorizon] = useState(100);
  const [minutes, setMinutes] = useState(15);
  const [basedOn, setBasedOn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A branch starts from its parent's text, so the change is what gets written.
  useEffect(() => {
    if (!parent) return;
    apiFetch<LineageDetail>(`/lineages/${parent}`)
      .then(({ lineage }) => {
        setParentTitle(lineage.title);
        setTitle(`${lineage.title} (branch)`);
        setChinese(lineage.chinese);
        setSummary(lineage.summary);
        setMethod(lineage.method);
        setCautions(lineage.cautions);
        setHorizon(lineage.horizon_days);
        setMinutes(lineage.daily_minutes);
        setBasedOn(lineage.based_on_practice_id);
      })
      .catch(() => {});
  }, [parent]);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3) return setError("Give it a title (3+ characters).");
    if (summary.trim().length < 10) return setError("Write a short summary (10+ characters).");
    if (method.trim().length < 10) return setError("Describe the method so others can follow it.");
    setBusy(true);
    try {
      const res = await apiFetch<{ lineage: Lineage }>("/lineages", {
        method: "POST",
        body: {
          title: title.trim(),
          chinese: chinese.trim(),
          summary: summary.trim(),
          method: method.trim(),
          cautions: cautions.trim(),
          horizon_days: horizon,
          daily_minutes: minutes,
          based_on_practice_id: basedOn,
          parent_id: parent || null,
        },
      });
      router.replace(`/lineage/${res.lineage.lineage_id}`);
    } catch (e: any) {
      if (e?.status === 402) {
        router.push("/paywall");
        return;
      }
      setError(e?.message ?? "Could not save this lineage.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="lineage-new-close">
          <X size={24} color={colors.onSurfaceSecondary} />
        </Pressable>
        <Txt variant="label">{parent ? "New branch" : "Record a lineage"}</Txt>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        {parentTitle ? (
          <Txt variant="bodySm" style={{ marginBottom: spacing.lg }}>
            Branching from {parentTitle}. Change what you do differently and say why in the summary.
          </Txt>
        ) : (
          <Txt variant="bodySm" style={{ marginBottom: spacing.lg }}>
            Write a practice down so others can carry it with you. Be plain about what you do and honest about what
            is unknown.
          </Txt>
        )}

        <Label text="Title" />
        <TextInput value={title} onChangeText={setTitle} maxLength={80} style={styles.input} placeholder="e.g. Standing at dawn" placeholderTextColor={colors.muted} testID="lineage-title" />
        <Label text="Chinese name (optional)" />
        <TextInput value={chinese} onChangeText={setChinese} maxLength={20} style={styles.input} placeholder="e.g. 站桩" placeholderTextColor={colors.muted} />
        <Label text="Summary" />
        <TextInput value={summary} onChangeText={setSummary} maxLength={400} multiline style={[styles.input, styles.multi]} placeholder="One or two lines on what this is." placeholderTextColor={colors.muted} testID="lineage-summary" />
        <Label text="The method" />
        <TextInput value={method} onChangeText={setMethod} maxLength={4000} multiline style={[styles.input, styles.multi, { minHeight: 140 }]} placeholder="What to do each day, and how it changes over time." placeholderTextColor={colors.muted} testID="lineage-method" />
        <Label text="Cautions (optional)" />
        <TextInput value={cautions} onChangeText={setCautions} maxLength={1000} multiline style={[styles.input, styles.multi]} placeholder="When to stop or slow down." placeholderTextColor={colors.muted} />

        <Label text="How long it runs" />
        <View style={styles.chips}>
          {HORIZONS.map((h) => (
            <Chip key={h.days} label={h.label} active={horizon === h.days} onPress={() => setHorizon(h.days)} testID={`horizon-${h.days}`} />
          ))}
        </View>
        <Label text="Minutes a day" />
        <View style={styles.chips}>
          {MINUTES.map((m) => (
            <Chip key={m} label={`${m}`} active={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </View>

        {error ? <Txt variant="bodySm" color={colors.error} style={{ marginTop: spacing.lg }}>{error}</Txt> : null}
        <Button label={parent ? "Save branch" : "Save lineage"} onPress={submit} loading={busy} style={{ marginTop: spacing.xl }} testID="lineage-save" />
      </KeyboardAwareScrollView>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Txt variant="caption" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>{text.toUpperCase()}</Txt>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
  },
  multi: { minHeight: 80, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
