import {
  defaultLocale,
  intlLocales,
  resolveLocale,
  type Locale,
} from '@/lib/i18n/locales';

/**
 * Resolve the currently active app locale.
 *
 * Reads `document.documentElement.lang`, which `I18nProvider` and
 * `LanguageSelector` keep in sync with the selected language. Falls back to the
 * default locale on the server or when the value is missing/unsupported.
 */
export const getActiveLocale = (): Locale => {
  if (typeof document === 'undefined') return defaultLocale;
  return resolveLocale(document.documentElement.lang);
};

/** Map an optional app locale (or the active one) to a BCP-47 tag for `Intl`. */
const toIntlLocale = (locale?: string): string =>
  intlLocales[locale ? resolveLocale(locale) : getActiveLocale()];

export const formatCurrency = (amount: number, currency: string = 'USDC', locale?: string) => {
  const base = locale ? resolveLocale(locale) : getActiveLocale();

  if (currency === 'NGN') {
    // `en` keeps the `en-NG` tag so the ₦ symbol renders; other locales format
    // the amount using their own grouping/decimal conventions.
    const ngnLocale = base === 'en' ? 'en-NG' : intlLocales[base];
    return new Intl.NumberFormat(ngnLocale, {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // USDC is a token, not an ISO currency, so format the number in the active
  // locale and prefix the ticker. The sign stays ahead of the ticker to match
  // established output (e.g. "-USDC 50.00").
  const sign = amount < 0 ? '-' : '';
  const value = new Intl.NumberFormat(intlLocales[base], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${sign}USDC ${value}`;
};

export const truncateAddress = (address: string) => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const formatDate = (dateString: string | Date, locale?: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

/** Format an arbitrary number in the active locale (or an explicit override). */
export const formatNumber = (
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
