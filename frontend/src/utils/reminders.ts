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

// The reminder names something specific and small enough to say yes to while
// standing somewhere. A prompt to "practise" asks the reader to decide what
// and for how long, which is the decision this app exists to remove; a prompt
// naming a minute of tooth tapping on a bus does not.
//
// Rotated by day so the same line does not arrive every morning. No streak is
// mentioned and no day is described as missed — nothing here should make
// returning feel like an apology.
const NUDGES: { title: string; body: string }[] = [
  {
    title: "A minute, wherever you are",
    body: "Tapping the teeth — Kou Chi. Nobody can tell you are doing it. Ge Hong wrote it down in 318.",
  },
  {
    title: "On the way",
    body: "Walking somewhere? Breathe in over four steps, out over four. That is the whole practice.",
  },
  {
    title: "While you wait",
    body: "Rub the palms until they are warm, then hold them apart and notice what is there. Often nothing. That counts.",
  },
  {
    title: "If you are on a bus",
    body: "Unlock the knees, let the shoulders drop, and feel the small corrections your body is already making.",
  },
  {
    title: "A minute of stillness",
    body: "Sit as you are and decide not to move for sixty seconds. Notice where you wanted to move first.",
  },
  {
    title: "Rest the eyes",
    body: "Look at the furthest thing you can see, and let the gaze go wide. Twenty seconds is enough.",
  },
  {
    title: "Three breaths",
    body: "One hand below the navel. Breathe so the belly moves, out a little longer than in. Three is the whole thing.",
  },
];

// When someone carries a lineage, two days a week the reminder is about it
// instead: the reason to come back is the people carrying it too. The text
// stays true however long ago it was scheduled, since it names no count.
let lineageNudges: { title: string; body: string }[] = [];
const LINEAGE_WEEKDAYS = [2, 5]; // Monday and Thursday

export function lineageNudgesFor(lineages: { title: string; carried_recently: number }[]) {
  return lineages.slice(0, LINEAGE_WEEKDAYS.length).map((l) => ({
    title: `Your lineage: ${l.title}`,
    body:
      l.carried_recently > 0
        ? "Others are carrying it with you. Practise, then log the day so they can see it."
        : "Practise it today, then log the day. Whoever comes next will see it.",
  }));
}

/** Swap in lineage reminders; returns true when they changed and the schedule should be rebuilt. */
export function setLineageNudges(next: { title: string; body: string }[]): boolean {
  const changed = JSON.stringify(next) !== JSON.stringify(lineageNudges);
  lineageNudges = next;
  return changed;
}

function nudgeFor(weekday: number) {
  const slot = LINEAGE_WEEKDAYS.indexOf(weekday);
  if (slot >= 0 && lineageNudges.length > 0) return lineageNudges[slot % lineageNudges.length];
  return NUDGES[(weekday - 1) % NUDGES.length];
}

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

export async function scheduleDailyReminder(hour: number, minute: number, _path?: string | null) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-practice", {
        name: "Daily practice",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    // One weekly notification per weekday, each with its own nudge. A single
    // DAILY trigger repeats the text it was scheduled with forever, so the
    // rotation above never actually rotated.
    for (let weekday = 1; weekday <= 7; weekday++) {
      const nudge = nudgeFor(weekday);
      await Notifications.scheduleNotificationAsync({
        content: { title: nudge.title, body: nudge.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: "daily-practice",
        },
      });
    }
  } catch {
    // scheduling unsupported (e.g. Expo Go Android) — no-op
  }
}

/** Re-create a saved reminder (new phone, reinstall) only if permission is already given. */
export async function restoreReminder(hour: number, minute: number) {
  if (Platform.OS === "web") return;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
  } catch {
    return;
  }
  await scheduleDailyReminder(hour, minute);
}

export async function cancelDailyReminder() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
