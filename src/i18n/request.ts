import { getRequestConfig } from "next-intl/server";
import { Locale, locales, defaultLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: {
      ...(await import(`../../messages/${locale}/common.json`)).default,
      ...(await import(`../../messages/${locale}/auth.json`)).default,
      ...(await import(`../../messages/${locale}/landing.json`)).default,
      ...(await import(`../../messages/${locale}/auction.json`)).default,
      ...(await import(`../../messages/${locale}/item.json`)).default,
      ...(await import(`../../messages/${locale}/dashboard.json`)).default,
      ...(await import(`../../messages/${locale}/settings.json`)).default,
      ...(await import(`../../messages/${locale}/errors.json`)).default,
      ...(await import(`../../messages/${locale}/legal.json`)).default,
      ...(await import(`../../messages/${locale}/listings.json`)).default,
      ...(await import(`../../messages/${locale}/bulkEdit.json`)).default,
      ...(await import(`../../messages/${locale}/csvImport.json`)).default,
      ...(await import(`../../messages/${locale}/discussions.json`)).default,
      ...(await import(`../../messages/${locale}/tour.json`)).default,
      ...(await import(`../../messages/${locale}/profile.json`)).default,
      ...(await import(`../../messages/${locale}/maintenance.json`)).default,
      ...(await import(`../../messages/${locale}/setup.json`)).default,
    },
  };
});
