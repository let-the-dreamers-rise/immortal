import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GearSix } from "phosphor-react-native";

import { Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/src/theme";

// The Today screen exists to answer "what do I do now" before the question is
// asked. Everything on it is deliberately singular: one suggestion, one
// smaller alternative, one tree. A dashboard would defeat the point — a
// practitioner faced with a grid of options is back to deciding, which is the
// cost this screen was built to remove.

type Practice = {
  practice_id: string;
  title: string;
  category: string;
  time_min: number;
  seconds?: number;
  cue?: string;
  on_the_go?: boolean;
};

type Growth = {
  stage: string;
  glyph: string;
  label: string;
  line: string;
  days: number;
  next_at: number | null;
  next_label: string | null;
  progress: number;
};

type Today = {
  phase: string;
  phase_label: string;
  phase_line: string;
  logged_today: boolean;
  stage_title: string | null;
  stage_order: number | null;
  suggestion: Practice | null;
  alternative: Practice | null;
  growth: Growth;
  closing_line: string | null;
};

function duration(p: Practice) {
  if (p.seconds) return `${p.seconds} seconds`;
  return `${p.time_min} min`;
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Today | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Today>("/today"));
    } catch {
      setData(null);
    }
  }, []);

  // Wait for the session token to be restored before fetching.
  useFocusEffect(
    useCallback(() => {
      if (!authLoading) load();
    }, [authLoading, load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const g = data?.growth;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Txt variant="caption" color={colors.muted}>
          {data?.phase_label ?? ""}
        </Txt>
        <Pressable testID="today-settings-button" onPress={() => router.push("/settings")} hitSlop={12}>
          <GearSix size={22} color={colors.onSurfaceSecondary} weight="regular" />
        </Pressable>
      </View>

      {!data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />
          }
        >
          {/* The tree. Accumulated days, never a streak — a missed day costs
              nothing, so there is no number here that can punish anyone. */}
          <View style={styles.treeBlock} testID="today-growth">
            <Txt style={styles.glyph}>{g?.glyph}</Txt>
            <Txt variant="title" center style={{ marginTop: spacing.sm }}>
              {g?.label}
            </Txt>
            <Txt variant="bodySm" center color={colors.muted} style={styles.growthLine}>
              {g?.line}
            </Txt>

            {g?.next_at ? (
              <View style={styles.arcTrack}>
                <View style={[styles.arcFill, { flex: Math.max(0.02, g.progress) }]} />
                <View style={{ flex: Math.max(0.02, 1 - g.progress) }} />
              </View>
            ) : null}
            <Txt variant="caption" center color={colors.muted} style={{ marginTop: spacing.sm }}>
              {g?.days === 0
                ? "No days yet"
                : `${g?.days} ${g?.days === 1 ? "day" : "days"} of practice`}
            </Txt>
          </View>

          <View style={styles.rule} />

          {/* One suggestion. */}
          <View style={styles.body}>
            <Txt variant="bodySm" color={colors.muted} style={{ marginBottom: spacing.lg }}>
              {data.phase_line}
            </Txt>

            {data.logged_today ? (
              <View style={styles.restBlock} testID="today-complete">
                <Txt variant="title" style={{ lineHeight: 30 }}>
                  {data.closing_line}
                </Txt>
                <Txt variant="bodySm" color={colors.muted} style={{ marginTop: spacing.md }}>
                  Come back tomorrow, or sit with something else if you would like to. Neither is better.
                </Txt>
              </View>
            ) : data.suggestion ? (
              <>
                <Pressable
                  testID="today-suggestion"
                  onPress={() => router.push(`/practice/${data.suggestion!.practice_id}`)}
                  style={styles.suggestion}
                >
                  <Txt variant="caption" color={colors.brandSecondary}>
                    {duration(data.suggestion).toUpperCase()}
                    {data.suggestion.on_the_go ? " · ON THE WAY" : ""}
                  </Txt>
                  <Txt variant="display" style={styles.suggestionTitle}>
                    {data.suggestion.title}
                  </Txt>
                  {data.suggestion.cue ? (
                    <Txt variant="bodySm" color={colors.onSurfaceSecondary} style={{ marginTop: spacing.sm }}>
                      {data.suggestion.cue}
                    </Txt>
                  ) : null}
                </Pressable>

                {/* Always a smaller option, so there is a way to say yes on a
                    bad day rather than only a way to fail. */}
                {data.alternative ? (
                  <Pressable
                    testID="today-alternative"
                    onPress={() => router.push(`/practice/${data.alternative!.practice_id}`)}
                    style={styles.alt}
                  >
                    <Txt variant="bodySm" color={colors.onSurfaceSecondary}>
                      Or something smaller —{" "}
                      <Txt variant="bodySm" color={colors.brandPrimary}>
                        {data.alternative.title}
                      </Txt>
                      , {duration(data.alternative)}.
                    </Txt>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Txt variant="bodySm" color={colors.muted}>
                Nothing to suggest just now.
              </Txt>
            )}

            {data.stage_title ? (
              <Pressable
                testID="today-stage-link"
                onPress={() =>
                  data.stage_order ? router.push(`/stage/${data.stage_order}`) : router.push("/")
                }
                style={styles.stageRow}
              >
                <Txt variant="caption" color={colors.muted}>
                  ON THE PATH
                </Txt>
                <Txt variant="body" style={{ marginTop: 2 }}>
                  {data.stage_title}
                </Txt>
              </Pressable>
            ) : null}

            <Pressable
              testID="today-journal-link"
              onPress={() => router.push("/log/new")}
              style={styles.journalRow}
            >
              <Txt variant="bodySm" color={colors.brandPrimary}>
                {data.logged_today ? "Add another reflection" : "Write today's reflection"}
              </Txt>
              <Txt variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
                Nothing happened today is a complete entry.
              </Txt>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  treeBlock: { alignItems: "center", paddingTop: spacing.xl, paddingHorizontal: spacing.xl },
  glyph: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 76,
    color: colors.onSurface,
  },
  growthLine: { marginTop: spacing.xs, maxWidth: 300, lineHeight: 20 },
  arcTrack: {
    flexDirection: "row",
    height: 2,
    width: 140,
    marginTop: spacing.lg,
    backgroundColor: colors.divider,
    borderRadius: 1,
    overflow: "hidden",
  },
  arcFill: { backgroundColor: colors.brandSecondary },
  rule: {
    height: 1,
    backgroundColor: colors.divider,
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xxl,
  },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  suggestion: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  suggestionTitle: { fontSize: 28, lineHeight: 34, marginTop: spacing.sm },
  alt: { marginTop: spacing.lg, paddingVertical: spacing.xs },
  restBlock: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  stageRow: {
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  journalRow: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
