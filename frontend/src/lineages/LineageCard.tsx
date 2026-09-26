import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { GitBranch, NotePencil, UsersThree } from "phosphor-react-native";

import { Txt } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

import { horizonLabel, type Lineage } from "./types";

export function LineageCard({ lineage }: { lineage: Lineage }) {
  const router = useRouter();
  const p = lineage.my_progress;
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/lineage/${lineage.lineage_id}`)}
      testID={`lineage-${lineage.lineage_id}`}
    >
      <View style={styles.top}>
        <Txt variant="caption" color={colors.brandPrimary}>
          {horizonLabel(lineage.horizon_days).toUpperCase()} · {lineage.daily_minutes} MIN A DAY
        </Txt>
        {lineage.chinese ? <Txt variant="label" color={colors.brandSecondary}>{lineage.chinese}</Txt> : null}
      </View>
      <Txt variant="title" style={{ fontSize: 20, marginTop: 2 }}>{lineage.title}</Txt>
      <Txt variant="bodySm" numberOfLines={2} style={{ marginTop: spacing.xs }}>{lineage.summary}</Txt>

      {p ? (
        <View style={{ marginTop: spacing.md }}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(2, p.percent)}%` }]} />
          </View>
          <Txt variant="caption" style={{ marginTop: 4 }}>
            YOU: {p.days_practised} OF {lineage.horizon_days} DAYS{p.checked_in_today ? " · LOGGED TODAY" : ""}
          </Txt>
        </View>
      ) : null}

      <View style={styles.meta}>
        <Meta icon={<UsersThree size={13} color={colors.muted} />} text={`${lineage.practitioners} carrying`} />
        <Meta icon={<NotePencil size={13} color={colors.muted} />} text={`${lineage.note_count} notes`} />
        {lineage.branch_count > 0 ? (
          <Meta icon={<GitBranch size={13} color={colors.muted} />} text={`${lineage.branch_count} branches`} />
        ) : null}
      </View>
      <Txt variant="caption" style={{ marginTop: spacing.xs }}>
        RECORDED BY {(lineage.author.display_name ?? "a practitioner").toUpperCase()}
      </Txt>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {icon}
      <Txt variant="caption" style={{ marginLeft: 4 }}>{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.brandPrimary },
  meta: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
});
