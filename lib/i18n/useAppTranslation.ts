"use client";

import { useTranslation } from "react-i18next";

import en from "./en.json";

/**
 * Walk a dot-separated key path into a nested object and return the string
 * value at that path, or the key itself as a controlled fallback if the path
 * does not resolve to a string.
 */
function englishFallback(key: string): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, en);
  return typeof value === "string" ? value : key;
}

/**
 * Application-level translation hook.
 *
 * The namespace is pinned to "translation" so that `t()` always resolves
 * against the correct dictionary regardless of how many namespaces are
 * registered — preventing the lazy-resolution bug where an unpinned
 * `useTranslation()` falls back to a different namespace prefix and returns
 * the raw key string instead of the translated text.
 *
 * When i18next has not yet finished initialising (e.g. during SSR hydration),
 * `englishFallback` is used so the UI always renders real text rather than
 * raw key strings.
 */
export function useAppTranslation() {
  // Pin the namespace explicitly — never rely on i18next's internal defaultNS
  // being set at call time, which can be undefined before init() resolves.
  const translation = useTranslation("translation");
  return {
    ...translation,
    t: translation.i18n.isInitialized ? translation.t : englishFallback,
  };
}
