import { useCallback, useEffect, useState } from "react";
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock } from "phosphor-react-native";

import { Chip, EmptyState, Loading, Txt } from "@/src/components/ui";
import { apiFetch, mediaUri } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

const { width } = Dimensions.get("window");
const GAP = spacing.md;
const CARD_W = (width - spacing.xl * 2 - GAP) / 2;

type Practice = {
  practice_id: string;
  title: string;
  tradition: string;
  category: string;
  difficulty: string;
  time_min: number;
  illustration_url: string;
  has_illustration: boolean;
};

const TRADITIONS = [
  { key: "all", label: "All" },
  { key: "dao", label: "Dao" },
  { key: "ayurveda", label: "Ayurveda" },
];
const DIFFICULTIES = [
  { key: "all", label: "Any level" },
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
];

const GRADS: Record<string, [string, string]> = {
  dao: ["#8C9A86", "#5E6C58"],
  ayurveda: ["#C7A97C", "#8C7A6B"],
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tradition, setTradition] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [items, setItems] = useState<Practice[] | null>(null);
  const [mode, setMode] = useState<"practices" | "teachings">("practices");
  const [teachings, setTeachings] = useState<any[]>([]);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const res = await apiFetch<{ practices: Practice[] }>(
        `/practices?tradition=${tradition}&difficulty=${difficulty}`
      );
      setItems(res.practices);
    } catch {
      setItems([]);
    }
  }, [tradition, difficulty]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch<{ teachings: any[] }>("/teachings").then((r) => setTeachings(r.teachings)).catch(() => setTeachings([]));
  }, []);

  const TGRADS: [string, string][] = [
    ["#8C9A86", "#5E6C58"],
    ["#C7A97C", "#8C7A6B"],
    ["#6A7B82", "#3D4A4F"],
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Txt variant="title" style={{ fontSize: 22 }}>Library</Txt>
        <View style={styles.segment}>
          <Pressable onPress={() => setMode("practices")} style={[styles.segBtn, mode === "practices" && styles.segBtnActive]} testID="library-tab-practices">
            <Txt variant="label" color={mode === "practices" ? colors.onSurface : colors.muted}>Practices</Txt>
          </Pressable>
          <Pressable onPress={() => setMode("teachings")} style={[styles.segBtn, mode === "teachings" && styles.segBtnActive]} testID="library-tab-teachings">
            <Txt variant="label" color={mode === "teachings" ? colors.onSurface : colors.muted}>Teachings</Txt>
          </Pressable>
        </View>
        {mode === "practices" ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {TRADITIONS.map((t) => (
                <Chip key={t.key} label={t.label} active={tradition === t.key} onPress={() => setTradition(t.key)} testID={`filter-tradition-${t.key}`} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {DIFFICULTIES.map((d) => (
                <Chip key={d.key} label={d.label} active={difficulty === d.key} onPress={() => setDifficulty(d.key)} testID={`filter-difficulty-${d.key}`} />
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>

      {mode === "teachings" ? (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
          <Txt variant="bodySm" style={{ marginBottom: spacing.lg }}>
            Historical Daoist ideas behind the path — explored as philosophy and personal reflection, never medical advice.
          </Txt>
          {teachings.map((t, i) => (
            <Pressable key={t.teaching_id} style={styles.teachingCard} onPress={() => router.push(`/teaching/${t.teaching_id}`)} testID={`teaching-${t.teaching_id}`}>
              <View style={styles.teachingArt}>
                <LinearGradient colors={TGRADS[i % 3]} style={StyleSheet.absoluteFill} />
                <Txt style={{ fontFamily: "CormorantGaramond-Bold", fontSize: 40, color: "rgba(247,245,240,0.9)" }}>{t.chinese}</Txt>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.lg }}>
                <Txt variant="caption" color={colors.brandSecondary}>{t.category.toUpperCase()}</Txt>
                <Txt variant="title" style={{ fontSize: 19, marginTop: 2 }}>{t.title}</Txt>
                <Txt variant="bodySm" numberOfLines={2} style={{ marginTop: 2 }}>{t.subtitle}</Txt>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : !items ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet" body="No practices found for this filter. Try another tradition or level." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.practice_id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: spacing.xl }}
          contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: GAP }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              testID={`practice-card-${item.practice_id}`}
              style={styles.card}
              onPress={() => router.push(`/practice/${item.practice_id}`)}
            >
              <View style={styles.thumb}>
                <LinearGradient colors={GRADS[item.tradition] || GRADS.dao} style={StyleSheet.absoluteFill} />
                {item.has_illustration ? (
                  <Image
                    source={{ uri: mediaUri(item.illustration_url) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={300}
                  />
                ) : null}
                <View style={styles.thumbTag}>
                  <Txt variant="caption" color={colors.onSurfaceInverse}>{item.tradition === "dao" ? "DAO" : "AYURVEDA"}</Txt>
                </View>
              </View>
              <Txt variant="label" numberOfLines={2} style={{ marginTop: spacing.sm }}>{item.title}</Txt>
              <View style={styles.metaRow}>
                <Txt variant="caption">{item.category.toUpperCase()}</Txt>
                {item.time_min > 0 ? (
                  <View style={styles.time}>
                    <Clock size={12} color={colors.muted} weight="regular" />
                    <Txt variant="caption" style={{ marginLeft: 3 }}>{item.time_min}m</Txt>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.xl },
  segment: { flexDirection: "row", marginTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill },
  segBtnActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  teachingCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  teachingArt: { width: 76, height: 76, borderRadius: radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  card: { width: CARD_W },
  thumb: {
    width: CARD_W,
    height: CARD_W * 0.82,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
  },
  thumbTag: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: "rgba(26,25,24,0.45)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  time: { flexDirection: "row", alignItems: "center" },
});
