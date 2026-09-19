import { useCallback, useState } from "react";
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Lock, GearSix } from "phosphor-react-native";

import { Badge, Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, IMAGES, radius, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");
const CENTER = 56;
const SIDE = (width - spacing.xl * 2 - CENTER) / 2;

type Stage = {
  order: number;
  year: number;
  months: string;
  title: string;
  chinese: string;
  subtitle: string;
  practice_count: number;
  recommended_days: number;
  state: "completed" | "in_progress" | "available" | "locked";
  checkins: number;
};

export default function PathScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ stages: Stage[] }>("/path/stages");
      setStages(res.stages);
    } catch {
      setStages([]);
    }
  }, []);

  // Wait for the session token to be restored before fetching: a gated request
  // sent during bootstrap 401s, and the catch below would pin an empty path.
  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      load();
    }, [authLoading, load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Txt variant="title" style={{ fontSize: 22 }}>The Dao Path</Txt>
        <Pressable testID="path-settings-button" onPress={() => router.push("/settings")} hitSlop={12}>
          <GearSix size={24} color={colors.onSurfaceSecondary} weight="regular" />
        </Pressable>
      </View>

      {!stages ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        >
          <View style={styles.hero}>
            <Image source={{ uri: IMAGES.pathHero }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={["rgba(26,25,24,0.1)", "rgba(26,25,24,0.7)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Txt variant="caption" color={colors.onSurfaceInverse} style={{ opacity: 0.85 }}>
                YEAR 1 · FOUNDATION (筑基)
              </Txt>
              <Txt variant="display" color={colors.onSurfaceInverse} style={{ fontSize: 34, lineHeight: 38, marginTop: spacing.xs }}>
                {user?.display_name?.split(" ")[0] || "Traveler"}, your journey begins here.
              </Txt>
            </View>
          </View>

          <View style={styles.mapNote}>
            <Txt variant="bodySm">
              Four seasons of foundation. Move through each at your own pace — the next opens when you are
              genuinely ready, not before.
            </Txt>
          </View>

          <View style={styles.map}>
            {stages.map((s, i) => (
              <View key={s.order}>
                {i > 0 && s.year !== stages[i - 1].year ? (
                  <View style={styles.yearBanner}>
                    <View style={styles.yearLine} />
                    <Txt variant="caption" color={colors.brandSecondary} style={{ marginHorizontal: spacing.md }}>
                      YEAR {s.year} · INTERNAL WORK (內功)
                    </Txt>
                    <View style={styles.yearLine} />
                  </View>
                ) : null}
                <StageNode stage={s} left={i % 2 === 0} onPress={() => router.push(`/stage/${s.order}`)} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StageNode({ stage, left, onPress }: { stage: Stage; left: boolean; onPress: () => void }) {
  const locked = stage.state === "locked";
  const done = stage.state === "completed";
  const active = stage.state === "in_progress";

  const card = (
    <Pressable
      testID={`stage-card-${stage.order}`}
      onPress={onPress}
      style={[
        styles.card,
        { width: SIDE },
        (active || done) && { borderColor: colors.brandPrimary },
        locked && { opacity: 0.5 },
      ]}
    >
      <Txt variant="caption" color={colors.brandSecondary}>{stage.months}</Txt>
      <Txt variant="title" style={{ fontSize: 20, marginTop: 2 }}>{stage.title}</Txt>
      <Txt variant="bodySm" style={{ marginTop: 2 }} numberOfLines={2}>{stage.subtitle}</Txt>
      <View style={{ marginTop: spacing.sm }}>
        {done ? (
          <Badge label="COMPLETE" tone="brand" />
        ) : active ? (
          <Badge label={`${stage.checkins} CHECK-INS`} tone="warning" />
        ) : locked ? (
          <Txt variant="caption">LOCKED</Txt>
        ) : (
          <Txt variant="caption" color={colors.brandPrimary}>READY TO BEGIN</Txt>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {left ? card : <View style={{ width: SIDE }} />}
      <View style={styles.center}>
        <View style={styles.line} />
        <View
          style={[
            styles.node,
            done && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
            active && { borderColor: colors.brandPrimary, borderWidth: 3 },
            locked && { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          {done ? (
            <Check size={20} color={colors.onBrandPrimary} weight="bold" />
          ) : locked ? (
            <Lock size={16} color={colors.muted} weight="regular" />
          ) : (
            <Txt style={{ fontFamily: fonts.display, fontSize: 20, color: active ? colors.brandPrimary : colors.onSurfaceSecondary }}>
              {stage.order}
            </Txt>
          )}
        </View>
      </View>
      {left ? <View style={{ width: SIDE }} /> : card}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  hero: { height: 220, margin: spacing.xl, borderRadius: radius.lg, overflow: "hidden" },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  mapNote: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  map: { paddingHorizontal: spacing.xl },
  yearBanner: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg },
  yearLine: { flex: 1, height: 1, backgroundColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", minHeight: 128 },
  center: { width: CENTER, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  line: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: colors.border },
  node: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
