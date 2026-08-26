import en from "@/lib/i18n/en.json";
import fr from "@/lib/i18n/fr.json";
import pt from "@/lib/i18n/pt.json";
import sw from "@/lib/i18n/sw.json";

type Dict = Record<string, unknown>;

/** Recursively collect dot-notation key paths from a nested object. */
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Dict).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const referenceKeys = flattenKeys(en).sort();
const locales: Record<string, unknown> = { fr, pt, sw };

describe("locale parity", () => {
  it.each(Object.keys(locales))(
    "%s shares the exact key set as en.json",
    (locale) => {
      const localeKeys = flattenKeys(locales[locale]).sort();

      const missing = referenceKeys.filter((key) => !localeKeys.includes(key));
      const extra = localeKeys.filter((key) => !referenceKeys.includes(key));

      expect({ locale, missing, extra }).toEqual({ locale, missing: [], extra: [] });
    },
  );
});
