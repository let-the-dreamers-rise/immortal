import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, GitBranch, Trash, Warning } from "phosphor-react-native";

import { Avatar, Button, Chip, Divider, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { LineageCard } from "@/src/lineages/LineageCard";
import { horizonLabel, NOTE_KINDS, type LineageDetail, type LineageNote } from "@/src/lineages/types";

export default function LineageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<LineageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState<LineageNote["kind"]>("observation");

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await apiFetch<LineageDetail>(`/lineages/${id}`));
    } catch (e: any) {
      setError(e?.message ?? "Could not load this lineage.");
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e: any) {
      Alert.alert("Something went wrong", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const join = () => act(() => apiFetch(`/lineages/${id}/join`, { method: "POST" }));
  const checkin = () => act(() => apiFetch(`/lineages/${id}/checkin`, { method: "POST" }));
  const leave = () =>
    Alert.alert("Set this lineage down?", "Your logged days for it will be cleared. Your notes stay.", [
      { text: "Keep carrying", style: "cancel" },
      { text: "Set down", style: "destructive", onPress: () => act(() => apiFetch(`/lineages/${id}/join`, { method: "DELETE" })) },
    ]);
  const remove = () =>
    Alert.alert("Delete this lineage?", "Everyone carrying it will lose it. Branches stay.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/lineages/${id}`, { method: "DELETE" });
            router.back();
          } catch (e: any) {
            Alert.alert("Could not delete", e?.message ?? "Please try again.");
          }
        },
      },
    ]);

  const addNote = () => {
    const body = noteBody.trim();
    if (body.length < 2) return;
    act(async () => {
      await apiFetch(`/lineages/${id}/notes`, { method: "POST", body: { body, kind: noteKind } });
      setNoteBody("");
    });
  };

  const deleteNote = (noteId: string) => act(() => apiFetch(`/lineage-notes/${noteId}`, { method: "DELETE" }));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackBar onBack={() => router.back()} />
        {error ? <Txt variant="bodySm" color={colors.error} center style={{ marginTop: spacing.xl }}>{error}</Txt> : <Loading />}
      </View>
    );
  }

  const { lineage: l, notes, branches, carriers } = data;
  const p = l.my_progress;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackBar onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        keyboardShouldPersistTaps="handled"
      >
        {l.chinese ? <Txt variant="displaySm" color={colors.brandSecondary}>{l.chinese}</Txt> : null}
        <Txt variant="display" style={{ fontSize: 32, lineHeight: 36 }}>{l.title}</Txt>
        <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: spacing.sm }}>
          {horizonLabel(l.horizon_days).toUpperCase()} · {l.daily_minutes} MIN A DAY · {l.practitioners} CARRYING
        </Txt>
        <Txt variant="caption" style={{ marginTop: spacing.xs }}>
          RECORDED BY {(l.author.display_name ?? "a practitioner").toUpperCase()}
        </Txt>
        {l.parent ? (
          <Pressable onPress={() => router.push(`/lineage/${l.parent!.lineage_id}`)} style={styles.parentLink}>
            <GitBranch size={14} color={colors.brandPrimary} />
            <Txt variant="bodySm" color={colors.brandPrimary} style={{ marginLeft: 6 }}>
              Branch of {l.parent.title}
            </Txt>
          </Pressable>
        ) : null}
        {l.practice ? (
          <Pressable onPress={() => router.push(`/practice/${l.practice!.practice_id}`)} style={styles.parentLink}>
            <Txt variant="bodySm" color={colors.brandPrimary}>From the library: {l.practice.title}</Txt>
          </Pressable>
        ) : null}

        <Txt variant="body" style={{ marginTop: spacing.lg }}>{l.summary}</Txt>

        {/* My progress */}
        <View style={styles.progressBox}>
          {p ? (
            <>
              <Txt variant="label">Day {p.days_since_start} since you took this up</Txt>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(2, p.percent)}%` }]} />
              </View>
              <Txt variant="caption">
                {p.days_practised} OF {l.horizon_days} DAYS PRACTISED. MISSED DAYS COST NOTHING.
              </Txt>
              <Button
                label={p.checked_in_today ? "Logged for today" : "I practised today"}
                onPress={checkin}
                disabled={p.checked_in_today}
                loading={busy}
                style={{ marginTop: spacing.md }}
                testID="lineage-checkin"
              />
              {!l.is_author ? (
                <Pressable onPress={leave} style={{ alignItems: "center", marginTop: spacing.md }} testID="lineage-leave">
                  <Txt variant="bodySm" color={colors.muted}>Set this lineage down</Txt>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Txt variant="bodySm">Take this up to log your days and see how far you have carried it.</Txt>
              <Button label="Take up this lineage" onPress={join} loading={busy} style={{ marginTop: spacing.md }} testID="lineage-join" />
            </>
          )}
        </View>

        <Section title="The method" />
        <Txt variant="body">{l.method}</Txt>

        {l.cautions ? (
          <View style={styles.caution}>
            <Warning size={18} color={colors.warning} />
            <Txt variant="bodySm" style={{ flex: 1, marginLeft: spacing.sm }}>{l.cautions}</Txt>
          </View>
        ) : null}

        <Button
          label="Start a branch from this"
          variant="ghost"
          small
          onPress={() => router.push({ pathname: "/lineage/new", params: { parent: l.lineage_id } })}
          style={{ marginTop: spacing.lg }}
          testID="lineage-branch"
        />

        {/* Field notes */}
        <Section title={`Field notes (${notes.length})`} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {NOTE_KINDS.map((k) => (
            <Chip key={k.key} label={k.label} active={noteKind === k.key} onPress={() => setNoteKind(k.key)} testID={`note-kind-${k.key}`} />
          ))}
        </View>
        <TextInput
          value={noteBody}
          onChangeText={setNoteBody}
          placeholder="What did you notice? Nothing at all is worth recording too."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          style={styles.input}
          testID="lineage-note-input"
        />
        <Button label="Add note" small variant="secondary" onPress={addNote} disabled={noteBody.trim().length < 2} loading={busy} testID="lineage-note-submit" />

        {notes.map((n) => (
          <View key={n.note_id} style={styles.note}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Avatar name={n.author.display_name} uri={n.author.picture} size={28} />
              <View style={{ flex: 1 }}>
                <Txt variant="label">{n.author.display_name ?? "A practitioner"}</Txt>
                <Txt variant="caption">
                  {n.kind.toUpperCase()}
                  {n.day ? ` · DAY ${n.day}` : ""} · {new Date(n.created_at).toLocaleDateString()}
                </Txt>
              </View>
              {n.user_id === user?.user_id ? (
                <Pressable onPress={() => deleteNote(n.note_id)} hitSlop={10}>
                  <Trash size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
            <Txt variant="body" style={{ marginTop: spacing.sm }}>{n.body}</Txt>
          </View>
        ))}

        {branches.length > 0 ? (
          <>
            <Section title="Branches" />
            {branches.map((b) => <LineageCard key={b.lineage_id} lineage={b} />)}
          </>
        ) : null}

        {carriers.length > 0 ? (
          <>
            <Section title="Carrying it" />
            {carriers.map((c) => (
              <Pressable key={c.user_id} style={styles.carrier} onPress={() => router.push(`/user/${c.user_id}`)}>
                <Avatar name={c.display_name} uri={c.picture} size={32} />
                <Txt variant="label" style={{ flex: 1, marginLeft: spacing.md }}>{c.display_name ?? "A practitioner"}</Txt>
                <Txt variant="caption">{c.days_practised} DAYS</Txt>
              </Pressable>
            ))}
          </>
        ) : null}

        {l.is_author ? (
          <Pressable onPress={remove} style={{ alignItems: "center", marginTop: spacing.xxl }} testID="lineage-delete">
            <Txt variant="bodySm" color={colors.error}>Delete this lineage</Txt>
          </Pressable>
        ) : null}

        <Txt variant="caption" center style={{ marginTop: spacing.xxl, lineHeight: 16 }}>
          Lineages are personal records, not medical advice or tested protocols.
        </Txt>
      </ScrollView>
    </View>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.backBar}>
      <Pressable onPress={onBack} hitSlop={12} testID="lineage-back">
        <CaretLeft size={24} color={colors.onSurface} />
      </Pressable>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <>
      <Divider style={{ marginVertical: spacing.xl }} />
      <Txt variant="title" style={{ marginBottom: spacing.md }}>{title}</Txt>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  backBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  parentLink: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  progressBox: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.brandPrimary },
  caution: {
    flexDirection: "row",
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#F0E6D0",
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 90,
    textAlignVertical: "top",
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    marginVertical: spacing.md,
  },
  note: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  carrier: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
});
