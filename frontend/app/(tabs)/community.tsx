import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown, Flame, GearSix } from "phosphor-react-native";

import { Avatar, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, IMAGES, radius, spacing } from "@/src/theme";

type Stats = {
  streak_current: number;
  streak_longest: number;
  total_days: number;
  total_logs: number;
  is_elder: boolean;
  milestones_achieved: number[];
  stages_completed: number;
  stages_total: number;
};

type Practitioner = {
  user_id: string;
  display_name: string;
  picture?: string | null;
  intention?: string | null;
  is_elder: boolean;
  streak_longest: number;
  is_following: boolean;
};

type FeedLog = {
  log_id: string;
  body: string;
  nothing_happened: boolean;
  created_at: string;
  author: { user_id: string; display_name: string; picture?: string | null };
  practice_titles: string[];
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<"practitioners" | "feed">("practitioners");
  const [stats, setStats] = useState<Stats | null>(null);
  const [people, setPeople] = useState<Practitioner[]>([]);
  const [feed, setFeed] = useState<FeedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p, f] = await Promise.all([
        apiFetch<{ stats: Stats }>("/stats/me"),
        apiFetch<{ practitioners: Practitioner[] }>("/community/practitioners"),
        apiFetch<{ logs: FeedLog[] }>("/logs/feed"),
      ]);
      setStats(s.stats);
      setPeople(p.practitioners);
      setFeed(f.logs);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleFollow = async (p: Practitioner) => {
    setPeople((prev) => prev.map((x) => (x.user_id === p.user_id ? { ...x, is_following: !x.is_following } : x)));
    try {
      await apiFetch(`/community/users/${p.user_id}/follow`, { method: p.is_following ? "DELETE" : "POST" });
    } catch {
      load();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Txt variant="title" style={{ fontSize: 22 }}>Community</Txt>
        <Pressable testID="community-settings-button" onPress={() => router.push("/settings")} hitSlop={12}>
          <GearSix size={24} color={colors.onSurfaceSecondary} weight="regular" />
        </Pressable>
      </View>

      {loading ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        >
          {/* Profile banner */}
          <View style={styles.banner}>
            <Image source={{ uri: IMAGES.profileHero }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["rgba(26,25,24,0.25)", "rgba(26,25,24,0.85)"]} style={StyleSheet.absoluteFill} />
            <View style={styles.bannerContent}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <Avatar name={user?.display_name} uri={user?.picture} size={56} />
                <View style={{ flex: 1 }}>
                  <Txt variant="title" color={colors.onSurfaceInverse} style={{ fontSize: 22 }}>{user?.display_name}</Txt>
                  {stats?.is_elder ? (
                    <View style={styles.elderRow}>
                      <Crown size={14} color={colors.warning} weight="fill" />
                      <Txt variant="caption" color={colors.warning} style={{ marginLeft: 4 }}>ELDER</Txt>
                    </View>
                  ) : (
                    <Txt variant="caption" color={colors.onSurfaceInverse} style={{ opacity: 0.8 }}>PRACTITIONER</Txt>
                  )}
                </View>
              </View>
              <View style={styles.statRow}>
                <Stat value={stats?.streak_current ?? 0} label="Day streak" inverse />
                <Stat value={stats?.total_days ?? 0} label="Days practiced" inverse />
                <Stat value={`${stats?.stages_completed ?? 0}/${stats?.stages_total ?? 4}`} label="Stages" inverse />
              </View>
            </View>
          </View>

          {/* Milestones */}
          <View style={styles.milestones}>
            {[7, 30, 90, 365].map((m) => {
              const got = stats?.milestones_achieved.includes(m);
              return (
                <View key={m} style={[styles.milestone, got && { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary }]}>
                  <Txt style={{ fontFamily: fonts.display, fontSize: 20, color: got ? colors.onSurface : colors.muted }}>{m}</Txt>
                  <Txt variant="caption" color={got ? colors.brandPrimary : colors.muted}>DAYS</Txt>
                </View>
              );
            })}
          </View>

          {/* Tabs */}
          <View style={styles.segment}>
            <SegBtn label="Practitioners" active={tab === "practitioners"} onPress={() => setTab("practitioners")} testID="community-tab-practitioners" />
            <SegBtn label="Shared Logs" active={tab === "feed"} onPress={() => setTab("feed")} testID="community-tab-feed" />
          </View>

          {tab === "practitioners" ? (
            people.length === 0 ? (
              <EmptyStateBlock title="No fellow travelers yet" body="As others join and begin their path, you'll find them here." />
            ) : (
              <View style={{ paddingHorizontal: spacing.xl }}>
                {people.map((p) => (
                  <Pressable
                    key={p.user_id}
                    testID={`practitioner-${p.user_id}`}
                    style={styles.personRow}
                    onPress={() => router.push(`/user/${p.user_id}`)}
                  >
                    <Avatar name={p.display_name} uri={p.picture} size={44} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                        <Txt variant="label">{p.display_name}</Txt>
                        {p.is_elder ? <Crown size={13} color={colors.warning} weight="fill" /> : null}
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                        <Flame size={12} color={colors.brandSecondary} weight="regular" />
                        <Txt variant="caption" style={{ marginLeft: 3 }}>Best streak {p.streak_longest}d</Txt>
                      </View>
                    </View>
                    <Button
                      label={p.is_following ? "Following" : "Follow"}
                      variant={p.is_following ? "secondary" : "primary"}
                      small
                      onPress={() => toggleFollow(p)}
                      testID={`follow-${p.user_id}`}
                    />
                  </Pressable>
                ))}
              </View>
            )
          ) : feed.length === 0 ? (
            <EmptyStateBlock title="The community is resting" body="Share a reflection publicly from your journal to start the conversation." />
          ) : (
            <View style={{ paddingHorizontal: spacing.xl }}>
              {feed.map((l, i) => (
                <View key={l.log_id}>
                  {i > 0 && <View style={styles.feedDivider} />}
                  <Pressable style={styles.feedItem} onPress={() => router.push(`/user/${l.author.user_id}`)} testID={`feed-log-${l.log_id}`}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      <Avatar name={l.author.display_name} uri={l.author.picture} size={32} />
                      <Txt variant="label">{l.author.display_name}</Txt>
                    </View>
                    <Txt variant="body" style={{ marginTop: spacing.sm }}>
                      {l.nothing_happened && !l.body ? "Nothing happened today — and that is part of it." : l.body}
                    </Txt>
                    {l.practice_titles.length > 0 ? (
                      <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: spacing.sm }}>
                        {l.practice_titles.join(" · ")}
                      </Txt>
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ value, label, inverse }: { value: number | string; label: string; inverse?: boolean }) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Txt style={{ fontFamily: fonts.displayBold, fontSize: 26, color: inverse ? colors.onSurfaceInverse : colors.onSurface }}>{value}</Txt>
      <Txt variant="caption" color={inverse ? colors.onSurfaceInverse : colors.muted} style={{ opacity: inverse ? 0.8 : 1 }}>{label.toUpperCase()}</Txt>
    </View>
  );
}

function SegBtn({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <Txt variant="label" color={active ? colors.onSurface : colors.muted}>{label}</Txt>
    </Pressable>
  );
}

function EmptyStateBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ paddingVertical: spacing.xxxl }}>
      <EmptyState title={title} body={body} />
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
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  banner: { margin: spacing.xl, borderRadius: radius.lg, overflow: "hidden", minHeight: 180 },
  bannerContent: { padding: spacing.lg, justifyContent: "flex-end", flex: 1 },
  elderRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
  milestones: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.xl, gap: spacing.sm },
  milestone: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    padding: 4,
  },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.pill },
  segBtnActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  personRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
  feedItem: { paddingVertical: spacing.md },
  feedDivider: { height: 1, backgroundColor: colors.divider },
});
