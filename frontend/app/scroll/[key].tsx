import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft } from "phosphor-react-native";

import { Button, EmptyState, Loading, Txt } from "@/src/components/ui";
import { ApiError, apiFetch } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import type { Scroll } from "@/src/passes/types";
import { colors, fonts, radius, spacing } from "@/src/theme";

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export default function ScrollScreen() {
  const { key, fresh } = useLocalSearchParams<{ key: string; fresh?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [scroll, setScroll] = useState<Scroll | null>(null);
  const [error, setError] = useState<{ sealed: boolean; message: string } | null>(null);

  // Wait for the session token to be restored: a deep link lands here cold.
  useEffect(() => {
    if (authLoading) return;
    apiFetch<{ scroll: Scroll }>(`/passes/${key}`)
      .then((r) => {
        setScroll(r.scroll);
        // A scroll opening is the one moment in the app that earns a flourish.
        if (fresh) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      })
      .catch((e) =>
        setError({
          sealed: e instanceof ApiError && e.status === 403,
          message: e instanceof ApiError ? e.message : "This scroll could not be loaded. Check your connection.",
        })
      );
  }, [authLoading, key, fresh]);

  return (
    <View style={styles.container}>
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="scroll-back-button">
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
        <Txt variant="label">{scroll ? `Day ${scroll.day.toLocaleString("en-US")}` : ""}</Txt>
        <View style={{ width: 22 }} />
      </View>

      {error ? (
        <EmptyState title={error.sealed ? "Still sealed" : "Could not open this scroll"} body={error.message}>
          <Button label="See the passes" variant="ghost" small onPress={() => router.replace("/passes")} />
        </EmptyState>
      ) : !scroll ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxxl }}
          showsVerticalScrollIndicator={false}
        >
          {fresh ? (
            <Txt variant="caption" center color={colors.cinnabar} style={{ marginBottom: spacing.lg }} testID="scroll-fresh">
              A SCROLL HAS OPENED
            </Txt>
          ) : null}

          <View style={styles.head}>
            <View style={styles.seal}>
              <Txt style={styles.sealGlyph}>{scroll.glyph}</Txt>
            </View>
            <Txt variant="display" center style={{ fontSize: 32, lineHeight: 38, marginTop: spacing.lg }}>
              {scroll.title}
            </Txt>
            <Txt variant="caption" center style={{ marginTop: spacing.xs }}>
              {scroll.subtitle.toUpperCase()}
            </Txt>
          </View>

          {scroll.zh ? (
            <Txt selectable style={styles.zh}>
              {scroll.zh}
            </Txt>
          ) : null}
          {scroll.translation ? <Txt style={styles.translation}>{scroll.translation}</Txt> : null}

          {scroll.body ? (
            scroll.body.map((para, i) => (
              <Txt key={i} variant="body" style={styles.para}>
                {para}
              </Txt>
            ))
          ) : (
            <Txt variant="body" style={styles.para}>
              This scroll is open to you, but its text has not been installed on this server yet. It is kept apart from
              the app on purpose. Please try again later.
            </Txt>
          )}

          {scroll.source ? (
            <Txt variant="caption" style={{ marginTop: spacing.xl, lineHeight: 16 }}>
              {scroll.source}
            </Txt>
          ) : null}

          {scroll.sealed && scroll.fingerprint ? (
            <View style={styles.proof} testID="scroll-proof">
              <Txt variant="caption" color={colors.cinnabar}>
                {scroll.verified ? "SEALED, AND UNCHANGED" : "SEALED"}
              </Txt>
              <Txt variant="bodySm" style={{ marginTop: spacing.xs }}>
                {"This scroll's fingerprint was published before anyone could open it. It is the SHA-256 of its key, " +
                  "title, text and the nonce below, so anyone can check that not one character has changed."}
              </Txt>
              <Txt selectable style={styles.mono}>
                {scroll.fingerprint}
              </Txt>
              {scroll.nonce ? (
                <Txt selectable style={styles.mono}>
                  nonce {scroll.nonce}
                </Txt>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}
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
  },
  head: { alignItems: "center", marginBottom: spacing.xl },
  seal: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.cinnabar,
    alignItems: "center",
    justifyContent: "center",
  },
  sealGlyph: { fontFamily: fonts.display, fontSize: 38, lineHeight: 46, color: colors.onCinnabar },
  zh: { fontSize: 20, lineHeight: 34, color: colors.onSurface, letterSpacing: 1 },
  translation: {
    fontFamily: fonts.displayRegular,
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  para: { fontSize: 16, lineHeight: 26, marginTop: spacing.md },
  proof: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  mono: { fontFamily: MONO, fontSize: 11, lineHeight: 16, color: colors.onSurfaceSecondary, marginTop: spacing.sm },
});
