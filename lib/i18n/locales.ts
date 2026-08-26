/**
 * Locale constants and helpers.
 *
 * This module is intentionally free of side effects (it does not import or
 * initialise i18next), so it can be consumed by pure utilities such as
 * `lib/utils/format.ts`, the dev-only coverage panel, and Node scripts without
 * bootstrapping the whole i18n runtime.
 */

export const supportedLocales = ["en", "fr", "pt", "sw"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

/** localStorage key used to persist the user's chosen language. */
export const localeStorageKey = "bettapay-language";

/**
 * Map each supported app locale to a BCP-47 tag for `Intl` number/date
 * formatting. `en` maps to `en-US` so existing formatting output is unchanged.
 */
export const intlLocales: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-BR",
  sw: "sw-KE",
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

/**
 * Resolve an arbitrary language tag (e.g. `fr-FR`, `pt`, `de`) to a supported
 * app locale, falling back to {@link defaultLocale} when unsupported.
 */
export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const base = value.toLowerCase().split("-")[0];
  return isSupportedLocale(base) ? base : defaultLocale;
}
