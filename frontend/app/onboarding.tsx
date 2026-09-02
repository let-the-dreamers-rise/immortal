import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Leaf, YinYang, Sparkle } from "phosphor-react-native";

import { Button, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { apiFetch } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";

const PATHS = [
  { key: "dao", title: "The Dao Path", desc: "A structured Chinese Daoist journey — movement, breath, stillness.", Icon: YinYang },
  { key: "ayurveda", title: "Ayurveda", desc: "Daily routines, breathwork and seasonal living from India.", Icon: Leaf },
  { key: "both", title: "Both Traditions", desc: "Walk the guided Dao Path and explore Ayurveda alongside.", Icon: Sparkle },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { setUser } = useAuth();
  const [intention, setIntention] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!choice) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ user: any }>("/auth/onboarding", {
        method: "POST",
        body: { intention: intention.trim() || "To live well, for longer.", path_choice: choice },
      });
      setUser(res.user);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120 }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Txt variant="caption" color={colors.brandPrimary}>A FEW QUIET QUESTIONS</Txt>
        <Txt variant="displaySm" style={{ marginTop: spacing.sm }}>
          What draws you to longevity?
        </Txt>
        <Txt variant="bodySm" style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
          There is no wrong answer. This is just for you — a note to return to later.
        </Txt>

        <TextInput
          value={intention}
          onChangeText={setIntention}
          placeholder="I want to move through my later years with clarity and calm…"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.intentionInput}
          testID="onboarding-intention-input"
        />

        <Txt variant="title" style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
          Choose your path
        </Txt>
        {PATHS.map((p) => {
          const active = choice === p.key;
          const Icon = p.Icon;
          return (
            <Pressable
              key={p.key}
              testID={`onboarding-path-${p.key}`}
              onPress={() => setChoice(p.key)}
              style={[styles.pathCard, active && styles.pathCardActive]}
            >
              <View style={[styles.pathIcon, active && { backgroundColor: colors.brandPrimary }]}>
                <Icon size={24} color={active ? colors.onBrandPrimary : colors.brandPrimary} weight="regular" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label" color={active ? colors.onSurface : colors.onSurface}>
                  {p.title}
                </Txt>
                <Txt variant="bodySm" style={{ marginTop: 2 }}>{p.desc}</Txt>
              </View>
            </Pressable>
          );
        })}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label="Enter the path"
          onPress={submit}
          disabled={!choice}
          loading={busy}
          testID="onboarding-submit-button"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  intentionInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 110,
    textAlignVertical: "top",
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
  },
  pathCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pathCardActive: { borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary },
  pathIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
