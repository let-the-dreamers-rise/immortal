import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Check } from "phosphor-react-native";

import { Button, Loading, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import * as purchases from "@/src/billing/purchases";
import { colors, IMAGES, radius, spacing } from "@/src/theme";

const BENEFITS = [
  { title: "The Year 2 path", body: "Nei Gong: meridian work, the dantian and the small heavenly circuit, staged over twelve months." },
  { title: "Record unlimited lineages", body: "Write down your own long practices and branch from others, so what you learn stays attached to the method." },
  { title: "Carry the archive forward", body: "Your membership funds sourcing and review of the classical texts behind every practice." },
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium, refreshPremium } = useAuth();
  const [plans, setPlans] = useState<purchases.PlanPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const available = purchases.purchasesAvailable();

  useEffect(() => {
    if (!available) {
      setPlans([]);
      return;
    }
    purchases
      .loadPlans()
      .then((p) => {
        setPlans(p);
        const annual = p.find((x) => x.packageType === "ANNUAL");
        setSelected((annual ?? p[0])?.identifier ?? null);
      })
      .catch(() => setPlans([]));
  }, [available]);

  const done = async (message: string) => {
    await refreshPremium();
    Alert.alert("Welcome to the Inner Chamber", message, [{ text: "Continue", onPress: () => router.back() }]);
  };

  const subscribe = async () => {
    const plan = plans?.find((p) => p.identifier === selected);
    if (!plan) return;
    setBusy(true);
    try {
      const outcome = await purchases.buy(plan);
      if (outcome === "purchased") await done("The Year 2 path and unlimited lineages are open to you.");
      else if (outcome === "not_entitled") Alert.alert("Almost there", "The purchase went through but the membership is not active yet. Try Restore in a moment.");
    } catch (e: any) {
      Alert.alert("Purchase failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      if (await purchases.restore()) await done("Your membership has been restored.");
      else Alert.alert("Nothing to restore", "We could not find an active membership for this store account.");
    } catch (e: any) {
      Alert.alert("Restore failed", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const hosted = async () => {
    try {
      if (await purchases.presentHostedPaywall()) await done("The Year 2 path and unlimited lineages are open to you.");
    } catch (e: any) {
      Alert.alert("Could not open", e?.message ?? "Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} bounces={false}>
        <View style={styles.hero}>
          <Image source={{ uri: IMAGES.pathHero }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(26,25,24,0.35)", "rgba(26,25,24,0.9)"]} style={StyleSheet.absoluteFill} />
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.close, { top: insets.top + spacing.sm }]}
            testID="paywall-close"
          >
            <X size={24} color={colors.onSurfaceInverse} />
          </Pressable>
          <View style={styles.heroText}>
            <Txt variant="display" color={colors.onSurfaceInverse}>内室</Txt>
            <Txt variant="title" color={colors.onSurfaceInverse} style={{ marginTop: spacing.xs }}>The Inner Chamber</Txt>
            <Txt variant="bodySm" color={colors.onSurfaceInverse} style={{ marginTop: spacing.sm, opacity: 0.85 }}>
              For those who mean to keep practising for years.
            </Txt>
          </View>
        </View>

        <View style={{ padding: spacing.xl }}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefit}>
              <View style={styles.tick}>
                <Check size={14} color={colors.onBrandPrimary} weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label">{b.title}</Txt>
                <Txt variant="bodySm" style={{ marginTop: 2 }}>{b.body}</Txt>
              </View>
            </View>
          ))}

          {isPremium ? (
            <View style={styles.activeBox} testID="paywall-active">
              <Txt variant="label" color={colors.success}>Your membership is active.</Txt>
              <Button
                label="Manage membership"
                variant="ghost"
                small
                style={{ marginTop: spacing.md }}
                onPress={() => purchases.openCustomerCenter().catch(() => {})}
              />
            </View>
          ) : plans === null ? (
            <Loading />
          ) : plans.length === 0 ? (
            <View style={styles.activeBox}>
              <Txt variant="bodySm">
                {available
                  ? "Memberships are not available right now. Please try again later."
                  : "Memberships are available in the Immortal app for Android and iOS."}
              </Txt>
            </View>
          ) : (
            <>
              {plans.map((p) => {
                const active = p.identifier === selected;
                return (
                  <Pressable
                    key={p.identifier}
                    onPress={() => setSelected(p.identifier)}
                    style={[styles.plan, active && styles.planActive]}
                    testID={`plan-${p.identifier}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Txt variant="label">{p.title}</Txt>
                      {p.packageType === "ANNUAL" ? (
                        <Txt variant="caption" color={colors.brandPrimary} style={{ marginTop: 2 }}>BEST FOR A LONG PRACTICE</Txt>
                      ) : null}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Txt variant="label">{p.priceString}</Txt>
                      {p.period ? <Txt variant="caption">{p.period}</Txt> : null}
                    </View>
                  </Pressable>
                );
              })}
              <Button label="Enter the Inner Chamber" onPress={subscribe} loading={busy} style={{ marginTop: spacing.lg }} testID="paywall-subscribe" />
              <Pressable onPress={hosted} style={{ marginTop: spacing.md, alignItems: "center" }}>
                <Txt variant="bodySm" color={colors.brandPrimary}>See all plans</Txt>
              </Pressable>
            </>
          )}

          {!isPremium && available ? (
            <Pressable onPress={restore} disabled={busy} style={{ marginTop: spacing.lg, alignItems: "center" }} testID="paywall-restore">
              <Txt variant="bodySm" weight="semi">Restore purchases</Txt>
            </Pressable>
          ) : null}

          <Txt variant="caption" center style={{ marginTop: spacing.xl, lineHeight: 16 }}>
            Subscriptions renew automatically until cancelled in your store account settings. Everything in the
            free path, library, journal and community stays free.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 300, justifyContent: "flex-end" },
  close: { position: "absolute", right: spacing.xl },
  heroText: { padding: spacing.xl },
  benefit: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    marginTop: spacing.md,
  },
  planActive: { borderColor: colors.brandPrimary, borderWidth: 2 },
  activeBox: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
});
