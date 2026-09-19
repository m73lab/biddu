const NAMED_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/**
 * Convierte una descripción en HTML (rich text) a una vista previa de
 * texto plano de una sola línea.
 *
 * Es seguro para uso en servidor (no usa DOM ni React): elimina bloques
 * script/style, reemplaza los límites de bloque por espacios, quita el
 * resto de etiquetas y decodifica las entidades HTML más comunes.
 */
export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return "";

  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr|td)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(Number(dec)),
    );

  let result = text;
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    result = result.split(entity).join(char);
  }

  return result.replace(/\s+/g, " ").trim();
}
