import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { colors, fonts, radius, spacing } from "@/src/theme";

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
type TxtProps = TextProps & {
  variant?: "display" | "displaySm" | "title" | "subtitle" | "body" | "bodySm" | "label" | "caption";
  color?: string;
  center?: boolean;
  weight?: "regular" | "medium" | "semi" | "bold";
};

export function Txt({ variant = "body", color, center, weight, style, ...rest }: TxtProps) {
  return (
    <Text
      {...rest}
      style={[
        VARIANTS[variant],
        color ? { color } : null,
        center ? { textAlign: "center" } : null,
        weight ? { fontFamily: BODY_WEIGHT[weight] } : null,
        style,
      ]}
    />
  );
}

const BODY_WEIGHT: Record<string, string> = {
  regular: fonts.body,
  medium: fonts.bodyMedium,
  semi: fonts.bodySemi,
  bold: fonts.bodyBold,
};

const VARIANTS = StyleSheet.create({
  display: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 44, color: colors.onSurface },
  displaySm: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.onSurface },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.onSurface },
  subtitle: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22, color: colors.onSurfaceSecondary },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.onSurface },
  bodySm: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.onSurfaceSecondary },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 18, color: colors.onSurface },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14, color: colors.muted, letterSpacing: 0.5 },
});

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
  small?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
  style,
  small,
}: BtnProps) {
  const bg = {
    primary: colors.brandPrimary,
    secondary: colors.surfaceTertiary,
    ghost: "transparent",
    inverse: colors.surface,
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    secondary: colors.onSurface,
    ghost: colors.brandPrimary,
    inverse: colors.onSurface,
  }[variant];

  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg },
        { backgroundColor: bg },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.borderStrong },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnLabel, { color: fg }, small && { fontSize: 14 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Chip (filter)
// ---------------------------------------------------------------------------
export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: active ? colors.onBrandPrimary : colors.onSurfaceSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Card / Divider / Badge / Avatar
// ---------------------------------------------------------------------------
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function Badge({ label, tone = "brand" }: { label: string; tone?: "brand" | "warning" | "elder" }) {
  const map = {
    brand: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
    warning: { bg: "#F0E6D0", fg: colors.warning },
    elder: { bg: colors.surfaceInverse, fg: colors.onSurfaceInverse },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function Avatar({
  name,
  uri,
  size = 44,
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceTertiary }}
        contentFit="cover"
      />
    );
  }
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brandTertiary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.4, color: colors.onSurface }}>
        {initials}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// State views
// ---------------------------------------------------------------------------
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.brandPrimary} />
      {label ? <Txt variant="bodySm" style={{ marginTop: spacing.md }}>{label}</Txt> : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Txt variant="title" center>{title}</Txt>
      {body ? (
        <Txt variant="bodySm" center style={{ marginTop: spacing.sm, maxWidth: 300 }}>
          {body}
        </Txt>
      ) : null}
      {children ? <View style={{ marginTop: spacing.xl }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  btnLabel: { fontFamily: fonts.bodySemi, fontSize: 16, letterSpacing: 0.3 },
  chip: {
    height: 36,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipInactive: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipLabel: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: { height: 1, backgroundColor: colors.divider },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
