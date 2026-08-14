/**
 * Small HSL <-> hex helpers for the custom colour picker.
 *
 * Hue/saturation/lightness rather than RGB because that is what a picker
 * actually manipulates: drag along hue, then adjust how vivid and how bright.
 */

export type Hsl = { h: number; s: number; l: number };

function pad(n: number): string {
  return n.toString(16).padStart(2, '0').toUpperCase();
}

/** h 0–360, s 0–1, l 0–1 → `#RRGGBB`. */
export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb: [number, number, number];
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const [r, g, b] = rgb.map((v) => Math.round((v + m) * 255));
  return `#${pad(r)}${pad(g)}${pad(b)}`;
}

/** `#RRGGBB` → h 0–360, s 0–1, l 0–1. */
export function hexToHsl(hex: string): Hsl {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = 60 * (((g - b) / delta) % 6);
  else if (max === g) h = 60 * ((b - r) / delta + 2);
  else h = 60 * ((r - g) / delta + 4);

  return { h: ((h % 360) + 360) % 360, s, l };
}

/** Evenly spaced hues, for painting the hue slider's gradient. */
export function hueTrackColors(steps = 13): string[] {
  return Array.from({ length: steps }, (_, i) =>
    hslToHex({ h: (i / (steps - 1)) * 360, s: 1, l: 0.5 })
  );
}

export function isValidHex(value: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeHex(value: string): string {
  const clean = value.trim().replace('#', '').toUpperCase();
  return `#${clean}`;
}
