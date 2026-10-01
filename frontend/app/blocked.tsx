// The people you have blocked, and a way to undo it.
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft } from "phosphor-react-native";

import { Avatar, Button, EmptyState, ErrorState, Loading, Txt } from "@/src/components/ui";
import { apiFetch, errorMessage } from "@/src/api/client";
import { notify } from "@/src/utils/feedback";
import { goBack } from "@/src/utils/navigation";
import { colors, spacing } from "@/src/theme";

type Person = { user_id: string; display_name: string; picture?: string | null };

export default function Blocked() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPeople((await apiFetch<{ blocked: Person[] }>("/blocks")).blocked);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unblock = async (p: Person) => {
    try {
      await apiFetch(`/blocks/${p.user_id}`, { method: "DELETE" });
      setPeople((prev) => (prev ?? []).filter((x) => x.user_id !== p.user_id));
    } catch (e) {
      notify("Could not unblock", errorMessage(e));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => goBack(router)} hitSlop={10} testID="blocked-back">
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Txt variant="label">Blocked people</Txt>
        <View style={{ width: 22 }} />
      </View>
      {people === null ? (
        error ? <ErrorState message={error} onRetry={load} /> : <Loading />
      ) : people.length === 0 ? (
        <EmptyState title="No one is blocked" body="Block someone from the ··· menu on their post or profile." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
          {people.map((p) => (
            <View key={p.user_id} style={styles.row}>
              <Avatar name={p.display_name} uri={p.picture} size={36} />
              <Txt variant="label" style={{ flex: 1, marginLeft: spacing.md }}>{p.display_name}</Txt>
              <Button label="Unblock" variant="ghost" small onPress={() => unblock(p)} testID={`unblock-${p.user_id}`} />
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
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
});
