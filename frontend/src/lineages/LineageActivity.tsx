// "In your lineages" on Today: who else practised and what they wrote. The
// reason to come back to a long practice is the people carrying it with you.
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Txt } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";
import type { LineageActivity as Activity } from "./types";

function whoPractised(a: Activity): string {
  if (a.carried_recently === 0) return "No one else has logged a day in the last 24 hours.";
  const named = a.recent_names.filter(Boolean);
  const rest = a.carried_recently - named.length;
  const names = named.length ? named.join(", ") + (rest > 0 ? ` and ${rest} more` : "") : `${a.carried_recently} people`;
  return `${names} practised it in the last day.`;
}

export function LineageActivity({ items }: { items: Activity[] }) {
  const router = useRouter();
  if (items.length === 0) return null;
  return (
    <View style={styles.wrap} testID="today-lineages">
      <Txt variant="caption" color={colors.muted}>IN YOUR LINEAGES</Txt>
      {items.slice(0, 3).map((a) => (
        <Pressable
          key={a.lineage_id}
          onPress={() => router.push(`/lineage/${a.lineage_id}`)}
          style={styles.row}
          testID={`today-lineage-${a.lineage_id}`}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
            {a.chinese ? <Txt variant="label" color={colors.brandSecondary}>{a.chinese}</Txt> : null}
            <Txt variant="label" style={{ flex: 1 }}>{a.title}</Txt>
            {a.new_notes > 0 ? (
              <View style={styles.badge}>
                <Txt variant="caption" color={colors.onBrandPrimary}>
                  {a.new_notes} NEW {a.new_notes === 1 ? "NOTE" : "NOTES"}
                </Txt>
              </View>
            ) : null}
          </View>
          <Txt variant="bodySm" color={colors.onSurfaceSecondary} style={{ marginTop: 4 }}>
            {whoPractised(a)}
          </Txt>
          {a.latest_note ? (
            <Txt variant="bodySm" color={colors.muted} numberOfLines={2} style={{ marginTop: 4 }}>
              {a.latest_note.from_author ? "From whoever recorded it" : a.latest_note.author ?? "A practitioner"}: “{a.latest_note.body}”
            </Txt>
          ) : null}
          <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: spacing.sm }}>
            {a.checked_in_today ? "YOUR DAY IS LOGGED" : "LOG TODAY WHEN YOU HAVE PRACTISED"}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xxl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider },
  row: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brandPrimary,
  },
});
