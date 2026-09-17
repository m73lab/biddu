export const locales = ["es", "pt-BR"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const localeNames: Record<Locale, string> = {
  es: "Español",
  "pt-BR": "Português",
};

export const localeFlags: Record<Locale, string> = {
  es: "🇨🇱",
  "pt-BR": "🇧🇷",
};
