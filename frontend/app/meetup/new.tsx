import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { X, MapPin } from "phosphor-react-native";

import { Button, Chip, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";

const TRADITIONS = [
  { key: "dao", label: "Dao" },
  { key: "ayurveda", label: "Ayurveda" },
  { key: "mixed", label: "Mixed" },
];
const HOURS = [6, 7, 8, 9, 12, 17, 18, 19];

function nextDays(n: number) {
  const out: { key: string; label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push({
      key: d.toISOString(),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      date: d,
    });
  }
  return out;
}

function hourLabel(h: number) {
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
}

export default function NewMeetup() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const days = nextDays(14);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tradition, setTradition] = useState("dao");
  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("");
  const [dayKey, setDayKey] = useState(days[1].key);
  const [hour, setHour] = useState(8);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const attachLocation = async () => {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      let granted = status === "granted";
      if (!granted && canAskAgain) {
        granted = (await Location.requestForegroundPermissionsAsync()).status === "granted";
      }
      if (!granted) return;
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      // ignore
    }
  };

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3) return setError("Give your circle a clear title.");
    if (locationName.trim().length < 2 || city.trim().length < 1) return setError("Add a public location and city.");
    const day = days.find((d) => d.key === dayKey)!.date;
    const starts = new Date(day);
    starts.setHours(hour, 0, 0, 0);
    setBusy(true);
    try {
      const res = await apiFetch<{ meetup: { meetup_id: string } }>("/meetups", {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim(),
          tradition,
          location_name: locationName.trim(),
          city: city.trim(),
          starts_at: starts.toISOString(),
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        },
      });
      router.replace(`/meetup/${res.meetup.meetup_id}`);
    } catch (e: any) {
      setError(e?.message || "Could not create the circle");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="meetup-close-button">
          <X size={24} color={colors.onSurfaceSecondary} weight="regular" />
        </Pressable>
        <Txt variant="label">Host a circle</Txt>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 100 }} bottomOffset={24} keyboardShouldPersistTaps="handled">
        <Lbl>TITLE</Lbl>
        <TextInput value={title} onChangeText={setTitle} placeholder="Morning Ba Duan Jin in the park" placeholderTextColor={colors.muted} style={styles.input} testID="meetup-title-input" />

        <Lbl>WHAT TO EXPECT</Lbl>
        <TextInput value={description} onChangeText={setDescription} placeholder="A gentle group practice, all levels welcome…" placeholderTextColor={colors.muted} multiline style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]} testID="meetup-desc-input" />

        <Lbl>TRADITION</Lbl>
        <View style={styles.chips}>
          {TRADITIONS.map((t) => (
            <Chip key={t.key} label={t.label} active={tradition === t.key} onPress={() => setTradition(t.key)} testID={`meetup-tradition-${t.key}`} />
          ))}
        </View>

        <Lbl>PUBLIC LOCATION</Lbl>
        <TextInput value={locationName} onChangeText={setLocationName} placeholder="e.g. Riverside Park pavilion" placeholderTextColor={colors.muted} style={styles.input} testID="meetup-location-input" />
        <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.muted} style={[styles.input, { marginTop: spacing.sm }]} testID="meetup-city-input" />
        <Pressable onPress={attachLocation} style={styles.locBtn} testID="meetup-attach-location">
          <MapPin size={16} color={coords ? colors.success : colors.brandSecondary} weight="regular" />
          <Txt variant="bodySm" color={coords ? colors.success : colors.brandSecondary} style={{ marginLeft: spacing.sm }}>
            {coords ? "Location attached — people can find you nearby" : "Attach my location (helps others find nearby circles)"}
          </Txt>
        </Pressable>

        <Lbl>WHEN</Lbl>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hchips}>
          {days.map((d) => (
            <Chip key={d.key} label={d.label} active={dayKey === d.key} onPress={() => setDayKey(d.key)} testID={`meetup-day-${d.key}`} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.hchips, { marginTop: spacing.sm }]}>
          {HOURS.map((h) => (
            <Chip key={h} label={hourLabel(h)} active={hour === h} onPress={() => setHour(h)} testID={`meetup-hour-${h}`} />
          ))}
        </ScrollView>

        {error ? <Txt variant="bodySm" color={colors.error} style={{ marginTop: spacing.md }} testID="meetup-error">{error}</Txt> : null}
      </KeyboardAwareScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Create circle" onPress={submit} loading={busy} testID="meetup-create-submit" />
      </View>
    </View>
  );
}

function Lbl({ children }: { children: string }) {
  return <Txt variant="caption" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>{children}</Txt>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurface,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingRight: spacing.xl },
  hchips: { flexDirection: "row", gap: spacing.sm, paddingRight: spacing.xl },
  locBtn: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
