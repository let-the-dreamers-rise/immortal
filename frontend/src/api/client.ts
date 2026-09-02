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
};

export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = opts;
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.detail || data.message)) ||
      (typeof data === "string" && data) ||
      "Something went wrong";
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
