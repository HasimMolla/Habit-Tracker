import { useMaterialColors, type MaterialColors } from '@expo/ui/jetpack-compose';

/**
 * Tally's colour system is the platform's own: Material You tokens derived from
 * the user's wallpaper on Android 12+, falling back to the Material 3 baseline
 * below that. Dark mode comes free because the palette follows the system
 * appearance. A habit's accent colour is the only value we ever hard-code.
 */
export type Theme = {
  colors: MaterialColors;
  /** True when the active palette is the dark one. */
  isDark: boolean;
  /**
   * Tints a habit's accent colour for use as a surface behind it.
   *
   * Alpha does not translate between schemes: 13% of an accent over a white
   * surface is a readable pastel, but over a near-black surface it is
   * effectively invisible. Dark mode therefore needs roughly double.
   */
  tint: (hex: string, level?: TintLevel) => string;
  spacing: (units: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; full: number };
};

export type TintLevel = 'soft' | 'medium';

const TINT_ALPHA: Record<TintLevel, { light: number; dark: number }> = {
  soft: { light: 0.14, dark: 0.26 },
  medium: { light: 0.18, dark: 0.34 },
};

const BASE_UNIT = 4;

export const radius = { sm: 8, md: 12, lg: 20, xl: 28, full: 999 } as const;

export function spacing(units: number): number {
  return units * BASE_UNIT;
}

export function useTheme(): Theme {
  const colors = useMaterialColors();

  // Derived from the palette itself rather than from `useColorScheme()`, so it
  // can never disagree with the colours actually being rendered.
  const isDark = luminance(colors.background) < 0.5;

  const tint = (hex: string, level: TintLevel = 'soft') =>
    withAlpha(hex, TINT_ALPHA[level][isDark ? 'dark' : 'light']);

  return { colors, isDark, tint, spacing, radius };
}

/**
 * The 10 accent colours offered when creating a habit.
 *
 * Saturated and bright on purpose: an accent has to hold its own as a filled
 * swatch, as a tinted well, and as a heat-graph cell, on both light and dark
 * surfaces. Muted tones disappear against a dark background.
 */
export const HABIT_COLORS = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#00C7BE',
  '#32ADE6',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
] as const;

/** WCAG relative luminance, 0 (black) to 1 (white). Accepts #RRGGBB or #RRGGBBAA. */
export function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Picks readable content for a filled accent swatch.
 *
 * The threshold sits at 0.35 rather than the midpoint: saturated yellows,
 * greens and teals measure far brighter than they look, and white on them is
 * close to unreadable. This puts dark content on the warm/green half of the
 * palette and white on the red/blue/purple half, which is both the higher
 * contrast ratio and the conventional look.
 */
export function contrastOn(hex: string): string {
  return luminance(hex) > 0.35 ? '#101014' : '#FFFFFF';
}

/** Applies an alpha channel to a `#RRGGBB` accent colour. */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const value = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex.slice(0, 7)}${value}`;
}
