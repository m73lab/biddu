import Head from "next/head";
import Link from "next/link";
import { GetStaticProps } from "next";
import { useTranslations } from "next-intl";
import { SITE_NAME } from "@/components/common";
import { getMessages, Locale } from "@/i18n";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <>
      <Head>
        <title>{t("meta.title", { siteName: SITE_NAME })}</title>
        <meta name="description" content={t("meta.description")} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-base-100 text-base-content selection:bg-primary/20 flex items-center justify-center relative overflow-hidden">
        {/* Background Elements - matching site style */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-2xl mx-auto">
            {/* Icon */}
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto relative">
                <div className="absolute inset-2 rounded-full border-4 border-secondary/30 "></div>
                <div className="absolute inset-4 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30">
                  <span className="icon-[tabler--map-question] size-12 text-primary-content"></span>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-base-200/50 border border-base-content/10 backdrop-blur-sm mb-8">
              <span className="text-sm font-medium text-base-content/80">
                {t("badge")}
              </span>
            </div>

            {/* Main Content */}
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              {t("title")}{" "}
              <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
            </h1>

            <p className="text-xl text-base-content/60 mb-12 leading-relaxed">
              {t("description")}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/"
                className="btn btn-primary btn-lg h-14 px-8 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="icon-[tabler--home] size-6"></span>
                {t("backToHome")}
              </Link>
              <Link
                href="/login"
                className="btn btn-ghost btn-lg h-14 px-8 rounded-full border border-base-content/10 hover:bg-base-200 hover:border-base-content/20 transition-all duration-300"
              >
                <span className="icon-[tabler--login] size-6"></span>
                {t("goToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  // Without messages, NextIntlClientProvider in _app has nothing to work
  // with and every useTranslations in the tree throws MISSING_MESSAGE
  // (this page previously did not exist, so the default Next.js 404
  // rendered messageless through our _app on every unknown URL).
  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      messages,
    },
  };
};
