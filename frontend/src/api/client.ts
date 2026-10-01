// Thin API client. Token is held in-memory (set by AuthContext) and injected
// as a Bearer header. Base URL comes from EXPO_PUBLIC_BACKEND_URL.

const RAW_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
export const API_BASE = RAW_BASE.replace(/\/$/, "") + "/api";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Opts = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  /** Send without waiting for the saved session to be restored (bootstrap only). */
  beforeAuthReady?: boolean;
};

// Screens opened straight from a link (or a page reload on the web) mount
// before the saved session is read from storage. Their first request would
// go out without a token and fail with "Not authenticated". Every request
// waits for the restore to finish instead.
let markAuthReady: () => void = () => {};
const authReady = new Promise<void>((resolve) => {
  markAuthReady = resolve;
});
export function setAuthReady() {
  markAuthReady();
}

// The practitioner's own day: the server dates practice by this zone rather
// than UTC, so a 6am session in India counts for that morning.
function clockHeaders(): Record<string, string> {
  const out: Record<string, string> = { "X-UTC-Offset": String(-new Date().getTimezoneOffset()) };
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) out["X-Timezone"] = tz;
  } catch {
    // The offset alone is enough.
  }
  return out;
}

const TIMEOUT_MS = 20000;
export const OFFLINE_MESSAGE = "Could not reach Immortal. Check your connection and try again.";

export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, headers = {}, beforeAuthReady = false } = opts;
  if (!beforeAuthReady) await authReady;
  // A request on a weak mobile signal can hang without ever failing; give up
  // after a while so the screen can offer a retry instead of spinning.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...clockHeaders(),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    let message =
      (data && typeof data === "object" && (data.detail || data.message)) ||
      (typeof data === "string" && data.length < 200 && data) ||
      "Something went wrong";
    // FastAPI validation errors arrive as a list of objects.
    if (Array.isArray(message)) message = message[0]?.msg || "Please check what you entered.";
    if (res.status >= 500) message = "Something went wrong on our side. Please try again in a moment.";
    throw new ApiError(res.status, String(message), data);
  }
  return data as T;
}

// Absolute URL for backend-served media (illustration_url is relative "/api/...").
export function mediaUri(relative?: string | null): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith("http")) return relative;
  return RAW_BASE.replace(/\/$/, "") + relative;
}

/** A message fit to show a person, whatever was thrown. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Something went wrong. Please try again.";
}
