// Sharing Immortal: the native share sheet on phones, the browser's share
// sheet where there is one, and a copied link everywhere else.
import { Platform, Share } from "react-native";

import { notify } from "./feedback";

export const APP_URL = "https://immortal-app-14903.web.app";

const TEXT = "Five quiet minutes a day of Chinese Daoist practice, guided step by step. Try one minute, no account needed:";

export async function shareApp() {
  if (Platform.OS !== "web") {
    await Share.share({ message: `${TEXT} ${APP_URL}` }).catch(() => {});
    return;
  }
  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  if (nav?.share) {
    // A dismissed sheet rejects; that is the person's choice, not an error.
    await nav.share({ title: "Immortal", text: TEXT, url: APP_URL }).catch(() => {});
    return;
  }
  try {
    await nav.clipboard.writeText(`${TEXT} ${APP_URL}`);
    notify("Link copied", "Paste it into an email or a message.");
  } catch {
    notify("Share Immortal", `${TEXT} ${APP_URL}`);
  }
}
