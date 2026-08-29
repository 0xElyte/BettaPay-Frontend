/**
 * Cross-tree signal to open the global command palette (issue #459).
 *
 * The palette itself is mounted once per authenticated layout; anything else
 * (a topbar button, a keyboard shortcut in another component) opens it by
 * dispatching this event rather than lifting open-state up the tree.
 */
export const COMMAND_PALETTE_OPEN_EVENT = "bettapay:command-palette:open";

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}
