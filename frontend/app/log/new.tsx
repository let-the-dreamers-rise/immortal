import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "phosphor-react-native";

import { Button, Chip, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";

const MOODS = [
  { key: "still", label: "Still" },
  { key: "open", label: "Open" },
  { key: "light", label: "Light" },
  { key: "tired", label: "Tired" },
  { key: "restless", label: "Restless" },
];

export default function NewLog() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { stage, practice } = useLocalSearchParams<{ stage?: string; practice?: string }>();
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [practiceTitle, setPracticeTitle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (practice) {
      apiFetch<{ practice: { title: string } }>(`/practices/${practice}`)
        .then((r) => setPracticeTitle(r.practice.title))
        .catch(() => {});
    }
  }, [practice]);

  const save = async () => {
    setBusy(true);
    try {
      await apiFetch("/logs", {
        method: "POST",
        body: {
          body,
          mood,
          nothing_happened: false,
          visibility,
          practice_ids: practice ? [practice] : [],
          stage_order: stage ? Number(stage) : null,
        },
      });
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="log-close-button">
          <X size={24} color={colors.onSurfaceSecondary} weight="regular" />
        </Pressable>
        <Txt variant="label">Today’s reflection</Txt>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
      >
        {practiceTitle ? (
          <Txt variant="caption" color={colors.brandPrimary} style={{ marginBottom: spacing.sm }}>
            ON {practiceTitle.toUpperCase()}
          </Txt>
        ) : null}

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="How did it go? What did you notice — or not notice? Even a single honest line is enough."
          placeholderTextColor={colors.muted}
          multiline
          autoFocus
          style={styles.input}
          testID="log-body-input"
        />

        <Txt variant="caption" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>HOW DID YOU FEEL?</Txt>
        <View style={styles.moods}>
          {MOODS.map((m) => (
            <Chip key={m.key} label={m.label} active={mood === m.key} onPress={() => setMood(mood === m.key ? null : m.key)} testID={`mood-${m.key}`} />
          ))}
        </View>

        <Txt variant="caption" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>WHO CAN SEE THIS?</Txt>
        <View style={styles.visRow}>
          <VisBtn label="Private" desc="Only you" active={visibility === "private"} onPress={() => setVisibility("private")} testID="visibility-private" />
          <VisBtn label="Public" desc="Share with the community" active={visibility === "public"} onPress={() => setVisibility("public")} testID="visibility-public" />
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="Save reflection" onPress={save} loading={busy} testID="log-save-button" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function VisBtn({ label, desc, active, onPress, testID }: { label: string; desc: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.visBtn, active && styles.visBtnActive]}>
      <Txt variant="label" color={active ? colors.onSurface : colors.onSurfaceSecondary}>{label}</Txt>
      <Txt variant="caption" style={{ marginTop: 2 }}>{desc}</Txt>
    </Pressable>
  );
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
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 28,
    color: colors.onSurface,
    minHeight: 140,
    textAlignVertical: "top",
  },
  moods: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  visRow: { flexDirection: "row", gap: spacing.md },
  visBtn: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visBtnActive: { borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
