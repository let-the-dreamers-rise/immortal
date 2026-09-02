import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const MESSAGES: Record<string, string> = {
  dao: "A quiet moment awaits. Move, breathe, and note how today felt on the Dao Path.",
  ayurveda: "Time for your daily rhythm. A little practice, then a line in your journal.",
  both: "A gentle pause for practice. Show up, however small — then log it.",
};

export type PermissionOutcome = "granted" | "denied" | "blocked";

export async function requestReminderPermission(): Promise<PermissionOutcome> {
  if (Platform.OS === "web") return "denied";
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return "granted";
    if (!current.canAskAgain) return "blocked";
    const asked = await Notifications.requestPermissionsAsync();
    if (asked.granted) return "granted";
    return asked.canAskAgain ? "denied" : "blocked";
  } catch {
    return "denied";
  }
}

export async function scheduleDailyReminder(hour: number, minute: number, path?: string | null) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-practice", {
        name: "Daily practice",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "A moment for your practice",
        body: MESSAGES[path || "both"] || MESSAGES.both,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: "daily-practice",
      },
    });
  } catch {
    // scheduling unsupported (e.g. Expo Go Android) — no-op
  }
}

export async function cancelDailyReminder() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
