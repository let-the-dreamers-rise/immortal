import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft } from "phosphor-react-native";

import { Avatar, Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Profile = {
  user_id: string;
  display_name: string;
  picture?: string | null;
  bio?: string | null;
  intention?: string | null;
  growth: { glyph: string; label: string; days: number };
  total_days: number;
  followers: number;
  following: number;
  is_following: boolean;
};
type Log = { log_id: string; body: string; nothing_happened: boolean; created_at: string; practice_titles: string[] };

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  const load = useCallback(async () => {
    const res = await apiFetch<{ profile: Profile; logs: Log[] }>(`/community/users/${id}`);
    setProfile(res.profile);
    setLogs(res.logs);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async () => {
    if (!profile) return;
    setProfile({ ...profile, is_following: !profile.is_following, followers: profile.followers + (profile.is_following ? -1 : 1) });
    try {
      await apiFetch(`/community/users/${id}/follow`, { method: profile.is_following ? "DELETE" : "POST" });
    } catch {
      load();
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="user-back-button">
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Txt variant="label">Practitioner</Txt>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center" }}>
          <Avatar name={profile.display_name} uri={profile.picture} size={84} />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md, gap: spacing.sm }}>
            <Txt variant="title">{profile.display_name}</Txt>
            
          </View>
          {profile.bio ? <Txt variant="bodySm" center style={{ marginTop: spacing.xs }}>{profile.bio}</Txt> : null}
          {profile.intention ? (
            <Txt variant="bodySm" center style={{ marginTop: spacing.sm, fontStyle: "italic" }} color={colors.onSurfaceSecondary}>
              “{profile.intention}”
            </Txt>
          ) : null}
        </View>

        <View style={styles.stats}>
          <St value={profile.growth?.glyph ?? "種"} label={profile.growth?.label ?? "A seed"} />
          <St value={profile.total_days} label="Days" />
          <St value={profile.followers} label="Followers" />
        </View>

        <Button
          label={profile.is_following ? "Following" : "Follow"}
          variant={profile.is_following ? "secondary" : "primary"}
          onPress={toggle}
          testID="user-follow-button"
        />

        <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
          SHARED REFLECTIONS
        </Txt>
        {logs.length === 0 ? (
          <View style={{ paddingVertical: spacing.xl }}>
            <EmptyState title="Nothing shared yet" />
          </View>
        ) : (
          logs.map((l, i) => (
            <View key={l.log_id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={{ paddingVertical: spacing.md }} testID={`user-log-${l.log_id}`}>
                <Txt variant="caption" color={colors.brandSecondary}>
                  {new Date(l.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric" }).toUpperCase()}
                </Txt>
                <Txt variant="body" style={{ marginTop: spacing.xs }}>
                  {l.nothing_happened && !l.body ? "Nothing happened today — and that is part of it." : l.body}
                </Txt>
                {l.practice_titles.length > 0 ? (
                  <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: spacing.sm }}>{l.practice_titles.join(" · ")}</Txt>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function St({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Txt style={{ fontFamily: fonts.displayBold, fontSize: 24, color: colors.onSurface }}>{value}</Txt>
      <Txt variant="caption">{label.toUpperCase()}</Txt>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  stats: {
    flexDirection: "row",
    marginVertical: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: { height: 1, backgroundColor: colors.divider },
});
