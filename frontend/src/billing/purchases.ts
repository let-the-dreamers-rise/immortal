// RevenueCat wrapper for the Inner Chamber membership.
//
// Everything here degrades to a no-op when RevenueCat cannot run (web preview,
// Expo Go, or no API key configured), so the rest of the app never has to
// check. The server is the source of truth for premium gates; after any
// purchase or restore we ask it to re-read RevenueCat (/billing/sync).

import { Platform } from "react-native";

import { apiFetch } from "@/src/api/client";

export const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "pro";

const API_KEY =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ""
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";

export type PlanPackage = {
  identifier: string;
  packageType: string;
  title: string;
  priceString: string;
  description: string;
  period: string | null;
  raw: unknown;
};

let sdk: any = null;
let ui: any = null;
let configured = false;

function loadSdk(): any {
  if (sdk || Platform.OS === "web" || !API_KEY) return sdk;
  try {
    sdk = require("react-native-purchases").default;
  } catch {
    sdk = null;
  }
  return sdk;
}

function loadUi(): any {
  if (ui || Platform.OS === "web" || !API_KEY) return ui;
  try {
    ui = require("react-native-purchases-ui").default;
  } catch {
    ui = null;
  }
  return ui;
}

export function purchasesAvailable(): boolean {
  return !!loadSdk();
}

/** Configure once, then identify the signed-in user so purchases follow the account. */
export async function identify(userId: string): Promise<void> {
  const P = loadSdk();
  if (!P) return;
  try {
    if (!configured) {
      P.configure({ apiKey: API_KEY, appUserID: userId });
      configured = true;
    } else {
      await P.logIn(userId);
    }
  } catch (e) {
    console.warn("RevenueCat identify failed", e);
  }
}

export async function forget(): Promise<void> {
  const P = loadSdk();
  if (!P || !configured) return;
  try {
    await P.logOut();
  } catch {
    // Already anonymous.
  }
}

function periodLabel(packageType: string): string | null {
  switch (packageType) {
    case "ANNUAL":
      return "per year";
    case "MONTHLY":
      return "per month";
    case "WEEKLY":
      return "per week";
    case "LIFETIME":
      return "once, for life";
    default:
      return null;
  }
}

export async function loadPlans(): Promise<PlanPackage[]> {
  const P = loadSdk();
  if (!P || !configured) return [];
  const offerings = await P.getOfferings();
  const pkgs: any[] = offerings?.current?.availablePackages ?? [];
  return pkgs.map((p) => ({
    identifier: p.identifier,
    packageType: p.packageType,
    title: p.product?.title ?? p.identifier,
    priceString: p.product?.priceString ?? "",
    description: p.product?.description ?? "",
    period: periodLabel(p.packageType),
    raw: p,
  }));
}

function hasEntitlement(customerInfo: any): boolean {
  return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
}

/** Whether the RevenueCat SDK itself sees an active entitlement on this device. */
export async function hasActiveEntitlement(): Promise<boolean> {
  const P = loadSdk();
  if (!P || !configured) return false;
  try {
    return hasEntitlement(await P.getCustomerInfo());
  } catch {
    return false;
  }
}

/** Subscribe to entitlement changes (renewals, expiry, restores). */
export function onEntitlementChange(cb: (active: boolean) => void): () => void {
  const P = loadSdk();
  if (!P || !configured) return () => {};
  const listener = (info: any) => cb(hasEntitlement(info));
  P.addCustomerInfoUpdateListener(listener);
  return () => P.removeCustomerInfoUpdateListener(listener);
}

export type PurchaseOutcome = "purchased" | "cancelled" | "not_entitled";

export async function buy(plan: PlanPackage): Promise<PurchaseOutcome> {
  const P = loadSdk();
  if (!P) throw new Error("Purchases are not available on this device.");
  try {
    const { customerInfo } = await P.purchasePackage(plan.raw);
    return hasEntitlement(customerInfo) ? "purchased" : "not_entitled";
  } catch (e: any) {
    if (e?.userCancelled) return "cancelled";
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  const P = loadSdk();
  if (!P) throw new Error("Purchases are not available on this device.");
  const info = await P.restorePurchases();
  return hasEntitlement(info);
}

/** RevenueCat's own paywall, if one is configured in the dashboard. */
export async function presentHostedPaywall(): Promise<boolean> {
  const U = loadUi();
  if (!U || !configured) return false;
  const result = await U.presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
  return result === "PURCHASED" || result === "RESTORED";
}

export async function openCustomerCenter(): Promise<boolean> {
  const U = loadUi();
  if (!U || !configured) return false;
  await U.presentCustomerCenter();
  return true;
}

/** Ask the server to re-read RevenueCat; returns the refreshed user. */
export async function syncWithServer<T = any>(): Promise<T> {
  const res = await apiFetch<{ user: T }>("/billing/sync", { method: "POST" });
  return res.user;
}
