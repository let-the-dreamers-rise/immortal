import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeft, Eye, EyeSlash } from "@/src/components/icons";

import { Button, Txt } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, IMAGES, radius, spacing } from "@/src/theme";

type Mode = "login" | "register" | "forgot" | "reset";

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY: Record<Mode, { title: string; sub: string; cta: string }> = {
  register: { title: "Begin your journey", sub: "Choose a name others will see — it can be a pseudonym.", cta: "Create account" },
  login: { title: "Welcome back", sub: "Return to your practice.", cta: "Sign in" },
  forgot: { title: "Reset your password", sub: "We'll email you a six-digit code.", cta: "Send code" },
  reset: { title: "Enter your code", sub: "Check your inbox, then choose a new password.", cta: "Set new password" },
};

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register, login, signInWithGoogle, requestPasswordReset, resetPassword, providers } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === "login" ? "login" : "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchTo = (next: Mode) => {
    setError(null);
    setNotice(null);
    setMode(next);
  };

  const validate = (): string | null => {
    if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
    if (mode === "register" && name.trim().length < 2) return "Choose a display name (2+ characters).";
    if ((mode === "register" || mode === "reset") && password.length < MIN_PASSWORD)
      return `Use at least ${MIN_PASSWORD} characters for your password.`;
    if (mode === "login" && !password) return "Enter your password.";
    if (mode === "reset" && !/^\d{6}$/.test(code.trim())) return "The code is six digits.";
    return null;
  };

  const submit = async () => {
    setError(null);
    setNotice(null);
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      const e = email.trim();
      if (mode === "register") await register(e, password, name.trim());
      else if (mode === "login") await login(e, password);
      else if (mode === "forgot") {
        await requestPasswordReset(e);
        setPassword("");
        setMode("reset");
        setNotice("If an account uses that email, a code is on its way.");
      } else await resetPassword(e, code.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[mode];
  const needsPassword = mode !== "forgot";

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={{ uri: IMAGES.onboardingBg }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={["rgba(26,25,24,0.15)", "rgba(26,25,24,0.55)", colors.surface]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))}
          style={[styles.back, { top: insets.top + spacing.sm }]}
          hitSlop={10}
          testID="auth-back"
        >
          <CaretLeft size={22} color={colors.onSurfaceInverse} weight="bold" />
        </Pressable>
        <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xxl }]}>
          <Txt variant="display" color={colors.onSurfaceInverse} style={{ fontSize: 52, lineHeight: 56 }}>
            長生
          </Txt>
          <Txt variant="subtitle" color={colors.onSurfaceInverse} style={{ marginTop: spacing.xs, opacity: 0.9 }}>
            Five quiet minutes a day, from a tradition that never stopped hoping
          </Txt>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + spacing.xl }]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Txt variant="title">{copy.title}</Txt>
        <Txt variant="bodySm" style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
          {copy.sub}
        </Txt>

        {mode === "register" && (
          <Field
            label="Display name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. River Walker"
            testID="auth-name-input"
            autoCapitalize="words"
            maxLength={40}
          />
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          testID="auth-email-input"
        />
        {mode === "reset" && (
          <Field
            label="Six-digit code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            testID="auth-code-input"
          />
        )}
        {needsPassword && (
          <PasswordField
            label={mode === "reset" ? "New password" : "Password"}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === "login" ? "Your password" : `At least ${MIN_PASSWORD} characters`}
            testID="auth-password-input"
          />
        )}

        {mode === "login" && providers.password_reset && (
          <Pressable onPress={() => switchTo("forgot")} style={{ alignSelf: "flex-end" }} testID="auth-forgot-link">
            <Txt variant="bodySm" color={colors.brandPrimary} weight="semi">Forgot password?</Txt>
          </Pressable>
        )}

        {notice ? (
          <Txt variant="bodySm" color={colors.success} style={{ marginTop: spacing.sm }} testID="auth-notice">
            {notice}
          </Txt>
        ) : null}
        {error ? (
          <Txt variant="bodySm" color={colors.error} style={{ marginTop: spacing.sm }} testID="auth-error">
            {error}
          </Txt>
        ) : null}

        <Button label={copy.cta} onPress={submit} loading={busy} testID="auth-submit-button" style={{ marginTop: spacing.lg }} />

        {(mode === "login" || mode === "register") && providers.google ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Txt variant="caption" style={{ marginHorizontal: spacing.md }}>OR</Txt>
              <View style={styles.line} />
            </View>
            <Button label="Continue with Google" variant="ghost" onPress={google} disabled={busy} testID="auth-google-button" />
          </>
        ) : null}

        <Pressable
          onPress={() => switchTo(mode === "register" ? "login" : mode === "login" ? "register" : "login")}
          style={{ marginTop: spacing.xl, alignItems: "center" }}
          testID="auth-toggle-mode"
        >
          <Txt variant="bodySm">
            {mode === "register" ? "Already walking the path? " : mode === "login" ? "New here? " : "Remembered it? "}
            <Txt variant="bodySm" color={colors.brandPrimary} weight="semi">
              {mode === "login" ? "Create an account" : "Sign in"}
            </Txt>
          </Txt>
        </Pressable>

        <Txt variant="caption" center style={styles.disclaimer}>
          This is historical exploration and personal practice, not medical advice. By continuing you confirm
          you are 18 or older and agree to the{" "}
          <Txt variant="caption" color={colors.brandPrimary} onPress={() => router.push("/legal/terms")}>
            Terms
          </Txt>{" "}
          and{" "}
          <Txt variant="caption" color={colors.brandPrimary} onPress={() => router.push("/legal/privacy")}>
            Privacy Policy
          </Txt>
          .
        </Txt>
      </KeyboardAwareScrollView>
    </View>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string; testID?: string };

function Field({ label, testID, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Txt variant="caption" style={{ marginBottom: spacing.xs }}>{label.toUpperCase()}</Txt>
      <TextInput {...props} testID={testID} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

function PasswordField({ label, testID, ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeSlash : Eye;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Txt variant="caption" style={{ marginBottom: spacing.xs }}>{label.toUpperCase()}</Txt>
      <View>
        <TextInput
          {...props}
          testID={testID}
          secureTextEntry={!visible}
          maxLength={128}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.muted}
          style={[styles.input, { paddingRight: 48 }]}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
          hitSlop={8}
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          testID={`${testID}-toggle`}
        >
          <Icon size={20} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 280 },
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
  eye: { position: "absolute", right: spacing.lg, top: 0, bottom: 0, justifyContent: "center" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  disclaimer: { marginTop: spacing.xl, lineHeight: 16, paddingHorizontal: spacing.md },
});
