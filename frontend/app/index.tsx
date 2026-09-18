import { View, StyleSheet } from "react-native";
import { Loading, Txt } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

export default function Index() {
  return (
    <View style={styles.container} testID="splash-screen">
      <Txt variant="display" center color={colors.onSurface}>
        長生
      </Txt>
      <Txt variant="subtitle" center style={{ marginTop: spacing.sm, marginBottom: spacing.xxl }}>
        Essence Path
      </Txt>
      <Loading />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
