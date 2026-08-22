"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { defaultLocale } from "@/lib/i18n/locales";

type Dict = Record<string, unknown>;

/** Flatten a nested translation object into dot-notation key → string value. */
function flattenEntries(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    if (typeof value === "string") out[prefix] = value;
    return out;
  }
  for (const [key, child] of Object.entries(value as Dict)) {
    flattenEntries(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

/**
 * Dev-only translation coverage panel.
 *
 * A floating toggle that reveals every key missing from the active locale
 * (compared to the reference `en` dictionary) alongside its English fallback,
 * so translation drift is visible during development. Renders nothing in a
 * production build.
 */
export function TranslationCoveragePanel() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeLng = i18n.resolvedLanguage || i18n.language || defaultLocale;

  const missing = useMemo(() => {
    const enBundle = (i18n.getResourceBundle?.(defaultLocale, "translation") ?? {}) as Dict;
    const activeBundle = (i18n.getResourceBundle?.(activeLng, "translation") ?? {}) as Dict;
    const enEntries = flattenEntries(enBundle);
    const activeEntries = flattenEntries(activeBundle);

    return Object.keys(enEntries)
      .filter((key) => {
        const value = activeEntries[key];
        return typeof value !== "string" || value.trim() === "";
      })
      .map((key) => ({ key, fallback: enEntries[key] }));
  }, [i18n, activeLng]);

  // Never ship the panel to end users.
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      data-testid="i18n-coverage-panel"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 print:hidden"
    >
      {open && (
        <section
          aria-label="Translation coverage"
          className="max-h-80 w-80 overflow-auto rounded-lg border border-border bg-background/95 p-3 text-xs shadow-lg backdrop-blur"
        >
          <header className="mb-2 flex items-center justify-between">
            <span className="font-semibold">
              i18n coverage — {activeLng.toUpperCase()}
            </span>
            <span
              data-testid="i18n-missing-count"
              className={missing.length === 0 ? "text-green-600" : "text-amber-600"}
            >
              {missing.length} missing
            </span>
          </header>

          {missing.length === 0 ? (
            <p className="text-muted-foreground">All keys translated for this locale.</p>
          ) : (
            <ul className="space-y-1">
              {missing.map(({ key, fallback }) => (
                <li key={key} data-testid="i18n-missing-key" className="border-b border-border/50 pb-1">
                  <code className="text-[11px] font-medium">{key}</code>
                  <div className="text-muted-foreground">{fallback}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="i18n-coverage-panel"
        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
      >
        i18n{" "}
        <span className={missing.length === 0 ? "text-green-600" : "text-amber-600"}>
          {missing.length}
        </span>
      </button>
    </div>
  );
}
