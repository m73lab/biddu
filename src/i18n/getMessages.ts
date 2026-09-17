import { Locale } from "./config";

// Locale JSONs are static assets: cache per locale in production so every
// SSR doesn't re-import 18 files. Dev stays uncached for hot editing.
const messagesCache = new Map<Locale, Record<string, unknown>>();

export async function getMessages(locale: Locale) {
  if (process.env.NODE_ENV === "production") {
    const cached = messagesCache.get(locale);
    if (cached) return cached;
  }
  const messages = {
    ...(await import(`../../messages/${locale}/common.json`)).default,
    ...(await import(`../../messages/${locale}/auth.json`)).default,
    ...(await import(`../../messages/${locale}/landing.json`)).default,
    ...(await import(`../../messages/${locale}/auction.json`)).default,
    ...(await import(`../../messages/${locale}/item.json`)).default,
    ...(await import(`../../messages/${locale}/dashboard.json`)).default,
    ...(await import(`../../messages/${locale}/settings.json`)).default,
    ...(await import(`../../messages/${locale}/errors.json`)).default,
    ...(await import(`../../messages/${locale}/legal.json`)).default,
    ...(await import(`../../messages/${locale}/maintenance.json`)).default,
    ...(await import(`../../messages/${locale}/listings.json`)).default,
    ...(await import(`../../messages/${locale}/bulkEdit.json`)).default,
    ...(await import(`../../messages/${locale}/csvImport.json`)).default,
    ...(await import(`../../messages/${locale}/discussions.json`)).default,
    ...(await import(`../../messages/${locale}/tour.json`)).default,
    ...(await import(`../../messages/${locale}/profile.json`)).default,
    ...(await import(`../../messages/${locale}/setup.json`)).default,
    ...(await import(`../../messages/${locale}/notFound.json`)).default,
  };
  if (process.env.NODE_ENV === "production") {
    messagesCache.set(locale, messages);
  }
  return messages;
}

export function getStaticPropsWithMessages(locale: string) {
  return async () => {
    const messages = await getMessages(locale as Locale);
    return {
      props: {
        messages,
      },
    };
  };
}
