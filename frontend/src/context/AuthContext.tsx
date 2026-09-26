import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiFetch, setAuthToken } from "@/src/api/client";
import { getGoogleIdToken, googleSignOut, nativeGoogleAvailable } from "@/src/auth/google";
import * as purchases from "@/src/billing/purchases";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "immortality_session_token";

export type User = {
  user_id: string;
  display_name: string;
  picture?: string | null;
  intention?: string | null;
  path_choice?: string | null;
  bio?: string | null;
  onboarded: boolean;
  reminder_enabled?: boolean;
  reminder_hour?: number;
  reminder_minute?: number;
  created_at?: string;
  auth_provider?: string;
  has_password?: boolean;
  is_premium?: boolean;
  premium_expires_at?: string | null;
};

type Providers = { google: boolean; password_reset: boolean };
type SessionResponse = { session_token: string; user: User };

type AuthState = {
  user: User | null;
  loading: boolean;
  /** Inner Chamber membership: the server's verdict or RevenueCat's on this device. */
  isPremium: boolean;
  providers: Providers;
  register: (email: string, password: string, display_name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string | null, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
  refreshPremium: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceEntitled, setDeviceEntitled] = useState(false);
  const [providers, setProviders] = useState<Providers>({ google: false, password_reset: false });

  const clearLocal = useCallback(async () => {
    setAuthToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setUserState(null);
    setDeviceEntitled(false);
    await purchases.forget();
    await googleSignOut();
  }, []);

  const startSession = useCallback(async (res: SessionResponse) => {
    setAuthToken(res.session_token);
    await storage.secureSet(TOKEN_KEY, res.session_token);
    setUserState(res.user);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: User }>("/auth/me");
      setUserState(res.user);
    } catch (e: any) {
      // Only a rejected session signs you out; a flaky network should not.
      if (e?.status === 401) await clearLocal();
    }
  }, [clearLocal]);

  // Bootstrap: restore the saved session.
  useEffect(() => {
    (async () => {
      try {
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
    apiFetch<Providers>("/auth/providers")
      .then(setProviders)
      .catch(() => {});
  }, [refresh]);

  // Tie RevenueCat to the signed-in account and follow entitlement changes.
  const userId = user?.user_id;
  useEffect(() => {
    if (!userId) return;
    let unsubscribe = () => {};
    (async () => {
      await purchases.identify(userId);
      setDeviceEntitled(await purchases.hasActiveEntitlement());
      unsubscribe = purchases.onEntitlementChange(setDeviceEntitled);
    })();
    return () => unsubscribe();
  }, [userId]);

  const register = useCallback(
    async (email: string, password: string, display_name: string) => {
      await startSession(
        await apiFetch<SessionResponse>("/auth/register", { method: "POST", body: { email, password, display_name } })
      );
    },
    [startSession]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      await startSession(await apiFetch<SessionResponse>("/auth/login", { method: "POST", body: { email, password } }));
    },
    [startSession]
  );

  const signInWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return;
    await startSession(await apiFetch<SessionResponse>("/auth/google", { method: "POST", body: { id_token: idToken } }));
  }, [startSession]);

  const requestPasswordReset = useCallback(async (email: string) => {
    await apiFetch("/auth/password/forgot", { method: "POST", body: { email } });
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await startSession(
        await apiFetch<SessionResponse>("/auth/password/reset", {
          method: "POST",
          body: { email, code, new_password: newPassword },
        })
      );
    },
    [startSession]
  );

  const changePassword = useCallback(async (currentPassword: string | null, newPassword: string) => {
    const res = await apiFetch<{ user: User }>("/auth/password", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    });
    setUserState(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // The local session is cleared regardless.
    }
    await clearLocal();
  }, [clearLocal]);

  const logoutEverywhere = useCallback(async () => {
    await apiFetch("/auth/logout-all", { method: "POST" });
    await clearLocal();
  }, [clearLocal]);

  const refreshPremium = useCallback(async () => {
    setDeviceEntitled(await purchases.hasActiveEntitlement());
    try {
      setUserState(await purchases.syncWithServer<User>());
    } catch {
      // Server sync is best effort; the device entitlement already applies.
    }
  }, []);

  const setUser = useCallback((u: User) => setUserState(u), []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isPremium: !!user?.is_premium || deviceEntitled,
      providers: { ...providers, google: providers.google && nativeGoogleAvailable() },
      register,
      login,
      signInWithGoogle,
      requestPasswordReset,
      resetPassword,
      changePassword,
      logout,
      logoutEverywhere,
      setUser,
      refresh,
      refreshPremium,
    }),
    [
      user,
      loading,
      deviceEntitled,
      providers,
      register,
      login,
      signInWithGoogle,
      requestPasswordReset,
      resetPassword,
      changePassword,
      logout,
      logoutEverywhere,
      setUser,
      refresh,
      refreshPremium,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
