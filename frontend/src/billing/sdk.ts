// The RevenueCat SDKs, loaded only on phones. The web build gets sdk.web.ts
// instead, so it does not ship ~1 MB of purchase code it can never use.
/* eslint-disable @typescript-eslint/no-require-imports */
export function requirePurchases(): any {
  return require("react-native-purchases").default;
}

export function requirePurchasesUi(): any {
  return require("react-native-purchases-ui").default;
}
