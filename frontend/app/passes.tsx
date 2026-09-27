import { useCallback, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, CaretRight, LockSimple } from "phosphor-react-native";

import { Button, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { nth, shareName, shortPrint } from "@/src/passes/share";
import type { PassState, PassesOverview } from "@/src/passes/types";
import { colors, fonts, radius, spacing } from "@/src/theme";

// The passes. Everything in the app can be copied except time, and this is
// the screen where time shows: scrolls that open only on days practised, on
// the schedule the neidan manuals gave, and a name that records when you
// arrived. Nothing here compares one practitioner with another.

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export default function PassesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [data, setData] = useState<PassesOverview | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<PassesOverview>("/passes"));
    } catch {
      setData(null);
    }
  }, []);

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

  const early = data?.passes.filter((p) => !p.sealed) ?? [];
  const sealed = data?.passes.filter((p) => p.sealed) ?? [];

  return (
    <View style={styles.container}>
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="passes-back-button">
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Txt variant="label">The Passes</Txt>
        <View style={{ width: 22 }} />
      </View>

      {!data ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        >
          {/* The name, or the invitation to take one. */}
          {data.name ? (
            <View style={styles.hero} testID="passes-name">
              <Txt style={styles.name}>{data.name.name}</Txt>
              <Txt variant="subtitle" center>
                {data.name.romanized}
              </Txt>
              <Txt variant="bodySm" center color={colors.muted}>
                {data.name.gloss}
              </Txt>
              <Txt variant="caption" center color={colors.cinnabar} style={{ marginTop: spacing.md }}>
                {`${data.name.generation_label} · ${nth(data.name.seat)} of ${data.name.generation_size.toLocaleString("en-US")}`.toUpperCase()}
              </Txt>
              {data.vow ? (
                <Txt variant="bodySm" center style={{ marginTop: spacing.sm, maxWidth: 300 }}>
                  {data.vow.fulfilled
                    ? `Your vow to reach ${data.vow.title.replace(/^The /, "the ")} is fulfilled.`
                    : `Vowed to reach ${data.vow.title.replace(/^The /, "the ")}: ${data.vow.days_left} ${data.vow.days_left === 1 ? "day" : "days"} of practice to go.`}
                </Txt>
              ) : null}
              <View style={styles.heroActions}>
                <Button label="Share my name" variant="ghost" small onPress={() => shareName(data.name!)} testID="passes-share" />
                {data.vow?.fulfilled ? (
                  <Button label="Vow again" small onPress={() => router.push("/vow")} testID="passes-renew" />
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.hero} testID="passes-invite">
              <Txt style={[styles.name, { color: colors.cinnabar }]}>{data.open_generation.character}</Txt>
              <Txt variant="caption" center color={colors.cinnabar}>
                {data.open_generation.label.toUpperCase()}
              </Txt>
              <Txt variant="title" center style={{ marginTop: spacing.md }}>
                Take your name
              </Txt>
              <Txt variant="bodySm" center style={{ marginTop: spacing.sm, maxWidth: 300 }}>
                {data.open_generation.remaining.toLocaleString("en-US")} of{" "}
                {data.open_generation.size.toLocaleString("en-US")} places remain in the{" "}
                {data.open_generation.label.toLowerCase()}. There will never be more.
              </Txt>
              <Button label="Take your name" onPress={() => router.push("/vow")} style={{ marginTop: spacing.lg, alignSelf: "stretch" }} testID="passes-take-name" />
            </View>
          )}

          {/* Days, and the next scroll. */}
          <View style={styles.daysBlock}>
            <Txt style={styles.days}>{data.days.toLocaleString("en-US")}</Txt>
            <Txt variant="caption">{data.days === 1 ? "DAY OF PRACTICE" : "DAYS OF PRACTICE"}</Txt>
            <Txt variant="bodySm" center style={{ marginTop: spacing.sm }}>
              {data.next
                ? `The next scroll opens in ${data.next.days_left} ${data.next.days_left === 1 ? "day" : "days"} of practice.`
                : "Every scroll is open."}
            </Txt>
          </View>

          <View style={styles.section}>
            <Txt variant="bodySm" color={colors.muted} style={{ marginBottom: spacing.md }}>
              Scrolls open on days you practise, never on days that pass. Nothing opens them sooner, including the Inner
              Chamber.
            </Txt>
            {early.map((p, i) => (
              <PassRow key={p.key} p={p} first={i === 0} onOpen={() => router.push(`/scroll/${p.key}`)} />
            ))}
          </View>

          <View style={styles.section}>
            <Txt variant="caption" color={colors.cinnabar} style={{ marginBottom: spacing.xs }}>
              THE SEALED SCROLLS
            </Txt>
            <Txt variant="bodySm" color={colors.muted} style={{ marginBottom: spacing.md }}>
              The neidan manuals gave the work a schedule: a hundred days, ten months, three years, nine years. These
              scrolls are not in the app. Only a fingerprint of each is public, so when one opens you can check that
              it was never changed. Nobody can open the last one before nine years of practice.
            </Txt>
            {sealed.map((p, i) => (
              <PassRow key={p.key} p={p} first={i === 0} onOpen={() => router.push(`/scroll/${p.key}`)} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function PassRow({ p, first, onOpen }: { p: PassState; first: boolean; onOpen: () => void }) {
  return (
    <Pressable
      testID={`pass-${p.key}`}
      disabled={!p.opened}
      onPress={onOpen}
      style={({ pressed }) => [styles.row, !first && styles.rowRule, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.seal, p.opened ? styles.sealOpen : styles.sealClosed]}>
        <Txt style={[styles.sealGlyph, { color: p.opened ? colors.onCinnabar : colors.borderStrong }]}>{p.glyph}</Txt>
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Txt variant="caption" color={p.opened ? colors.cinnabar : colors.muted}>
          DAY {p.day.toLocaleString("en-US")}
        </Txt>
        <Txt variant="label" color={p.opened ? colors.onSurface : colors.onSurfaceSecondary} style={{ marginTop: 2 }}>
          {p.title}
        </Txt>
        <Txt variant="bodySm" color={colors.muted}>
          {p.subtitle}
        </Txt>
        {p.sealed && p.fingerprint ? (
          <Txt style={styles.print}>fingerprint {shortPrint(p.fingerprint)}</Txt>
        ) : null}
      </View>
      {p.opened ? (
        <CaretRight size={18} color={colors.cinnabar} />
      ) : (
        <View style={{ alignItems: "flex-end" }}>
          <LockSimple size={16} color={colors.borderStrong} />
          <Txt variant="caption" style={{ marginTop: 4 }}>
            in {p.days_left.toLocaleString("en-US")}
          </Txt>
        </View>
      )}
    </Pressable>
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
  },
  hero: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  name: { fontFamily: fonts.display, fontSize: 64, lineHeight: 80, color: colors.onSurface, textAlign: "center" },
  heroActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  daysBlock: {
    alignItems: "center",
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  days: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 50, color: colors.onSurface },
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
  rowRule: { borderTopWidth: 1, borderTopColor: colors.divider },
  seal: { width: 48, height: 48, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  sealOpen: { backgroundColor: colors.cinnabar },
  sealClosed: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  sealGlyph: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  print: { fontFamily: MONO, fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 4 },
});
