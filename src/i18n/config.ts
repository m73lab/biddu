export const locales = ["es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const localeNames: Record<Locale, string> = {
  es: "Español",
};

export const localeFlags: Record<Locale, string> = {
  es: "🇨🇱",
};
