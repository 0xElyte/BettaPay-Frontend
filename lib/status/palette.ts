// Single source of truth for status badge appearance.
//
// Every status surface — the public status page, the admin system-health card,
// payment status badges and the KYB review pane — maps its own vocabulary onto
// one of these six tones. The tones resolve to opaque `--status-*` CSS
// variables (see `app/globals.css`) whose contrast is asserted at WCAG AA in
// both themes by `__tests__/status-contrast.test.ts`.
//
// Alpha tints (`bg-emerald-500/10 text-emerald-700`) were the previous
// approach; they were replaced because the composited colour depends on
// whatever sits behind the badge, which makes the real contrast ratio
// unknowable and, in several variants, below 4.5:1.

export type StatusTone = "ok" | "warn" | "down" | "info" | "progress" | "neutral";

/** The tone names, in the order the audit table reports them. */
export const STATUS_TONES: StatusTone[] = [
  "ok",
  "warn",
  "down",
  "info",
  "progress",
  "neutral",
];

/**
 * Tailwind classes for a filled status badge (background + text + border).
 * Written as complete literal strings so Tailwind's scanner can see them.
 */
export const STATUS_TONE_BADGE: Record<StatusTone, string> = {
  ok: "bg-status-ok-bg text-status-ok border-status-ok-border",
  warn: "bg-status-warn-bg text-status-warn border-status-warn-border",
  down: "bg-status-down-bg text-status-down border-status-down-border",
  info: "bg-status-info-bg text-status-info border-status-info-border",
  progress: "bg-status-progress-bg text-status-progress border-status-progress-border",
  neutral: "bg-status-neutral-bg text-status-neutral border-status-neutral-border",
};

/** Text-only colour, for labels sitting directly on a card background. */
export const STATUS_TONE_TEXT: Record<StatusTone, string> = {
  ok: "text-status-ok",
  warn: "text-status-warn",
  down: "text-status-down",
  info: "text-status-info",
  progress: "text-status-progress",
  neutral: "text-status-neutral",
};

/** Solid dot / indicator colour. */
export const STATUS_TONE_DOT: Record<StatusTone, string> = {
  ok: "bg-status-ok",
  warn: "bg-status-warn",
  down: "bg-status-down",
  info: "bg-status-info",
  progress: "bg-status-progress",
  neutral: "bg-status-neutral",
};

/** CSS custom property names backing each tone, keyed by role. */
export const STATUS_TONE_VARS: Record<StatusTone, { fg: string; bg: string; border: string }> = {
  ok: { fg: "--status-ok-fg", bg: "--status-ok-bg", border: "--status-ok-border" },
  warn: { fg: "--status-warn-fg", bg: "--status-warn-bg", border: "--status-warn-border" },
  down: { fg: "--status-down-fg", bg: "--status-down-bg", border: "--status-down-border" },
  info: { fg: "--status-info-fg", bg: "--status-info-bg", border: "--status-info-border" },
  progress: {
    fg: "--status-progress-fg",
    bg: "--status-progress-bg",
    border: "--status-progress-border",
  },
  neutral: {
    fg: "--status-neutral-fg",
    bg: "--status-neutral-bg",
    border: "--status-neutral-border",
  },
};

/** The surface a text-only status label is drawn on, per theme. */
export const CARD_VAR = "--card";
