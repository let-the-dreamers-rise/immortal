// Sharing Immortal: the native share sheet on phones, the browser's share
// sheet where there is one, and a copied link everywhere else.
import { Platform, Share } from "react-native";

import { notify } from "./feedback";

export const APP_URL = "https://immortal-app-14903.web.app";

const TEXT = "Five quiet minutes a day of Chinese Daoist practice, guided step by step. Try one minute, no account needed:";

export function shareApp() {
  return shareLink("Immortal", TEXT, APP_URL);
}

export function lineageUrl(lineageId: string) {
  return `${APP_URL}/lineage/${encodeURIComponent(lineageId)}`;
}

/** An invitation to carry one lineage together; the link opens a preview for people without an account. */
export function shareLineage(lineageId: string, title: string, minutes: number) {
  const text = `I'm carrying "${title}" on Immortal, ${minutes} minutes a day. Carry it with me:`;
  return shareLink(title, text, lineageUrl(lineageId));
}

async function shareLink(title: string, text: string, url: string) {
  if (Platform.OS !== "web") {
    await Share.share({ message: `${text} ${url}` }).catch(() => {});
    return;
  }
  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  if (nav?.share) {
    // A dismissed sheet rejects; that is the person's choice, not an error.
    await nav.share({ title, text, url }).catch(() => {});
    return;
  }
  try {
    await nav.clipboard.writeText(`${text} ${url}`);
    notify("Link copied", "Paste it into an email or a message.");
  } catch {
    notify(`Share ${title}`, `${text} ${url}`);
  }
}
