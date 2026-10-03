// Usage events, sent to Immortal's own server and nowhere else. They answer
// one question: do people finish a practice and come back? Events carry a
// random device ID and never any text a person wrote.
import { Platform } from "react-native";

import { apiFetch } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

export type EventName =
  | "app_open"
  | "practice_started"
  | "practice_finished"
  | "day_counted"
  | "signup"
  | "lineage_joined"
  | "invite_shared"
  | "error";

type Props = Record<string, string | number | boolean | null>;
type Event = { name: EventName; props: Props };

const DEVICE_KEY = "immortal_device_id";
const FLUSH_MS = 2000;
const MAX_BATCH = 20;

let deviceId: Promise<string> | null = null;
let queue: Event[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function randomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "dev_";
  for (let i = 0; i < 24; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getDeviceId(): Promise<string> {
  if (!deviceId) {
    deviceId = (async () => {
      try {
        const saved = await storage.getItem<string>(DEVICE_KEY, "");
        if (saved) return saved;
        const fresh = randomId();
        await storage.setItem(DEVICE_KEY, fresh);
        return fresh;
      } catch {
        return randomId();
      }
    })();
  }
  return deviceId;
}

async function flush() {
  timer = null;
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  try {
    await apiFetch("/events", { method: "POST", body: { device_id: await getDeviceId(), events: batch } });
  } catch {
    // Usage numbers are not worth retrying or bothering anyone about.
  }
  if (queue.length) schedule();
}

function schedule() {
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

export function track(name: EventName, props: Props = {}) {
  queue = [...queue, { name, props: { platform: Platform.OS, ...props } }];
  schedule();
}

let errorsSent = 0;
const MAX_ERRORS = 5;

/** Report a crash or unhandled error: the message and where, never user content. */
export function trackError(error: unknown, where: string) {
  if (errorsSent >= MAX_ERRORS) return;
  errorsSent += 1;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  track("error", { message: message.slice(0, 300), where });
}

let installed = false;

/** Count this app open and start catching errors. Safe to call more than once. */
export function startTracking() {
  if (installed) return;
  installed = true;
  track("app_open");
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.addEventListener("error", (e) => trackError(e.error ?? e.message, "window"));
    window.addEventListener("unhandledrejection", (e) => trackError(e.reason, "promise"));
    return;
  }
  const g: any = globalThis as any;
  const handler = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
    trackError(error, isFatal ? "fatal" : "native");
    // Give the report a moment to leave before a fatal error closes the app.
    if (isFatal) flush();
    handler?.(error, isFatal);
  });
}
