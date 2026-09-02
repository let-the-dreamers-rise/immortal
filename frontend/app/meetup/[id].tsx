import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, MapPin, CalendarBlank, Check, Users } from "phosphor-react-native";

import { Avatar, Button, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Attendee = { user_id: string; display_name: string; picture?: string | null };
type Meetup = {
  meetup_id: string;
  title: string;
  description: string;
  tradition: string;
  location_name: string;
  city: string;
  starts_at: string;
  attendees: number;
  is_rsvped: boolean;
  is_host: boolean;
  host: Attendee;
  attendee_list: Attendee[];
};

export default function MeetupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [m, setM] = useState<Meetup | null>(null);
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ meetup: Meetup }>(`/meetups/${id}`);
    setM(res.meetup);
    setWaiver(res.meetup.is_rsvped);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const join = async () => {
    setErr(null);
    if (!waiver) return setErr("Please accept the liability waiver to join.");
    setBusy(true);
    try {
      await apiFetch(`/meetups/${id}/rsvp`, { method: "POST", body: { waiver_accepted: true } });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Could not join");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await apiFetch(`/meetups/${id}/rsvp`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelCircle = async () => {
    setBusy(true);
    try {
      await apiFetch(`/meetups/${id}`, { method: "DELETE" });
      router.back();
    } finally {
      setBusy(false);
    }
  };

  if (!m) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  const when = new Date(m.starts_at);

  return (
    <View style={styles.container}>
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="meetup-detail-back">
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Txt variant="label">Practice circle</Txt>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <Txt variant="caption" color={colors.brandPrimary}>{m.tradition.toUpperCase()}</Txt>
        <Txt variant="title" style={{ marginTop: 2 }}>{m.title}</Txt>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <CalendarBlank size={18} color={colors.brandSecondary} weight="regular" />
            <Txt variant="body" style={{ marginLeft: spacing.md }}>
              {when.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              {"  ·  "}
              {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </Txt>
          </View>
          <View style={[styles.metaRow, { marginTop: spacing.md }]}>
            <MapPin size={18} color={colors.brandSecondary} weight="regular" />
            <Txt variant="body" style={{ marginLeft: spacing.md, flex: 1 }}>{m.location_name}, {m.city}</Txt>
          </View>
        </View>

        {m.description ? <Txt variant="body" style={{ marginTop: spacing.lg }}>{m.description}</Txt> : null}

        <View style={styles.hostRow}>
          <Avatar name={m.host.display_name} uri={m.host.picture} size={36} />
          <Txt variant="bodySm" style={{ marginLeft: spacing.md }}>
            Hosted by <Txt variant="label">{m.host.display_name}</Txt>{m.is_host ? " (you)" : ""}
          </Txt>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.xl }}>
          <Users size={16} color={colors.onSurfaceSecondary} weight="regular" />
          <Txt variant="label" style={{ marginLeft: spacing.sm }}>{m.attendees} going</Txt>
        </View>
        <View style={styles.avatars}>
          {m.attendee_list.slice(0, 12).map((a) => (
            <View key={a.user_id} style={{ marginRight: -8 }}>
              <Avatar name={a.display_name} uri={a.picture} size={36} />
            </View>
          ))}
        </View>

        {/* Actions */}
        {m.is_host ? (
          <Button label="Cancel this circle" variant="ghost" onPress={cancelCircle} loading={busy} style={{ marginTop: spacing.xl }} testID="meetup-cancel-circle" />
        ) : m.is_rsvped ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.goingBadge}>
              <Check size={16} color={colors.success} weight="bold" />
              <Txt variant="label" color={colors.success} style={{ marginLeft: spacing.sm }}>You’re going</Txt>
            </View>
            <Button label="Cancel my RSVP" variant="ghost" onPress={cancel} loading={busy} style={{ marginTop: spacing.md }} testID="meetup-cancel-rsvp" />
          </View>
        ) : (
          <View style={{ marginTop: spacing.xl }}>
            <Pressable style={styles.waiverRow} onPress={() => setWaiver(!waiver)} testID="meetup-waiver-checkbox">
              <View style={[styles.checkbox, waiver && styles.checkboxOn]}>
                {waiver ? <Check size={14} color={colors.onBrandPrimary} weight="bold" /> : null}
              </View>
              <Txt variant="bodySm" style={{ flex: 1, marginLeft: spacing.md }}>
                I understand this is a self-directed, non-clinical practice gathering. I join at my own risk and
                take responsibility for my own wellbeing.
              </Txt>
            </Pressable>
            {err ? <Txt variant="bodySm" color={colors.error} style={{ marginTop: spacing.sm }} testID="meetup-detail-error">{err}</Txt> : null}
            <Button label="Join this circle" onPress={join} loading={busy} style={{ marginTop: spacing.md }} testID="meetup-join-button" />
          </View>
        )}
      </ScrollView>
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
  metaCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  hostRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg },
  avatars: { flexDirection: "row", marginTop: spacing.md, paddingLeft: 8 },
  goingBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md },
  waiverRow: { flexDirection: "row", alignItems: "flex-start" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
});
