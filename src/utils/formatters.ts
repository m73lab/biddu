/**
 * Date and currency formatting utilities
 */

export function formatDate(
  dateStr: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!dateStr) return "Sin fecha de cierre";
  return new Date(dateStr).toLocaleDateString(
    "es-CL",
    options ?? {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Santiago",
    },
  );
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha de cierre";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Santiago",
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
): string {
  return `${symbol}${amount.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatCurrencyCompact(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function decimalsForCurrency(code?: string | null): number {
  const zeroDecimal = new Set(["CLP", "JPY", "KRW", "VND"]);
  return code && zeroDecimal.has(code.toUpperCase()) ? 0 : 2;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
