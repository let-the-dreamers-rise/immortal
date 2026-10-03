// What someone sees when they open a link to Immortal for the first time.
//
// Before this, a stranger who tapped the link in an email met a sign-up form
// and nothing else: no idea what the app is, no way to try it. Now they read
// three lines, can do a one-minute practice with no account, and sign up
// only once they know whether they want to come back.
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Txt } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";

// Seated, one minute, nothing to learn first.
export const TRY_PRACTICE = "micro-dantian-breaths";

const REASONS = [
  {
    glyph: "今",
    title: "Something for right now",
    body: "Today picks one practice for the hour you are in: a minute of breathing at your desk, a walk, or a full set at dawn. Each step is shown and read aloud.",
  },
  {
    glyph: "松",
    title: "No streak to break",
    body: "Your days add up like a growing pine. A missed day costs nothing, so coming back is always easy.",
  },
  {
    glyph: "傳",
    title: "Practices carried for years",
    body: "Daoists kept these methods for ten, twenty, thirty years. In Lineages, members take up a long practice, log their days and leave notes for whoever comes next.",
  },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <Txt style={styles.glyph}>長生</Txt>
      <Txt variant="displaySm" center style={{ marginTop: spacing.sm }}>Immortal</Txt>
      <Txt variant="body" center color={colors.onSurfaceSecondary} style={styles.lede}>
        Five quiet minutes a day of Chinese Daoist practice, from a tradition that never stopped hoping.
      </Txt>

      <Button
        label="Try three breaths now"
        onPress={() => router.push(`/session/${TRY_PRACTICE}`)}
        style={{ marginTop: spacing.xl, alignSelf: "stretch" }}
        testID="welcome-try"
      />
      <Txt variant="caption" center style={{ marginTop: spacing.sm }}>Under a minute. No account needed. Sit anywhere.</Txt>

      <View style={{ marginTop: spacing.xxl, alignSelf: "stretch" }}>
        {REASONS.map((r) => (
          <View key={r.title} style={styles.reason}>
            <Txt style={styles.reasonGlyph}>{r.glyph}</Txt>
            <View style={{ flex: 1 }}>
              <Txt variant="label">{r.title}</Txt>
              <Txt variant="bodySm" style={{ marginTop: 2 }}>{r.body}</Txt>
            </View>
          </View>
        ))}
      </View>

      <Button
        label="Create a free account"
        variant="ghost"
        onPress={() => router.push("/auth?mode=register")}
        style={{ marginTop: spacing.xl, alignSelf: "stretch" }}
        testID="welcome-register"
      />
      <Pressable onPress={() => router.push("/auth?mode=login")} style={{ marginTop: spacing.lg }} testID="welcome-login" hitSlop={8}>
        <Txt variant="bodySm" center>
          Already practising? <Txt variant="bodySm" color={colors.brandPrimary} style={{ fontFamily: fonts.bodySemi }}>Sign in</Txt>
        </Txt>
      </Pressable>

      <Txt variant="caption" center style={{ marginTop: spacing.xxl, maxWidth: 340 }}>
        A personal practice drawn from history, not medical advice. It promises nothing about how long anyone lives.
      </Txt>
      <View style={styles.links}>
        <Pressable onPress={() => router.push("/legal/terms")} hitSlop={8}>
          <Txt variant="caption" color={colors.onSurfaceSecondary}>Terms</Txt>
        </Pressable>
        <Pressable onPress={() => router.push("/legal/privacy")} hitSlop={8}>
          <Txt variant="caption" color={colors.onSurfaceSecondary}>Privacy</Txt>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { alignItems: "center", paddingHorizontal: spacing.xl, maxWidth: 560, width: "100%", alignSelf: "center" },
  glyph: { fontFamily: fonts.display, fontSize: 64, lineHeight: 76, color: colors.onSurface },
  lede: { marginTop: spacing.md, maxWidth: 340 },
  reason: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
  },
  reasonGlyph: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.brandPrimary, width: 34 },
  links: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.md },
});
