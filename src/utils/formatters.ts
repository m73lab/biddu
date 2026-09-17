/**
 * Date and currency formatting utilities
 */

export function formatDate(
  dateStr: string | null,
  options?: Intl.DateTimeFormatOptions,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  if (!dateStr) return "Sin fecha de cierre";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    ...(options ?? {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    timeZone,
  });
}

export function formatShortDate(
  dateStr: string | null,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  if (!dateStr) return "Sin fecha de cierre";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
}

export function formatCurrency(
  amount: number,
  symbol: string,
  decimals = 0,
  currencyCode?: string | null,
): string {
  return `${symbol}${amount.toLocaleString(
    localeForCurrency(currencyCode),
    {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    },
  )}`;
}

export function formatCurrencyCompact(
  amount: number,
  symbol: string,
  currencyCode?: string | null,
): string {
  return `${symbol}${amount.toLocaleString(
    localeForCurrency(currencyCode),
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  )}`;
}

export function decimalsForCurrency(code?: string | null): number {
  const zeroDecimal = new Set(["CLP", "JPY", "KRW", "VND", "PYG"]);
  return code && zeroDecimal.has(code.toUpperCase()) ? 0 : 2;
}

/**
 * Display locale for a currency (Intl grouping/separators).
 * Money should look local to its currency, not to the viewer: MXN in
 * es-MX, BRL in pt-BR, CLP unchanged in es-CL. Unknown/custom codes keep
 * the historic es-CL grouping.
 */
const CURRENCY_LOCALES: Record<string, string> = {
  CLP: "es-CL",
  USD: "en-US",
  EUR: "es-ES",
  GBP: "en-GB",
  JPY: "ja-JP",
  CHF: "de-CH",
  CAD: "en-CA",
  AUD: "en-AU",
  NZD: "en-NZ",
  CNY: "zh-CN",
  HKD: "zh-HK",
  SGD: "en-SG",
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  KRW: "ko-KR",
  INR: "hi-IN",
  RUB: "ru-RU",
  BRL: "pt-BR",
  ZAR: "en-ZA",
  MXN: "es-MX",
  ARS: "es-AR",
  COP: "es-CO",
  PEN: "es-PE",
  PLN: "pl-PL",
  TRY: "tr-TR",
  THB: "th-TH",
  IDR: "id-ID",
  MYR: "ms-MY",
  PHP: "fil-PH",
  CZK: "cs-CZ",
  HUF: "hu-HU",
  ILS: "he-IL",
  TWD: "zh-TW",
  AED: "ar-AE",
  SAR: "ar-SA",
  RON: "ro-RO",
  BGN: "bg-BG",
  HRK: "hr-HR",
  UAH: "uk-UA",
  VND: "vi-VN",
  EGP: "ar-EG",
  PKR: "ur-PK",
  BDT: "bn-BD",
  NGN: "en-NG",
  KES: "sw-KE",
  UYU: "es-UY",
  PYG: "es-PY",
  BOB: "es-BO",
  DOP: "es-DO",
  CRC: "es-CR",
  GTQ: "es-GT",
  HNL: "es-HN",
  NIO: "es-NI",
  PAB: "es-PA",
  CUP: "es-CU",
};

export function localeForCurrency(code?: string | null): string {
  if (!code) return "es-CL";
  return CURRENCY_LOCALES[code.toUpperCase()] ?? "es-CL";
}

/** Default display zone (legacy Chile behavior). */
export const DEFAULT_TIME_ZONE = "America/Santiago";

/**
 * IANA zones offered for auctions (curated LATAM + UTC).
 * Identifiers are stable ASCII shown raw in the UI (no translations needed).
 */
export const AUCTION_TIMEZONES: string[] = [
  "America/Santiago",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Montevideo",
  "America/Asuncion",
  "America/La_Paz",
  "America/Santo_Domingo",
  "America/Costa_Rica",
  "America/Guatemala",
  "America/Tegucigalpa",
  "America/Managua",
  "America/Panama",
  "America/Havana",
  "UTC",
];

/**
 * Interpret a datetime-local wall value ("YYYY-MM-DDTHH:mm") as wall time
 * in `timeZone` and return the equivalent UTC Date. Measures the zone
 * offset with Intl (no date library needed).
 */
export function zonedTimeToUtc(dateTimeLocal: string, timeZone: string): Date {
  const [datePart, timePart = "00:00"] = dateTimeLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const asUtc = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second")),
  );
  return new Date(guess.getTime() + (guess.getTime() - asUtc));
}

/** Wall value (datetime-local) for an absolute Date in `timeZone`. */
export function toDateTimeLocalValueInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Step Granularity for numeric money inputs (HTML step attribute).
 * Zero-decimal currencies (CLP) only allow whole numbers.
 */
export function inputStepForCurrency(code?: string | null): string {
  return decimalsForCurrency(code) === 0 ? "1" : "0.01";
}

/**
 * Normalize an entered amount for currencies without minor units.
 * E.g. CLP 1500.5 becomes 1501. Pass-through otherwise.
 */
export function normalizeAmountForCurrency(
  amount: number,
  code?: string | null,
): number {
  if (!Number.isFinite(amount)) return amount;
  return decimalsForCurrency(code) === 0 ? Math.round(amount) : amount;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/** Format a Date as datetime-local input value (YYYY-MM-DDTHH:mm, local time). */
export function toDateTimeLocalValue(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
