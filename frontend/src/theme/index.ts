// Design tokens for Essence Path — Dao Longevity.
// Calm ink-wash / journal aesthetic: muted earth tones, generous whitespace.

export const colors = {
  surface: "#F7F5F0",
  onSurface: "#1A1918",
  surfaceSecondary: "#EFEBE0",
  onSurfaceSecondary: "#3D3B38",
  surfaceTertiary: "#E4DFD0",
  onSurfaceTertiary: "#2E2D2A",
  surfaceInverse: "#1A1918",
  onSurfaceInverse: "#F7F5F0",
  brand: "#5E6C58",
  brandPrimary: "#5E6C58",
  onBrandPrimary: "#F7F5F0",
  brandSecondary: "#8C7A6B",
  onBrandSecondary: "#F7F5F0",
  brandTertiary: "#D9D4C7",
  onBrandTertiary: "#1A1918",
  success: "#6E7A65",
  onSuccess: "#FFFFFF",
  warning: "#B59969",
  onWarning: "#FFFFFF",
  error: "#9E6759",
  onError: "#FFFFFF",
  info: "#6A7B82",
  onInfo: "#FFFFFF",
  border: "#DCD7CC",
  borderStrong: "#B8B1A4",
  divider: "#E6E2D8",
  muted: "#7A756B",
};

export const fonts = {
  display: "CormorantGaramond-SemiBold",
  displayBold: "CormorantGaramond-Bold",
  displayRegular: "CormorantGaramond-Regular",
  body: "DMSans-Regular",
  bodyMedium: "DMSans-Medium",
  bodySemi: "DMSans-SemiBold",
  bodyBold: "DMSans-Bold",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const fontMap = {
  "CormorantGaramond-Regular": require("../../assets/fonts/CormorantGaramond-Regular.ttf"),
  "CormorantGaramond-SemiBold": require("../../assets/fonts/CormorantGaramond-SemiBold.ttf"),
  "CormorantGaramond-Bold": require("../../assets/fonts/CormorantGaramond-Bold.ttf"),
  "DMSans-Regular": require("../../assets/fonts/DMSans-Regular.ttf"),
  "DMSans-Medium": require("../../assets/fonts/DMSans-Medium.ttf"),
  "DMSans-SemiBold": require("../../assets/fonts/DMSans-SemiBold.ttf"),
  "DMSans-Bold": require("../../assets/fonts/DMSans-Bold.ttf"),
};

export const IMAGES = {
  pathHero:
    "https://images.unsplash.com/photo-1768232553319-00e3d669b1f6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwxfHxiYW1ib28lMjBmb3Jlc3QlMjBwYXRoJTIwY2FsbSUyMG1pc3QlMjBuYXR1cmV8ZW58MHx8fHwxNzg4MzcyNjg0fDA&ixlib=rb-4.1.0&q=85",
  onboardingBg:
    "https://images.unsplash.com/photo-1695041712957-45634f4fa759?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxibGFuayUyMGFuY2llbnQlMjBwYXBlciUyMHNjcm9sbCUyMHRleHR1cmUlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc4ODM3MjY4NHww&ixlib=rb-4.1.0&q=85",
  profileHero:
    "https://images.pexels.com/photos/35298174/pexels-photo-35298174.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
};
