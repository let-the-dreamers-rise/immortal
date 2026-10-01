// Moderator queue: reported items, most-reported first. Visible only to the
// accounts listed in the server's ADMIN_EMAILS.
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft } from "@/src/components/icons";

import { Button, EmptyState, ErrorState, Loading, Txt } from "@/src/components/ui";
import { apiFetch, errorMessage } from "@/src/api/client";
import { confirmAction, notify } from "@/src/utils/feedback";
import { goBack } from "@/src/utils/navigation";
import { colors, radius, spacing } from "@/src/theme";

type Item = {
  kind: string;
  target_id: string;
  author_id?: string;
  target: { title?: string; text?: string; display_name?: string; bio?: string; hidden?: boolean; deleted?: boolean } | null;
  reports: { reason: string; details?: string; created_at: string }[];
};

export default function Moderation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems((await apiFetch<{ items: Item[] }>("/admin/reports")).items);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resolve = async (it: Item, action: "hide" | "restore" | "dismiss" | "suspend") => {
    if (action === "suspend") {
      const ok = await confirmAction("Suspend this account?", "They are signed out everywhere and cannot sign back in.", "Suspend", true);
      if (!ok) return;
    }
    try {
      await apiFetch(`/admin/reports/${it.kind}/${it.target_id}`, { method: "POST", body: { action } });
      setItems((prev) => (prev ?? []).filter((x) => !(x.kind === it.kind && x.target_id === it.target_id)));
    } catch (e) {
      notify("Could not save", errorMessage(e));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router)} hitSlop={10}>
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Txt variant="label">Reports</Txt>
        <View style={{ width: 22 }} />
      </View>
      {items === null ? (
        error ? <ErrorState message={error} onRetry={load} /> : <Loading />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing to review" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
          {items.map((it) => (
            <View key={`${it.kind}:${it.target_id}`} style={styles.card}>
              <Txt variant="caption" color={colors.brandPrimary}>
                {it.kind.toUpperCase()} · {it.reports.length} REPORT{it.reports.length === 1 ? "" : "S"}
                {it.target?.hidden ? " · HIDDEN" : ""}
                {it.target?.deleted ? " · DELETED BY AUTHOR" : ""}
              </Txt>
              {it.target?.title || it.target?.display_name ? (
                <Txt variant="label" style={{ marginTop: spacing.xs }}>{it.target?.title || it.target?.display_name}</Txt>
              ) : null}
              <Txt variant="bodySm" style={{ marginTop: spacing.xs }}>
                {it.target ? it.target.text || it.target.bio || "(no text)" : "(already gone)"}
              </Txt>
              {it.reports.map((r, i) => (
                <Txt key={i} variant="caption" style={{ marginTop: spacing.xs }}>
                  {r.reason.replace("_", " ")}{r.details ? `: ${r.details}` : ""}
                </Txt>
              ))}
              <View style={styles.actions}>
                {it.kind !== "user" ? (
                  it.target?.hidden ? (
                    <Button label="Restore" small variant="ghost" onPress={() => resolve(it, "restore")} />
                  ) : (
                    <Button label="Hide" small onPress={() => resolve(it, "hide")} />
                  )
                ) : null}
                <Button label="Dismiss" small variant="ghost" onPress={() => resolve(it, "dismiss")} />
                <Button label="Suspend author" small variant="ghost" onPress={() => resolve(it, "suspend")} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  card: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
});
