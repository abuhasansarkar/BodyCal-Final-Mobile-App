/**
 * BodyCal design tokens.
 *
 * Values are transcribed from `design/TOKENS.md`, which records only what was
 * observed in the supplied design references. Nothing here is invented: if a value
 * is missing from the design system it does not belong in this file.
 *
 * Screens should prefer the NativeWind semantic classes (`text-app-text`,
 * `border-app-border`, …) which resolve through `src/global.css`. Use these
 * constants only where a raw color is unavoidable — native navigator options,
 * `SymbolView` tint colors, and inline shadow strings.
 */

export const colors = {
  /** Screen background. */
  background: "#FFFFFF",
  /** Quiet fill for icon tiles, skeletons and grouped surfaces. */
  surface: "#F7F7F7",
  /** Slightly cooler grouped-surface fill used on result and paywall screens. */
  surfaceMuted: "#FAFAFA",
  /** Hairline borders and separators. */
  border: "#E8E8E8",
  /** Softer separator inside grouped cards. */
  borderSoft: "#EEEEEE",
  /** Primary text and primary CTA fill. */
  text: "#111111",
  /** Supporting and secondary text. */
  muted: "#737373",
  /** Tertiary text, disabled glyphs. */
  subtle: "#A3A3A3",
  /** Interactive accent for inline links and add actions. */
  accent: "#2F80ED",
  /** Destructive text, icons and validation errors. */
  danger: "#DC2626",
  /** Quiet destructive background. */
  dangerSurface: "#FFF1F1",
  white: "#FFFFFF",
} as const;

/** Macro identity colors. Fixed by the design system; do not substitute. */
export const macroColors = {
  protein: "#2F80ED",
  carbs: "#F97316",
  fat: "#8B5CF6",
  calories: "#FF6B00",
} as const;

/** Used only on the paywall free-trial timeline. */
export const paywallColors = {
  trialMilestone: "#FF8A00",
  reviewStar: "#E5A15E",
} as const;

export const radius = {
  control: 16,
  card: 20,
  surface: 24,
  hero: 28,
} as const;

export const spacing = {
  screenX: 20,
  sectionGap: 24,
} as const;

export const sizing = {
  /** Minimum interactive target, per the design system and platform guidance. */
  minTarget: 44,
  primaryCta: 56,
  tallCta: 60,
  listRow: 64,
} as const;

/**
 * Shadow presets as CSS `box-shadow` strings, matching what the screens already
 * pass to `style`. React Native 0.86 supports `boxShadow` on both platforms.
 */
export const shadows = {
  card: "0 6px 24px rgba(0, 0, 0, 0.045)",
  raised: "0 8px 28px rgba(0, 0, 0, 0.055)",
  subtle: "0 4px 18px rgba(0, 0, 0, 0.035)",
  floating: "0 5px 18px rgba(0, 0, 0, 0.08)",
} as const;

/**
 * BodyCal ships a single light appearance.
 *
 * `design/TOKENS.md` documents only light values, and AGENTS.md forbids inventing
 * product colors, so a dark palette cannot be derived here. The app therefore
 * pins `userInterfaceStyle: "light"` in `app.json` and renders a dark status bar,
 * rather than declaring `automatic` and painting white glyphs on a white ground.
 *
 * When dark-mode references are supplied, add the palette to `global.css` behind
 * `@media (prefers-color-scheme: dark)`, flip this flag, and restore the
 * appearance choices in Settings.
 */
export const SUPPORTS_DARK_APPEARANCE = false;
