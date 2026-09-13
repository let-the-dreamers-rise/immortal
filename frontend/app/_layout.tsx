import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
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
    const inAuth = seg0 === "auth";
    const inOnboarding = seg0 === "onboarding";

    if (!user) {
      if (!inAuth) router.replace("/auth");
    } else if (!user.onboarded) {
      if (!inOnboarding) router.replace("/onboarding");
    } else if (inAuth || inOnboarding || seg0 === undefined) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="stage/[order]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="practice/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="user/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="teaching/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="log/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="meetup/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="log/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="meetup/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
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
          <BottomSheetModalProvider>
            <AuthProvider>
              <View style={{ flex: 1, backgroundColor: colors.surface }}>
                <StatusBar style="dark" />
                <RootNavigator />
              </View>
            </AuthProvider>
          </BottomSheetModalProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
