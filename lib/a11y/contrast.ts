// WCAG 2.1 relative-luminance and contrast-ratio maths.
//
// Used by the status palette audit (`__tests__/status-contrast.test.ts`) so the
// badge colours shipped in `app/globals.css` are checked on every CI run rather
// than eyeballed once.

/** WCAG AA minimum for normal-sized body text. */
export const WCAG_AA_NORMAL = 4.5;

/** WCAG AA minimum for large text (>=18.66px bold or >=24px) and UI borders. */
export const WCAG_AA_LARGE = 3;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `#rgb` or `#rrggbb` into 0-255 channels. Throws on anything else. */
export function hexToRgb(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: "${hex}"`);
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Contrast ratio between two opaque colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsAA(a: string, b: string, threshold: number = WCAG_AA_NORMAL): boolean {
  return contrastRatio(a, b) >= threshold;
}
