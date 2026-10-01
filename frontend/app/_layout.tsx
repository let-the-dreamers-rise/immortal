import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { colors, fontMap } from "@/src/theme";

LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
// Prewarms @expo/vector-icons fonts on Android Expo Go (see original template note).
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const seg0 = segments[0];
    const inAuth = seg0 === "auth" || seg0 === "welcome";
    const inOnboarding = seg0 === "onboarding";
    // Terms and Privacy are readable by anyone, signed in or not.
    if (seg0 === "legal") return;

    if (!user) {
      // A visitor from a shared link can read a practice and try a session
      // before deciding to sign up.
      const open = inAuth || seg0 === "session" || seg0 === "practice";
      if (!open) router.replace("/welcome");
    } else if (!user.onboarded) {
      if (!inOnboarding) router.replace("/onboarding");
    } else if (inAuth || inOnboarding || seg0 === undefined) {
      // Today answers "what do I do now"; it is where a returning member lands.
      router.replace("/(tabs)/today");
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="stage/[order]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="practice/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="session/[id]" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
      <Stack.Screen name="user/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="teaching/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="log/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="meetup/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="log/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="meetup/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="lineage/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="lineage/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="legal/[doc]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="blocked" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="moderation" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts(fontMap);

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaProvider>
        <KeyboardProvider>
            <AuthProvider>
              <View style={{ flex: 1, backgroundColor: colors.surface }}>
                <StatusBar style="dark" />
                <RootNavigator />
              </View>
            </AuthProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
