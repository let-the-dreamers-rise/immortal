import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { apiFetch, errorMessage } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";

// Immortal is Chinese Dao practice and nothing else, so there is no path to
// choose: one question, then straight to the first practice.
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { setUser } = useAuth();
  const [intention, setIntention] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ user: any }>("/auth/onboarding", {
        method: "POST",
        body: { intention: intention.trim() || "To practise a little, every day.", path_choice: "dao" },
      });
      setUser(res.user);
    } catch (e) {
      setError(errorMessage(e));
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
        <Txt variant="caption" color={colors.brandPrimary}>ONE QUIET QUESTION</Txt>
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
          maxLength={500}
          style={styles.intentionInput}
          testID="onboarding-intention-input"
        />

        <Txt variant="bodySm" style={{ marginTop: spacing.xl }}>
          Next you get one short Daoist practice for right now. Most take a few minutes and need no
          experience, no mat and no special clothes.
        </Txt>
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {error ? (
          <Txt variant="bodySm" color={colors.error} style={{ marginBottom: spacing.sm }} testID="onboarding-error">
            {error}
          </Txt>
        ) : null}
        <Button
          label="Enter the path"
          onPress={submit}
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
