#!/usr/bin/env node
/**
 * Locale parity check.
 *
 * Fails (exit code 1) when any locale dictionary under `lib/i18n/` has a key set
 * that diverges from the reference locale (`en.json`) — either missing keys or
 * extra keys. This keeps every translation file structurally identical so the
 * UI never falls back to a raw key at runtime.
 *
 * Run locally with `npm run i18n:check`; it also runs in CI (.github/workflows/i18n.yml).
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REFERENCE_LOCALE = "en";
const localesDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "lib", "i18n");

/** Recursively collect dot-notation key paths from a nested object. */
function flattenKeys(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(...flattenKeys(child, path));
  }
  return keys;
}

function loadDictionary(locale) {
  return JSON.parse(readFileSync(join(localesDir, `${locale}.json`), "utf8"));
}

const localeFiles = readdirSync(localesDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.slice(0, -".json".length))
  .sort();

if (!localeFiles.includes(REFERENCE_LOCALE)) {
  console.error(`✖ Reference locale "${REFERENCE_LOCALE}.json" not found in ${localesDir}`);
  process.exit(1);
}

const referenceKeys = new Set(flattenKeys(loadDictionary(REFERENCE_LOCALE)));
const otherLocales = localeFiles.filter((locale) => locale !== REFERENCE_LOCALE);

let hasDivergence = false;

for (const locale of otherLocales) {
  const localeKeys = new Set(flattenKeys(loadDictionary(locale)));

  const missing = [...referenceKeys].filter((key) => !localeKeys.has(key)).sort();
  const extra = [...localeKeys].filter((key) => !referenceKeys.has(key)).sort();

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✔ ${locale}: ${localeKeys.size} keys — in sync with ${REFERENCE_LOCALE}`);
    continue;
  }

  hasDivergence = true;
  console.error(`✖ ${locale}: diverges from ${REFERENCE_LOCALE}`);
  for (const key of missing) console.error(`    missing: ${key}`);
  for (const key of extra) console.error(`    extra:   ${key}`);
}

if (hasDivergence) {
  console.error(
    `\nLocale parity check failed. Every locale must share the exact key set as ${REFERENCE_LOCALE}.json.`,
  );
  process.exit(1);
}

console.log(`\nAll ${otherLocales.length} locale(s) match ${REFERENCE_LOCALE}.json.`);
