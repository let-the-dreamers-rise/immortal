import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, SignOut } from "phosphor-react-native";

import { Button, Divider, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      const res = await apiFetch<{ user: any }>("/profile", { method: "PATCH", body: { display_name: name, bio } });
      setUser(res.user);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="settings-close-button">
          <X size={24} color={colors.onSurfaceSecondary} weight="regular" />
        </Pressable>
        <Txt variant="label">Settings</Txt>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Txt variant="caption" style={{ marginBottom: spacing.xs }}>DISPLAY NAME</Txt>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.muted} testID="settings-name-input" />

        <Txt variant="caption" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>BIO</Txt>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="A line about your practice…"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
          testID="settings-bio-input"
        />

        <Button label="Save changes" onPress={save} loading={busy} style={{ marginTop: spacing.lg }} testID="settings-save-button" />
        {saved ? <Txt variant="bodySm" color={colors.success} center style={{ marginTop: spacing.sm }}>Saved.</Txt> : null}

        <Divider style={{ marginVertical: spacing.xxl }} />

        <Pressable onPress={logout} style={styles.logout} testID="settings-logout-button">
          <SignOut size={20} color={colors.error} weight="regular" />
          <Txt variant="label" color={colors.error} style={{ marginLeft: spacing.sm }}>Sign out</Txt>
        </Pressable>

        <Txt variant="caption" center style={{ marginTop: spacing.xxl, lineHeight: 16 }}>
          Immortality is a space for historical exploration and personal practice — not medical advice.
        </Txt>
      </KeyboardAwareScrollView>
    </View>
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
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurface,
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
});
