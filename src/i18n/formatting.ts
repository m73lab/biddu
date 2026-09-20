import { useLocale } from "next-intl";
import { localeForCurrency } from "@/utils/formatters";

/**
 * Memoized Intl constructors. Safari is notoriously slow at creating
 * Intl.DateTimeFormat/NumberFormat, and these run on every render (SWR +
 * realtime re-renders). Combos are static per call site, so the cache stays
 * tiny; key includes every option that affects output.
 */
const formatterCache = new Map<
  string,
  Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat
>();

function cachedDateTimeFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `dt:${locale}:${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key) as Intl.DateTimeFormat | undefined;
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function cachedNumberFormat(
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `nf:${locale}:${JSON.stringify(options ?? null)}`;
  let formatter = formatterCache.get(key) as Intl.NumberFormat | undefined;
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function cachedRelativeTimeFormat(
  locale: string,
  options: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  const key = `rt:${locale}:${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key) as
    | Intl.RelativeTimeFormat
    | undefined;
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function useFormatters(timeZone?: string) {
  const locale = useLocale();
  const zone = timeZone ?? "America/Santiago";

  const formatDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return cachedDateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      ...options,
      timeZone: zone,
    }).format(dateObj);
  };

  const formatShortDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return cachedDateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: zone,
    }).format(dateObj);
  };

  const formatLongDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return cachedDateTimeFormat(locale, {
      dateStyle: "full",
      timeZone: zone,
    }).format(dateObj);
  };

  const formatRelativeTime = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor(
      (dateObj.getTime() - now.getTime()) / 1000,
    );

    const rtf = cachedRelativeTimeFormat(locale, { numeric: "auto" });

    const intervals: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] =
      [
        { unit: "year", seconds: 31536000 },
        { unit: "month", seconds: 2592000 },
        { unit: "week", seconds: 604800 },
        { unit: "day", seconds: 86400 },
        { unit: "hour", seconds: 3600 },
        { unit: "minute", seconds: 60 },
        { unit: "second", seconds: 1 },
      ];

    for (const interval of intervals) {
      const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
      if (count >= 1) {
        return rtf.format(diffInSeconds > 0 ? count : -count, interval.unit);
      }
    }

    return rtf.format(0, "second");
  };

  const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
    return cachedNumberFormat(locale, options).format(num);
  };

  const formatCurrency = (amount: number, currency: string = "CLP") => {
    return cachedNumberFormat(localeForCurrency(currency) ?? locale, {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatCompactNumber = (num: number) => {
    return cachedNumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
    }).format(num);
  };

  const formatPercent = (num: number, decimals: number = 0) => {
    return cachedNumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  return {
    formatDate,
    formatShortDate,
    formatLongDate,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatCompactNumber,
    formatPercent,
  };
}

// Server-side formatting functions that accept locale as parameter
export function formatDateServer(
  date: Date | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return cachedDateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(dateObj);
}

export function formatCurrencyServer(
  amount: number,
  locale: string,
  currency: string = "CLP",
) {
  return cachedNumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatNumberServer(
  num: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
) {
  return cachedNumberFormat(locale, options).format(num);
}
