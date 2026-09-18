import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleIcon as Circle, Trash, Globe, Lock } from "phosphor-react-native";
import * as Haptics from "expo-haptics";

import { Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

type Log = {
  log_id: string;
  body: string;
  mood?: string | null;
  nothing_happened: boolean;
  visibility: string;
  created_at: string;
  practice_titles: string[];
  comment_count: number;
};

const MOOD_LABEL: Record<string, string> = {
  still: "Still", open: "Open", tired: "Tired", restless: "Restless", light: "Light",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ logs: Log[] }>("/logs/me");
      setLogs(res.logs);
    } catch {
      setLogs([]);
    }
  }, []);

  // Wait for the session token to be restored before fetching: a gated request
  // sent during bootstrap 401s, and the catch above would pin an empty timeline.
  useFocusEffect(useCallback(() => { if (!authLoading) load(); }, [authLoading, load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const logNothing = async () => {
    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await apiFetch("/logs", { method: "POST", body: { nothing_happened: true, visibility: "private" } });
      await load();
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    setPendingDelete(null);
    await apiFetch(`/logs/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Txt variant="title" style={{ fontSize: 22 }}>Your Journal</Txt>
        <Txt variant="bodySm" style={{ marginTop: 2 }}>A quiet record of your practice — however it went.</Txt>
      </View>

      {!logs ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        >
          <View style={styles.quick}>
            <Button
              label="Write today's reflection"
              onPress={() => router.push("/log/new")}
              testID="journal-write-button"
            />
            <Pressable
              testID="journal-nothing-button"
              onPress={logNothing}
              disabled={posting}
              style={({ pressed }) => [styles.nothingBtn, pressed && { opacity: 0.7 }]}
            >
              <Circle size={18} color={colors.brandSecondary} weight="regular" />
              <Txt variant="label" color={colors.onSurfaceSecondary} style={{ marginLeft: spacing.sm }}>
                Nothing happened today
              </Txt>
            </Pressable>
            <Txt variant="caption" center style={{ marginTop: spacing.sm }}>
              “Nothing” is a real entry. Showing up is the practice.
            </Txt>
          </View>

          {logs.length === 0 ? (
            <View style={{ marginTop: spacing.xxxl }}>
              <EmptyState title="Your timeline is empty" body="Begin today's reflection above — even a single line counts." />
            </View>
          ) : (
            <View style={{ marginTop: spacing.xl }}>
              {logs.map((l, i) => (
                <View key={l.log_id}>
                  {i > 0 && <View style={styles.tornDivider} />}
                  <View style={styles.entry} testID={`journal-entry-${l.log_id}`}>
                    <View style={styles.entryHead}>
                      <Txt variant="caption" color={colors.brandSecondary}>{formatDate(l.created_at).toUpperCase()}</Txt>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                        {l.visibility === "public" ? (
                          <Globe size={14} color={colors.muted} weight="regular" />
                        ) : (
                          <Lock size={14} color={colors.muted} weight="regular" />
                        )}
                        <Pressable onPress={() => setPendingDelete(pendingDelete === l.log_id ? null : l.log_id)} hitSlop={10} testID={`journal-delete-${l.log_id}`}>
                          <Trash size={15} color={pendingDelete === l.log_id ? colors.error : colors.muted} weight="regular" />
                        </Pressable>
                      </View>
                    </View>
                    {pendingDelete === l.log_id ? (
                      <View style={styles.confirmRow}>
                        <Txt variant="bodySm" style={{ flex: 1 }}>Remove this entry?</Txt>
                        <Pressable onPress={() => setPendingDelete(null)} hitSlop={8} style={{ marginRight: spacing.lg }}>
                          <Txt variant="label" color={colors.onSurfaceSecondary}>Keep</Txt>
                        </Pressable>
                        <Pressable onPress={() => remove(l.log_id)} hitSlop={8} testID={`journal-delete-confirm-${l.log_id}`}>
                          <Txt variant="label" color={colors.error}>Remove</Txt>
                        </Pressable>
                      </View>
                    ) : null}
                    {l.nothing_happened && !l.body ? (
                      <Txt variant="body" style={{ marginTop: spacing.sm, fontStyle: "italic" }} color={colors.onSurfaceSecondary}>
                        Nothing happened today — and that is part of it.
                      </Txt>
                    ) : (
                      <Txt variant="body" style={{ marginTop: spacing.sm }}>{l.body}</Txt>
                    )}
                    <View style={styles.tags}>
                      {l.mood ? <Txt variant="caption">{(MOOD_LABEL[l.mood] || l.mood).toUpperCase()}</Txt> : null}
                      {l.practice_titles.map((t) => (
                        <Txt key={t} variant="caption" color={colors.brandPrimary}>· {t}</Txt>
                      ))}
                    </View>
                    {l.visibility === "public" ? (
                      <Pressable onPress={() => router.push(`/log/${l.log_id}`)} style={styles.repliesLink} testID={`journal-replies-${l.log_id}`}>
                        <Txt variant="caption" color={colors.brandSecondary}>
                          {l.comment_count > 0 ? `VIEW ${l.comment_count} REPL${l.comment_count === 1 ? "Y" : "IES"}` : "SHARED PUBLICLY · VIEW"}
                        </Txt>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  quick: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nothingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
  },
  tornDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg, marginHorizontal: spacing.sm },
  entry: {},
  entryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  confirmRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  repliesLink: { marginTop: spacing.sm },
});
