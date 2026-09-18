import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown, Flame, GearSix, ChatCircle, MapPin, CalendarBlank } from "phosphor-react-native";
import * as Location from "expo-location";

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
  comment_count: number;
};

type Meetup = {
  meetup_id: string;
  title: string;
  tradition: string;
  location_name: string;
  city: string;
  starts_at: string;
  attendees: number;
  is_rsvped: boolean;
  is_host: boolean;
  distance_km: number | null;
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"practitioners" | "feed" | "meetups">("practitioners");
  const [stats, setStats] = useState<Stats | null>(null);
  const [people, setPeople] = useState<Practitioner[]>([]);
  const [feed, setFeed] = useState<FeedLog[]>([]);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMeetups = useCallback(async (c: { lat: number; lng: number } | null) => {
    const qs = c ? `?lat=${c.lat}&lng=${c.lng}` : "";
    const res = await apiFetch<{ meetups: Meetup[] }>(`/meetups${qs}`);
    setMeetups(res.meetups);
  }, []);

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
      await loadMeetups(coords);
    } finally {
      setLoading(false);
    }
  }, [coords, loadMeetups]);

  const findNearby = async () => {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      let granted = status === "granted";
      if (!granted && canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.status === "granted";
      }
      if (!granted) return;
      const pos = await Location.getCurrentPositionAsync({});
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      await loadMeetups(c);
    } catch {
      // ignore
    }
  };

  // Wait for the session token to be restored before fetching: gated requests
  // sent during bootstrap 401 and would pin empty practitioner/feed lists.
  useFocusEffect(useCallback(() => { if (!authLoading) load(); }, [authLoading, load]));

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
            <SegBtn label="People" active={tab === "practitioners"} onPress={() => setTab("practitioners")} testID="community-tab-practitioners" />
            <SegBtn label="Logs" active={tab === "feed"} onPress={() => setTab("feed")} testID="community-tab-feed" />
            <SegBtn label="Meetups" active={tab === "meetups"} onPress={() => setTab("meetups")} testID="community-tab-meetups" />
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
          ) : tab === "feed" ? (
            feed.length === 0 ? (
              <EmptyStateBlock title="The community is resting" body="Share a reflection publicly from your journal to start the conversation." />
            ) : (
              <View style={{ paddingHorizontal: spacing.xl }}>
                {feed.map((l, i) => (
                  <View key={l.log_id}>
                    {i > 0 && <View style={styles.feedDivider} />}
                    <Pressable style={styles.feedItem} onPress={() => router.push(`/log/${l.log_id}`)} testID={`feed-log-${l.log_id}`}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                        <Avatar name={l.author.display_name} uri={l.author.picture} size={32} />
                        <Txt variant="label">{l.author.display_name}</Txt>
                      </View>
                      <Txt variant="body" style={{ marginTop: spacing.sm }}>
                        {l.nothing_happened && !l.body ? "Nothing happened today — and that is part of it." : l.body}
                      </Txt>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm }}>
                        {l.practice_titles.length > 0 ? (
                          <Txt variant="caption" color={colors.brandPrimary} style={{ flex: 1 }}>
                            {l.practice_titles.join(" · ")}
                          </Txt>
                        ) : <View style={{ flex: 1 }} />}
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <ChatCircle size={14} color={colors.muted} weight="regular" />
                          <Txt variant="caption" style={{ marginLeft: 4 }}>
                            {l.comment_count} {l.comment_count === 1 ? "reply" : "replies"}
                          </Txt>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            )
          ) : (
            <View style={{ paddingHorizontal: spacing.xl }}>
              <View style={styles.meetupActions}>
                <Button label="Host a circle" onPress={() => router.push("/meetup/new")} testID="meetup-host-button" style={{ flex: 1 }} />
                {!coords ? (
                  <Button label="Near me" variant="secondary" small onPress={findNearby} testID="meetup-nearby-button" />
                ) : null}
              </View>
              <Txt variant="caption" style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
                Public places only. Meet fellow practitioners in the real world.
              </Txt>
              {meetups.length === 0 ? (
                <EmptyStateBlock title="No circles scheduled" body="Be the first to host a practice circle in your area." />
              ) : (
                meetups.map((m) => (
                  <Pressable key={m.meetup_id} style={styles.meetupCard} onPress={() => router.push(`/meetup/${m.meetup_id}`)} testID={`meetup-${m.meetup_id}`}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Txt variant="caption" color={colors.brandPrimary}>{m.tradition.toUpperCase()}</Txt>
                      {m.is_rsvped ? <Txt variant="caption" color={colors.success}>GOING</Txt> : null}
                    </View>
                    <Txt variant="title" style={{ fontSize: 19, marginTop: 2 }}>{m.title}</Txt>
                    <View style={styles.meetupMeta}>
                      <CalendarBlank size={13} color={colors.muted} weight="regular" />
                      <Txt variant="caption" style={{ marginLeft: 4 }}>{formatMeetupDate(m.starts_at)}</Txt>
                    </View>
                    <View style={styles.meetupMeta}>
                      <MapPin size={13} color={colors.muted} weight="regular" />
                      <Txt variant="caption" style={{ marginLeft: 4, flex: 1 }} numberOfLines={1}>
                        {m.location_name}, {m.city}{m.distance_km != null ? ` · ${m.distance_km} km` : ""}
                      </Txt>
                    </View>
                    <Txt variant="caption" style={{ marginTop: spacing.sm }}>{m.attendees} going</Txt>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function formatMeetupDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
  meetupActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  meetupCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  meetupMeta: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
});
