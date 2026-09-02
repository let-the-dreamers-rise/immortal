import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { ApiError } from "@/src/api/client";
import { colors, fonts, IMAGES, radius, spacing } from "@/src/theme";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { register, login, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        if (name.trim().length < 2) throw new ApiError(400, "Choose a display name (2+ characters).");
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={{ uri: IMAGES.onboardingBg }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={["rgba(26,25,24,0.15)", "rgba(26,25,24,0.55)", colors.surface]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xxl }]}>
          <Txt variant="display" color={colors.onSurfaceInverse} style={{ fontSize: 52, lineHeight: 56 }}>
            長生
          </Txt>
          <Txt variant="subtitle" color={colors.onSurfaceInverse} style={{ marginTop: spacing.xs, opacity: 0.9 }}>
            A path toward a longer, quieter life
          </Txt>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + spacing.xl }]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Txt variant="title">{mode === "register" ? "Begin your journey" : "Welcome back"}</Txt>
        <Txt variant="bodySm" style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
          {mode === "register"
            ? "Choose a name others will see — it can be a pseudonym."
            : "Return to your practice."}
        </Txt>

        {mode === "register" && (
          <Field
            label="Display name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. River Walker"
            testID="auth-name-input"
            autoCapitalize="words"
          />
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          testID="auth-email-input"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          testID="auth-password-input"
        />

        {error ? (
          <Txt variant="bodySm" color={colors.error} style={{ marginTop: spacing.sm }} testID="auth-error">
            {error}
          </Txt>
        ) : null}

        <Button
          label={mode === "register" ? "Create account" : "Sign in"}
          onPress={submit}
          loading={busy}
          testID="auth-submit-button"
          style={{ marginTop: spacing.lg }}
        />

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Txt variant="caption" style={{ marginHorizontal: spacing.md }}>OR</Txt>
          <View style={styles.line} />
        </View>

        <Button label="Continue with Google" variant="ghost" onPress={google} testID="auth-google-button" />

        <Pressable
          onPress={() => {
            setError(null);
            setMode(mode === "register" ? "login" : "register");
          }}
          style={{ marginTop: spacing.xl, alignItems: "center" }}
          testID="auth-toggle-mode"
        >
          <Txt variant="bodySm">
            {mode === "register" ? "Already walking the path? " : "New here? "}
            <Txt variant="bodySm" color={colors.brandPrimary} weight="semi">
              {mode === "register" ? "Sign in" : "Create an account"}
            </Txt>
          </Txt>
        </Pressable>

        <Txt variant="caption" center style={styles.disclaimer}>
          This is historical exploration, not medical advice. By continuing you accept our approach to
          personal, non-clinical practice.
        </Txt>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Field({
  label,
  testID,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; testID?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Txt variant="caption" style={{ marginBottom: spacing.xs }}>{label.toUpperCase()}</Txt>
      <TextInput
        {...props}
        testID={testID}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 280 },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: spacing.xl },
  form: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurface,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  disclaimer: { marginTop: spacing.xl, lineHeight: 16, paddingHorizontal: spacing.md },
});
