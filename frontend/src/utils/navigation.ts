import type { Router } from "expo-router";

/** Back if there is somewhere to go back to; otherwise home (e.g. opened from a link). */
export function goBack(router: Router) {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/today");
}
