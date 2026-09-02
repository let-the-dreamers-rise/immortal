import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { apiFetch, setAuthToken } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "immortality_session_token";

export type User = {
  user_id: string;
  display_name: string;
  picture?: string | null;
  intention?: string | null;
  path_choice?: string | null;
  bio?: string | null;
  onboarded: boolean;
  created_at?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string, display_name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const processedSessionIds = useRef<Set<string>>(new Set());
  const capturedUrl = useRef<string | null>(null);

  const persistToken = useCallback(async (token: string) => {
    setAuthToken(token);
    await storage.secureSet(TOKEN_KEY, token);
  }, []);

  const clearToken = useCallback(async () => {
    setAuthToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setUserState(null);
  }, []);

  const exchangeSessionId = useCallback(
    async (sessionId: string) => {
      if (processedSessionIds.current.has(sessionId)) return;
      processedSessionIds.current.add(sessionId);
      const res = await apiFetch<{ session_token: string; user: User }>("/auth/session", {
        method: "POST",
        body: { session_id: sessionId },
      });
      await persistToken(res.session_token);
      setUserState(res.user);
    },
    [persistToken]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: User }>("/auth/me");
      setUserState(res.user);
    } catch {
      await clearToken();
    }
  }, [clearToken]);

  // Bootstrap: process any inbound session_id first, else restore token.
  useEffect(() => {
    let sub: Linking.EventSubscription | undefined;
    (async () => {
      try {
        if (Platform.OS === "web") {
          const href = typeof window !== "undefined" ? window.location.href : null;
          const sid = extractSessionId(href);
          if (sid) {
            await exchangeSessionId(sid);
            if (typeof window !== "undefined") {
              const clean = window.location.origin + window.location.pathname;
              window.history.replaceState(window.history.state, "", clean);
            }
            setLoading(false);
            return;
          }
        } else {
          sub = Linking.addEventListener("url", ({ url }) => {
            capturedUrl.current = url;
            const sid = extractSessionId(url);
            if (sid) exchangeSessionId(sid).catch(() => {});
          });
          const initial = await Linking.getInitialURL();
          const sid = extractSessionId(initial);
          if (sid) {
            await exchangeSessionId(sid);
            setLoading(false);
            return;
          }
        }

        const token = await storage.secureGet<string>(TOKEN_KEY, "");
        if (token) {
          setAuthToken(token);
          await refresh();
        }
      } catch {
        // stay logged out
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, [exchangeSessionId, refresh]);

  const register = useCallback(
    async (email: string, password: string, display_name: string) => {
      const res = await apiFetch<{ session_token: string; user: User }>("/auth/register", {
        method: "POST",
        body: { email, password, display_name },
      });
      await persistToken(res.session_token);
      setUserState(res.user);
    },
    [persistToken]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ session_token: string; user: User }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      await persistToken(res.session_token);
      setUserState(res.user);
    },
    [persistToken]
  );

  const signInWithGoogle = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? window.location.origin + "/"
        : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }

    capturedUrl.current = null;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    let url: string | null = null;
    if (result.type === "success" && (result as any).url) {
      url = (result as any).url;
    }
    if (!url) url = capturedUrl.current;
    if (!url) url = await Linking.getInitialURL();
    const sid = extractSessionId(url);
    if (sid) {
      await exchangeSessionId(sid);
    }
  }, [exchangeSessionId]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    await clearToken();
  }, [clearToken]);

  const setUser = useCallback((u: User) => setUserState(u), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, register, login, signInWithGoogle, logout, setUser, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
