import { Share } from "react-native";

import type { PracticeName } from "./types";

// Optional link appended to shared names, e.g. the Play Store listing.
const SHARE_URL = process.env.EXPO_PUBLIC_SHARE_URL || "";

export function nth(n: number): string {
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n.toLocaleString("en-US")}${suffix}`;
}

export function shortPrint(fingerprint?: string | null): string {
  if (!fingerprint) return "";
  return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-4)}`;
}

export async function shareName(n: PracticeName) {
  const lines = [
    `My practice name in Immortal is ${n.name} (${n.romanized}, "${n.gloss}"): ` +
      `${nth(n.seat)} of the ${n.generation_label.toLowerCase()}, which will only ever have ${n.generation_size.toLocaleString("en-US")} people.`,
    "Its scrolls open only on days you practise. The last one takes nine years.",
  ];
  if (SHARE_URL) lines.push(SHARE_URL);
  try {
    await Share.share({ message: lines.join("\n\n") });
  } catch {
    // Dismissed or unavailable; nothing to do.
  }
}
