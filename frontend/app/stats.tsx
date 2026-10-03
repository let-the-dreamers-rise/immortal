// Usage at a glance, for the app's owner: are people finishing a practice
// and coming back? Visible only to the accounts in the server's ADMIN_EMAILS.
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft } from "@/src/components/icons";

import { ErrorState, Loading, Txt } from "@/src/components/ui";
import { apiFetch, errorMessage } from "@/src/api/client";
import { goBack } from "@/src/utils/navigation";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Return = { eligible: number; returned: number };
type Stats = {
  since: string;
  visitors: number;
  finished_a_practice: number;
  created_an_account: number;
  came_back_next_day_or_later: Return;
  came_back_after_a_week: Return;
  errors_last_7_days: { message: string; count: number }[];
};

function pct(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part * 100) / whole)}%` : "–";
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setS(await apiFetch<Stats>("/admin/stats"));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rows = s
    ? [
        { label: "Opened the app", value: s.visitors, note: "devices, last 30 days" },
        { label: "Finished a practice", value: s.finished_a_practice, note: `${pct(s.finished_a_practice, s.visitors)} of them` },
        { label: "Created an account", value: s.created_an_account, note: `${pct(s.created_an_account, s.visitors)} of them` },
        {
          label: "Came back another day",
          value: s.came_back_next_day_or_later.returned,
          note: `${pct(s.came_back_next_day_or_later.returned, s.came_back_next_day_or_later.eligible)} of ${s.came_back_next_day_or_later.eligible} who could have`,
        },
        {
          label: "Came back after a week",
          value: s.came_back_after_a_week.returned,
          note: `${pct(s.came_back_after_a_week.returned, s.came_back_after_a_week.eligible)} of ${s.came_back_after_a_week.eligible} who could have`,
        },
      ]
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router)} hitSlop={12}>
          <CaretLeft size={24} color={colors.onSurface} />
        </Pressable>
      </View>
      {!s ? (
        error ? <ErrorState message={error} onRetry={load} /> : <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}>
          <Txt variant="display" style={{ fontSize: 32, lineHeight: 38 }}>Usage</Txt>
          <Txt variant="bodySm" color={colors.muted} style={{ marginTop: spacing.xs }}>
            {`Since ${s.since}. Counted by device, from Immortal's own records.`}
          </Txt>
          {rows.map((r) => (
            <View key={r.label} style={styles.row} testID="stats-row">
              <Txt style={styles.num}>{r.value}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="label">{r.label}</Txt>
                <Txt variant="caption" color={colors.muted}>{r.note.toUpperCase()}</Txt>
              </View>
            </View>
          ))}
          <Txt variant="title" style={{ marginTop: spacing.xxl }}>Errors this week</Txt>
          {s.errors_last_7_days.length === 0 ? (
            <Txt variant="bodySm" color={colors.muted} style={{ marginTop: spacing.sm }}>None reported.</Txt>
          ) : (
            s.errors_last_7_days.map((e) => (
              <View key={e.message} style={styles.error}>
                <Txt variant="caption" color={colors.error}>{e.count}×</Txt>
                <Txt variant="bodySm" style={{ flex: 1 }}>{e.message || "(no message)"}</Txt>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  bar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  num: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, minWidth: 56, color: colors.onSurface, fontVariant: ["tabular-nums"] },
  error: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
