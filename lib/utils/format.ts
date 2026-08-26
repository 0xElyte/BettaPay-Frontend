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
export const toIntlLocale = (locale?: string): string =>
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

/**
 * Format a date timestamp in the active (or explicit) locale.
 */
export const formatDate = (
  dateString: string | Date | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const date = typeof dateString === 'object' ? dateString : new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  return new Intl.DateTimeFormat(toIntlLocale(locale), options ?? defaultOptions).format(date);
};

export interface FormatRelativeTimeOptions {
  now?: number | Date;
  locale?: string;
  style?: 'long' | 'short' | 'narrow';
  numeric?: 'always' | 'auto';
}

/**
 * Localize relative time (e.g. "2 hours ago", "il y a 2 heures", "há 2 horas")
 * using Intl.RelativeTimeFormat with the active or specified locale.
 */
export const formatRelativeTime = (
  dateInput: string | Date | number,
  optionsOrNow?: number | Date | FormatRelativeTimeOptions,
  explicitLocale?: string,
): string => {
  let opts: FormatRelativeTimeOptions = {};
  if (typeof optionsOrNow === 'number' || optionsOrNow instanceof Date) {
    opts = { now: optionsOrNow, locale: explicitLocale };
  } else if (optionsOrNow) {
    opts = optionsOrNow;
  }

  const date = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const nowMs = opts.now
    ? typeof opts.now === 'number'
      ? opts.now
      : opts.now.getTime()
    : Date.now();

  const diffMs = date.getTime() - nowMs;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const targetLocale = toIntlLocale(opts.locale ?? explicitLocale);
  const rtf = new Intl.RelativeTimeFormat(targetLocale, {
    numeric: opts.numeric ?? 'auto',
    style: opts.style ?? 'long',
  });

  if (Math.abs(diffSec) < 45) {
    return rtf.format(diffSec, 'second');
  }
  if (Math.abs(diffMin) < 45) {
    return rtf.format(diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 22) {
    return rtf.format(diffHour, 'hour');
  }
  if (Math.abs(diffDay) < 26) {
    return rtf.format(diffDay, 'day');
  }
  if (Math.abs(diffMonth) < 11) {
    return rtf.format(diffMonth, 'month');
  }
  return rtf.format(diffYear, 'year');
};

/** Format an arbitrary number in the active locale (or an explicit override). */
export const formatNumber = (
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
