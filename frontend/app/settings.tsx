import { useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, SignOut, Bell } from "phosphor-react-native";

import { Button, Chip, Divider, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { cancelDailyReminder, requestReminderPermission, scheduleDailyReminder } from "@/src/utils/reminders";
import { colors, fonts, radius, spacing } from "@/src/theme";

const TIME_PRESETS = [
  { h: 6, m: 0, label: "6:00 AM" },
  { h: 7, m: 0, label: "7:00 AM" },
  { h: 8, m: 0, label: "8:00 AM" },
  { h: 12, m: 0, label: "12:00 PM" },
  { h: 18, m: 0, label: "6:00 PM" },
  { h: 21, m: 0, label: "9:00 PM" },
];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remEnabled, setRemEnabled] = useState(user?.reminder_enabled ?? false);
  const [remHour, setRemHour] = useState(user?.reminder_hour ?? 8);
  const [blocked, setBlocked] = useState(false);

  const persistReminder = async (enabled: boolean, hour: number) => {
    const res = await apiFetch<{ user: any }>("/profile/reminder", {
      method: "PATCH",
      body: { enabled, hour, minute: 0 },
    });
    setUser(res.user);
  };

  const toggleReminder = async () => {
    if (!remEnabled) {
      const outcome = await requestReminderPermission();
      if (outcome === "blocked") {
        setBlocked(true);
        return;
      }
      if (outcome !== "granted") return;
      setBlocked(false);
      setRemEnabled(true);
      await scheduleDailyReminder(remHour, 0, user?.path_choice);
      await persistReminder(true, remHour);
    } else {
      setRemEnabled(false);
      await cancelDailyReminder();
      await persistReminder(false, remHour);
    }
  };

  const chooseTime = async (h: number) => {
    setRemHour(h);
    if (remEnabled) {
      await scheduleDailyReminder(h, 0, user?.path_choice);
      await persistReminder(true, h);
    }
  };

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

        {/* Daily reminder */}
        <View style={styles.remHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Bell size={18} color={colors.brandPrimary} weight="regular" />
            <Txt variant="label" style={{ marginLeft: spacing.sm }}>Daily reminder</Txt>
          </View>
          <Pressable onPress={toggleReminder} testID="reminder-toggle" style={[styles.switch, remEnabled && styles.switchOn]}>
            <View style={[styles.knob, remEnabled && styles.knobOn]} />
          </Pressable>
        </View>
        <Txt variant="bodySm" style={{ marginTop: spacing.xs }}>
          A gentle nudge to practice and log, tuned to your path.
        </Txt>
        {blocked ? (
          <View style={styles.blockedBox}>
            <Txt variant="bodySm" color={colors.onSurfaceSecondary} style={{ marginBottom: spacing.sm }}>
              Notifications are turned off for this app. Enable them in Settings to receive your daily nudge.
            </Txt>
            <Button label="Open Settings" variant="ghost" small onPress={() => Linking.openSettings()} testID="reminder-open-settings" />
          </View>
        ) : null}
        {remEnabled ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
            {TIME_PRESETS.map((t) => (
              <Chip key={t.label} label={t.label} active={remHour === t.h} onPress={() => chooseTime(t.h)} testID={`reminder-time-${t.h}`} />
            ))}
          </View>
        ) : null}
        {Platform.OS === "web" && remEnabled ? (
          <Txt variant="caption" style={{ marginTop: spacing.sm }}>
            Reminders fire on your phone — test on a device build, not the web preview.
          </Txt>
        ) : null}

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
  remHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, padding: 2, justifyContent: "center" },
  switchOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  knobOn: { alignSelf: "flex-end" },
  blockedBox: { marginTop: spacing.md, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md },
});
