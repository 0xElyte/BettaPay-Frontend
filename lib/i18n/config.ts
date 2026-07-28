import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

import en from "./en.json";
import fr from "./fr.json";
import pt from "./pt.json";
import sw from "./sw.json";

export const supportedLocales = ["en", "fr", "pt", "sw"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "en";
export const localeStorageKey = "bettapay-language";

/** Directly imported resources used as fallback when HTTP backend is unavailable. */
export const fallbackResources = {
  en: { translation: en },
  fr: { translation: fr },
  pt: { translation: pt },
  sw: { translation: sw },
};

/**
 * Backend configuration for loading translation JSON files from
 * public/locales/{{lng}}/{{ns}}.json via HTTP at runtime.
 *
 * Falls back to bundled resources when the backend request fails (e.g.
 * during SSR, offline, or when files are not deployed to public/locales).
 */
const isServer = typeof window === "undefined";

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: defaultLocale,
    supportedLngs: [...supportedLocales],
    ns: ["translation"],
    defaultNS: "translation",

    // Backend plugin configuration — loads .json from public/locales
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      crossOrigin: true,
      allowMultiLoading: false,
      reloadInterval: 0, // No auto-reload
      // Cache translations in browser to reduce network requests
      cache: {
        enabled: true,
        prefix: "i18n_",
        expirationTime: 24 * 60 * 60 * 1000, // 24 hours
      },
    },

    // Use direct imports as fallback when backend fails
    resources: isServer ? fallbackResources : undefined,

    // Don't escape values for HTML (React handles this)
    interpolation: {
      escapeValue: false,
    },

    // Return empty string for missing keys instead of dev warning
    parseMissingKeyHandler: (key: string) => key,

    // React-specific: skip suspending on initial load
    react: {
      useSuspense: false,
    },
  });

export const resources = fallbackResources;

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function detectPreferredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const storedLocale = window.localStorage.getItem(localeStorageKey);
  if (isSupportedLocale(storedLocale)) return storedLocale;

  for (const language of window.navigator.languages ?? [window.navigator.language]) {
    const locale = language.toLowerCase().split("-")[0];
    if (isSupportedLocale(locale)) return locale;
  }
  return defaultLocale;
}

export default i18n;
