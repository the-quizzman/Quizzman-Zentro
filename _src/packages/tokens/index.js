// src/index.ts
var colors = {
  // Brand
  primary: "#4f46e5",
  primaryLight: "#818cf8",
  primaryDark: "#3730a3",
  primaryGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  // Status
  success: "#22c55e",
  successLight: "#86efac",
  successDark: "#15803d",
  warning: "#f59e0b",
  warningLight: "#fcd34d",
  warningDark: "#b45309",
  danger: "#ef4444",
  dangerLight: "#fca5a5",
  dangerDark: "#b91c1c",
  info: "#3b82f6",
  infoLight: "#93c5fd",
  infoDark: "#1d4ed8",
  // Neutral
  white: "#ffffff",
  black: "#000000",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  gray950: "#030712",
  // Semantic (light mode)
  bgPrimary: "#ffffff",
  bgSecondary: "#f9fafb",
  bgTertiary: "#f3f4f6",
  textPrimary: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderFocus: "#4f46e5"
};
var darkColors = {
  bgPrimary: "#111827",
  bgSecondary: "#1f2937",
  bgTertiary: "#374151",
  textPrimary: "#f9fafb",
  textSecondary: "#d1d5db",
  textMuted: "#6b7280",
  border: "#374151",
  borderFocus: "#818cf8"
};
var spacing = {
  "0": "0",
  "0.5": "0.125rem",
  // 2px
  "1": "0.25rem",
  // 4px
  "1.5": "0.375rem",
  // 6px
  "2": "0.5rem",
  // 8px
  "2.5": "0.625rem",
  // 10px
  "3": "0.75rem",
  // 12px
  "4": "1rem",
  // 16px
  "5": "1.25rem",
  // 20px
  "6": "1.5rem",
  // 24px
  "8": "2rem",
  // 32px
  "10": "2.5rem",
  // 40px
  "12": "3rem",
  // 48px
  "16": "4rem",
  // 64px
  "20": "5rem",
  // 80px
  "24": "6rem"
  // 96px
};
var radius = {
  none: "0",
  sm: "0.25rem",
  // 4px
  md: "0.375rem",
  // 6px
  lg: "0.5rem",
  // 8px
  xl: "0.75rem",
  // 12px
  "2xl": "1rem",
  // 16px
  "3xl": "1.5rem",
  // 24px
  full: "9999px"
};
var shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)"
};
var zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  header: 300,
  overlay: 400,
  modal: 500,
  popover: 600,
  toast: 700,
  tooltip: 800,
  loading: 900,
  max: 9999
};
var fontFamily = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, 'Liberation Mono', monospace"
};
var fontSize = {
  xs: "0.75rem",
  // 12px
  sm: "0.875rem",
  // 14px
  base: "1rem",
  // 16px
  lg: "1.125rem",
  // 18px
  xl: "1.25rem",
  // 20px
  "2xl": "1.5rem",
  // 24px
  "3xl": "1.875rem",
  // 30px
  "4xl": "2.25rem"
  // 36px
};
var fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700"
};
var lineHeight = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2"
};
var transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  normal: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "500ms cubic-bezier(0.34, 1.56, 0.64, 1)"
};
var breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
};
var layout = {
  headerHeight: "56px",
  sidebarWidth: "260px",
  sidebarCollapsedWidth: "64px",
  maxContentWidth: "1200px",
  maxPageWidth: "1600px"
};

export { breakpoints, colors, darkColors, fontFamily, fontSize, fontWeight, layout, lineHeight, radius, shadows, spacing, transitions, zIndex };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map