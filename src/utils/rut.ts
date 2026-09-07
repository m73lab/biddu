/**
 * Validador de RUT chileno
 * Algoritmo: Módulo 11
 */

export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function isValidRut(rut: string): boolean {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDV: string;

  if (remainder === 11) expectedDV = "0";
  else if (remainder === 10) expectedDV = "K";
  else expectedDV = remainder.toString();

  return dv === expectedDV;
}

export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return rut;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}-${dv}`;
}

export function formatRutOnInput(value: string): string {
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return cleaned;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}-${dv}`;
}
