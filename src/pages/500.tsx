import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SITE_NAME } from "@/components/common";

/**
 * Custom 500 page. Next.js forbids data fetching here, so there are no
 * translated messages available: text is inline per locale (via
 * router.locale) and NO useTranslations is called anywhere in this path
 * (see _app, which also skips the i18n provider tree without messages).
 */
const TEXT = {
  es: {
    title: "Algo salió mal",
    description:
      "Ocurrió un error inesperado en el servidor. Inténtalo de nuevo en unos momentos.",
    badge: "Error 500",
    heading: "Error",
    headingHighlight: "del servidor",
    backToHome: "Volver al inicio",
    tryAgain: "Reintentar",
  },
  "pt-BR": {
    title: "Algo deu errado",
    description:
      "Ocorreu um erro inesperado no servidor. Tente novamente em alguns instantes.",
    badge: "Erro 500",
    heading: "Erro",
    headingHighlight: "do servidor",
    backToHome: "Voltar ao início",
    tryAgain: "Tentar novamente",
  },
} as const;

export default function ServerErrorPage() {
  const { locale } = useRouter();
  const t = TEXT[locale === "pt-BR" ? "pt-BR" : "es"];

  return (
    <>
      <Head>
        <title>
          {t.title} | {SITE_NAME}
        </title>
        <meta name="description" content={t.description} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-base-100 text-base-content selection:bg-primary/20 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-error/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto relative">
                <div className="absolute inset-2 rounded-full border-4 border-error/30 "></div>
                <div className="absolute inset-4 rounded-full bg-linear-to-br from-error to-secondary flex items-center justify-center shadow-2xl shadow-error/30">
                  <span className="icon-[tabler--alert-triangle] size-12 text-error-content"></span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-base-200/50 border border-base-content/10 backdrop-blur-sm mb-8">
              <span className="text-sm font-medium text-base-content/80">
                {t.badge}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              {t.heading}{" "}
              <span className="bg-linear-to-r from-error via-secondary to-accent bg-clip-text text-transparent">
                {t.headingHighlight}
              </span>
            </h1>

            <p className="text-xl text-base-content/60 mb-12 leading-relaxed">
              {t.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary btn-lg h-14 px-8 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="icon-[tabler--refresh] size-6"></span>
                {t.tryAgain}
              </button>
              <Link
                href="/"
                className="btn btn-ghost btn-lg h-14 px-8 rounded-full border border-base-content/10 hover:bg-base-200 hover:border-base-content/20 transition-all duration-300"
              >
                <span className="icon-[tabler--home] size-6"></span>
                {t.backToHome}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
