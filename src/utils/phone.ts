/**
 * Validador de teléfono / WhatsApp
 * Acepta formatos internacionales (+56 9 1234 5678) y locales.
 */

export function cleanPhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return (hasPlus ? "+" : "") + digits;
}

export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!/^\+?[0-9\s.\-()]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Número en formato wa.me (solo dígitos, con código país).
 * Auto-completa +56 para celulares chilenos de 9 dígitos.
 */
/**
 * Country calling codes by auction IANA time zone (curated LATAM + UTC).
 * Used to complete local WhatsApp numbers; full international numbers
 * (starting with +) are never modified.
 */
const TZ_CALLING_CODE: Record<string, string> = {
  "America/Santiago": "56",
  "America/Mexico_City": "52",
  "America/Bogota": "57",
  "America/Lima": "51",
  "America/Argentina/Buenos_Aires": "54",
  "America/Sao_Paulo": "55",
  "America/Montevideo": "598",
  "America/Asuncion": "595",
  "America/La_Paz": "591",
  "America/Santo_Domingo": "1",
  "America/Costa_Rica": "506",
  "America/Guatemala": "502",
  "America/Tegucigalpa": "504",
  "America/Managua": "505",
  "America/Panama": "507",
  "America/Havana": "53",
};

export function callingCodeForTimeZone(
  timeZone?: string | null,
): string | null {
  if (!timeZone) return null;
  return TZ_CALLING_CODE[timeZone] ?? null;
}

export function toWaNumber(
  phone: string,
  countryCode?: string | null,
): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/\D/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (countryCode) {
    const cc = countryCode.replace(/\D/g, "");
    if (cc && !digits.startsWith(cc)) return cc + digits;
    return digits;
  }
  // Legacy fallback: Chilean 9-digit mobiles without country code.
  if (digits.length === 9 && digits.startsWith("9")) return "56" + digits;
  return digits;
}

export function waLink(
  phone: string,
  text: string,
  countryCode?: string | null,
): string {
  return `https://wa.me/${toWaNumber(phone, countryCode)}?text=${encodeURIComponent(text)}`;
}
