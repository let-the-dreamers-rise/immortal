// What someone sees when they open an invitation to a lineage without an
// account: enough to decide, and one step to join the people carrying it.
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, ErrorState, Loading, Txt } from "@/src/components/ui";
import { apiFetch, errorMessage } from "@/src/api/client";
import { rememberPath } from "@/src/utils/pendingPath";
import { colors, radius, spacing } from "@/src/theme";
import { horizonLabel, type LineagePreview as Preview } from "./types";

export function LineagePreview({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData((await apiFetch<{ lineage: Preview }>(`/lineages/${encodeURIComponent(id)}/preview`)).lineage);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const go = async (mode: "register" | "login") => {
    await rememberPath(`/lineage/${id}`);
    router.push(mode === "register" ? "/auth?mode=register" : "/auth");
  };

  if (!data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {error ? <ErrorState message={error} onRetry={load} /> : <Loading />}
      </View>
    );
  }

  const others = data.practitioners;
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }}
      testID="lineage-preview"
    >
      <Txt variant="caption" color={colors.brandSecondary}>YOU ARE INVITED TO CARRY A PRACTICE</Txt>
      {data.chinese ? (
        <Txt variant="displaySm" color={colors.brandSecondary} style={{ marginTop: spacing.lg }}>
          {data.chinese}
        </Txt>
      ) : null}
      <Txt variant="display" style={styles.title}>{data.title}</Txt>
      <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: spacing.sm }}>
        {horizonLabel(data.horizon_days).toUpperCase()} · {data.daily_minutes} MIN A DAY
      </Txt>
      <Txt variant="body" style={{ marginTop: spacing.lg }}>{data.summary}</Txt>

      <View style={styles.people}>
        <Txt variant="label">
          {others === 0
            ? "Nobody is carrying it yet. You could be the first."
            : `${others === 1 ? "1 person is" : `${others} people are`} carrying it${
                data.carried_recently > 0 ? `, ${data.carried_recently} in the last day` : ""
              }.`}
        </Txt>
        {data.author_name ? (
          <Txt variant="bodySm" color={colors.muted} style={{ marginTop: spacing.xs }}>
            Recorded by {data.author_name}. Each person logs their days and leaves notes for whoever comes next.
          </Txt>
        ) : null}
      </View>

      <Button label="Create a free account to carry it" onPress={() => go("register")} style={{ marginTop: spacing.xl }} testID="lineage-preview-register" />
      <Pressable onPress={() => go("login")} style={{ alignItems: "center", marginTop: spacing.lg }} testID="lineage-preview-login">
        <Txt variant="bodySm" color={colors.brandPrimary}>Already practising? Sign in</Txt>
      </Pressable>
      <Pressable onPress={() => router.replace("/welcome")} style={{ alignItems: "center", marginTop: spacing.md }}>
        <Txt variant="bodySm" color={colors.muted}>What is Immortal?</Txt>
      </Pressable>

      <Txt variant="caption" center style={{ marginTop: spacing.xxl, lineHeight: 16 }}>
        A personal practice drawn from history, not medical advice.
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  title: { fontSize: 34, lineHeight: 40 },
  people: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
