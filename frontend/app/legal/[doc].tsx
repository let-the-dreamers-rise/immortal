// Terms and Privacy Policy, readable in the app and on the web at
// /legal/terms and /legal/privacy (the address Google Play asks for).
// Open to everyone, signed in or not.
import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft } from "phosphor-react-native";

import { Txt } from "@/src/components/ui";
import { PRIVACY, TERMS } from "@/src/legal/generated";
import { goBack } from "@/src/utils/navigation";
import { colors, fonts, spacing } from "@/src/theme";

// Just enough Markdown for the two documents: headings, bullets, tables,
// rules and **bold**.
function Inline({ text, style }: { text: string; style?: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={i} style={{ fontFamily: fonts.bodySemi }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) return;
    if (line.startsWith("# ")) out.push(<Txt key={i} variant="displaySm" style={styles.h1}>{line.slice(2)}</Txt>);
    else if (line.startsWith("## ")) out.push(<Txt key={i} variant="title" style={styles.h2}>{line.slice(3)}</Txt>);
    else if (line.startsWith("### ")) out.push(<Txt key={i} variant="label" style={styles.h3}>{line.slice(4)}</Txt>);
    else if (/^-{3,}$/.test(line)) out.push(<View key={i} style={styles.rule} />);
    else if (/^\|[\s|:-]+\|$/.test(line)) return; // table separator row
    else if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      out.push(
        <View key={i} style={styles.row}>
          {cells.map((c, j) => (
            <Inline key={j} text={c} style={[styles.p, styles.cell, j === 0 && { fontFamily: fonts.bodyMedium }]} />
          ))}
        </View>
      );
    } else if (/^\s*[-*] /.test(line)) {
      out.push(
        <View key={i} style={styles.bullet}>
          <Text style={styles.p}>•  </Text>
          <Inline text={line.replace(/^\s*[-*] /, "")} style={[styles.p, { flex: 1 }]} />
        </View>
      );
    } else out.push(<Inline key={i} text={line} style={[styles.p, { marginTop: spacing.sm }]} />);
  });
  return <>{out}</>;
}

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const source = doc === "privacy" ? PRIVACY : TERMS;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => goBack(router)} hitSlop={10} testID="legal-back">
          <CaretLeft size={22} color={colors.onSurface} weight="bold" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <Markdown source={source} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topbar: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  h1: { marginBottom: spacing.sm },
  h2: { marginTop: spacing.xl, marginBottom: spacing.xs },
  h3: { marginTop: spacing.lg },
  p: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.onSurfaceSecondary },
  rule: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  cell: { flex: 1, fontSize: 13, lineHeight: 19 },
  bullet: { flexDirection: "row", marginTop: spacing.xs, paddingLeft: spacing.sm },
});
