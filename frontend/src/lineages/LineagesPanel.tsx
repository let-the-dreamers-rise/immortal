import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Chip, EmptyState, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { colors, spacing } from "@/src/theme";

import { LineageCard } from "./LineageCard";
import type { Lineage } from "./types";

/** The Lineages tab inside Community. `reloadKey` changes on pull-to-refresh / focus. */
export function LineagesPanel({ reloadKey }: { reloadKey: number }) {
  const router = useRouter();
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [items, setItems] = useState<Lineage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch<{ lineages: Lineage[] }>(`/lineages?scope=${scope}`);
      setItems(res.lineages);
    } catch (e: any) {
      setError(e?.message ?? "Could not load lineages.");
      setItems([]);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <View style={{ paddingHorizontal: spacing.xl }}>
      <Txt variant="bodySm" style={{ marginBottom: spacing.md }}>
        Long practices, most never formally tested, carried by members over months and years. Take one up, log
        your days, and leave notes the next person can build on.
      </Txt>
      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.md }}>
        <Chip label="All lineages" active={scope === "all"} onPress={() => setScope("all")} testID="lineages-scope-all" />
        <Chip label="Carrying" active={scope === "mine"} onPress={() => setScope("mine")} testID="lineages-scope-mine" />
        <View style={{ flex: 1 }} />
        <Button label="Record one" small onPress={() => router.push("/lineage/new")} testID="lineage-new-button" />
      </View>
      {error ? <Txt variant="bodySm" color={colors.error}>{error}</Txt> : null}
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <View style={{ paddingVertical: spacing.xxxl }}>
          <EmptyState
            title={scope === "mine" ? "Nothing carried yet" : "No lineages yet"}
            body={scope === "mine" ? "Take up a lineage to see it here." : "Record the first long practice."}
          />
        </View>
      ) : (
        items.map((l) => <LineageCard key={l.lineage_id} lineage={l} />)
      )}
    </View>
  );
}
