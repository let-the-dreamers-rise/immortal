// The card that teaches one movement: where to start, what moves, where the
// breath goes, how many times, and the usual mistake.
import { StyleSheet, View } from "react-native";

import { Txt } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

export type StepDetail = {
  start: string;
  move: string;
  breath: string;
  times: string;
  watch: string;
};

const ROWS: { key: keyof StepDetail; label: string }[] = [
  { key: "start", label: "Start" },
  { key: "move", label: "Move" },
  { key: "breath", label: "Breath" },
  { key: "times", label: "How many" },
  { key: "watch", label: "Watch for" },
];

export function StepDetailCard({ detail, compact = false }: { detail: StepDetail; compact?: boolean }) {
  return (
    <View style={[styles.card, compact && styles.compact]} testID="step-detail">
      {ROWS.filter((r) => detail[r.key]).map((r) => (
        <View key={r.key} style={styles.row}>
          <Txt variant="caption" color={colors.brandSecondary} style={styles.label}>
            {r.label.toUpperCase()}
          </Txt>
          <Txt variant="bodySm" color={colors.onSurfaceSecondary} style={{ flex: 1 }}>
            {detail[r.key]}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignSelf: "stretch",
  },
  compact: { padding: spacing.md },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  label: { width: 76, paddingTop: 2, letterSpacing: 1 },
});
