import { readFileSync } from "node:fs";
import { join } from "node:path";

import { WCAG_AA_NORMAL, contrastRatio } from "@/lib/a11y/contrast";
import { CARD_VAR, STATUS_TONES, STATUS_TONE_VARS } from "@/lib/status/palette";

/**
 * Contrast audit for the status palette.
 *
 * Reads the real declarations out of `app/globals.css` rather than a copy, so
 * the check cannot go stale: change a `--status-*` value to something that
 * fails AA and this suite fails in CI.
 */

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

type Theme = "light" | "dark";

/**
 * Pull the custom properties out of a theme's block. The light theme lives in
 * the `:root` selector and the dark theme in `.dark`; both are inside
 * `@layer base`, so we slice from the selector to its closing brace.
 */
function readThemeVars(theme: Theme): Record<string, string> {
  const selector = theme === "light" ? ":root" : ".dark";
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);

  const open = css.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end).toBeGreaterThan(open);

  const block = css.slice(open + 1, end);
  const vars: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[match[1]] = match[2];
  }
  return vars;
}

const themes: Record<Theme, Record<string, string>> = {
  light: readThemeVars("light"),
  dark: readThemeVars("dark"),
};

describe.each<Theme>(["light", "dark"])("status palette contrast (%s theme)", (theme) => {
  const vars = themes[theme];

  it("defines every status custom property", () => {
    for (const tone of STATUS_TONES) {
      const { fg, bg, border } = STATUS_TONE_VARS[tone];
      expect(vars[fg]).toBeDefined();
      expect(vars[bg]).toBeDefined();
      expect(vars[border]).toBeDefined();
    }
    expect(vars[CARD_VAR]).toBeDefined();
  });

  it.each(STATUS_TONES)("%s badge text meets WCAG AA on its own tint", (tone) => {
    const { fg, bg } = STATUS_TONE_VARS[tone];
    expect(contrastRatio(vars[fg], vars[bg])).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it.each(STATUS_TONES)("%s text-only label meets WCAG AA on the card surface", (tone) => {
    // SystemHealthCard renders its status label directly on the card, with no
    // tinted pill behind it, so that pairing needs checking too.
    const ratio = contrastRatio(vars[STATUS_TONE_VARS[tone].fg], vars[CARD_VAR]);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it.each(STATUS_TONES)("%s badge border is distinct from its fill and text", (tone) => {
    // Not a WCAG assertion: these badges are static text, not controls, and
    // they already carry an icon plus a written label, so the border is
    // decorative. This is a drift guard — it catches a border token that has
    // been pointed at the same value as the fill or the text.
    const { fg, bg, border } = STATUS_TONE_VARS[tone];
    expect(vars[border]).not.toBe(vars[bg]);
    expect(vars[border]).not.toBe(vars[fg]);
  });
});

describe("status palette audit table", () => {
  it("reports every ratio (printed for the PR description)", () => {
    const rows = STATUS_TONES.flatMap((tone) =>
      (["light", "dark"] as Theme[]).map((theme) => {
        const vars = themes[theme];
        const { fg, bg } = STATUS_TONE_VARS[tone];
        return {
          tone,
          theme,
          fg: vars[fg],
          bg: vars[bg],
          onTint: Number(contrastRatio(vars[fg], vars[bg]).toFixed(2)),
          onCard: Number(contrastRatio(vars[fg], vars[CARD_VAR]).toFixed(2)),
        };
      }),
    );

    // eslint-disable-next-line no-console
    console.table(rows);

    for (const row of rows) {
      expect(row.onTint).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      expect(row.onCard).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
  });
});
