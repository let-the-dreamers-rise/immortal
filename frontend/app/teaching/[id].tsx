import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, BookOpen } from "phosphor-react-native";

import { Loading, Txt } from "@/src/components/ui";
import { apiFetch } from "@/src/api/client";
import { colors, fonts, radius, spacing } from "@/src/theme";

type Teaching = {
  teaching_id: string;
  title: string;
  chinese: string;
  subtitle: string;
  category: string;
  source_text: string;
  body: string;
};

export default function TeachingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [t, setT] = useState<Teaching | null>(null);

  useEffect(() => {
    apiFetch<{ teaching: Teaching }>(`/teachings/${id}`).then((r) => setT(r.teaching)).catch(() => setT(null));
  }, [id]);

  if (!t) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <LinearGradient colors={["#5E6C58", "#3D4A45"]} style={StyleSheet.absoluteFill} />
        <Pressable style={[styles.back, { top: insets.top + spacing.sm }]} onPress={() => router.back()} testID="teaching-back-button" hitSlop={10}>
          <CaretLeft size={22} color={colors.onSurfaceInverse} weight="bold" />
        </Pressable>
        <View style={styles.heroContent}>
          <Txt style={{ fontFamily: fonts.displayBold, fontSize: 64, color: "rgba(247,245,240,0.95)" }}>{t.chinese}</Txt>
          <Txt variant="display" color={colors.onSurfaceInverse} style={{ fontSize: 30, lineHeight: 34, marginTop: spacing.xs }}>{t.title}</Txt>
          <Txt variant="subtitle" color={colors.onSurfaceInverse} style={{ opacity: 0.9 }}>{t.subtitle}</Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
        <View style={styles.sourceRow}>
          <BookOpen size={14} color={colors.brandSecondary} weight="regular" />
          <Txt variant="caption" color={colors.brandSecondary} style={{ marginLeft: 6 }}>{t.source_text.toUpperCase()}</Txt>
        </View>
        <Txt variant="body" style={{ fontSize: 17, lineHeight: 28 }}>{t.body}</Txt>
        <Txt variant="caption" style={{ marginTop: spacing.xxl, lineHeight: 16 }}>
          Presented as historical exploration and personal reflection — not medical advice.
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 260 },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: spacing.xl },
  back: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(26,25,24,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  sourceRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
});
