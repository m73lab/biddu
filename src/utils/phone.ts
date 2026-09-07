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
export function toWaNumber(phone: string): string {
  const digits = cleanPhone(phone).replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) return "56" + digits;
  return digits;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${toWaNumber(phone)}?text=${encodeURIComponent(text)}`;
}
