// Native Google sign-in. Enabled only when a web client ID is configured
// (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) and the server accepts Google tokens.
// The ID token is sent to /auth/google, which verifies it with Google.

import { Platform } from "react-native";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

let mod: any = null;
let configured = false;

function load(): any {
  if (mod || Platform.OS === "web" || !WEB_CLIENT_ID) return mod;
  try {
    mod = require("@react-native-google-signin/google-signin");
  } catch {
    mod = null;
  }
  return mod;
}

export function nativeGoogleAvailable(): boolean {
  return !!load();
}

/** Returns a Google ID token, or null if the person closed the sheet. */
export async function getGoogleIdToken(): Promise<string | null> {
  const m = load();
  if (!m) throw new Error("Google sign-in is not available on this device.");
  const { GoogleSignin, isSuccessResponse, statusCodes } = m;
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    return res.data?.idToken ?? null;
  } catch (e: any) {
    if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === statusCodes?.IN_PROGRESS) return null;
    throw e;
  }
}

export async function googleSignOut(): Promise<void> {
  const m = load();
  if (!m || !configured) return;
  try {
    await m.GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device.
  }
}
