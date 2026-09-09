import Link from "next/link";
import { useTranslations } from "next-intl";

export function CallToAction() {
  const t = useTranslations("landing.cta");

  return (
    <section
      id="contacto"
      className="relative py-20 md:py-28 bg-base-100 overflow-hidden scroll-mt-24 border-t border-base-content/5"
    >
      <div className="container mx-auto px-4">
        {/* Main CTA */}
        <div className="relative rounded-[2rem] overflow-hidden bg-ink-950 text-cream-50 px-6 sm:px-12 py-16 md:py-20 text-center mb-20">
          <div
            className="absolute inset-0 bg-linear-to-br from-gold-500/15 via-gold-400/5 to-live/10 pointer-events-none"
            aria-hidden="true"
          ></div>
          <div
            className="absolute -top-24 -right-16 w-80 h-80 bg-gold-500/15 rounded-full blur-[110px] pointer-events-none"
            aria-hidden="true"
          ></div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <span className="w-12 h-12 rounded-full bg-gold-500 text-base-content flex items-center justify-center shadow-lg shadow-gold-500/30">
                <span className="icon-[tabler--gavel] size-6"></span>
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {t("title")}
            </h2>
            <p className="text-base sm:text-lg text-cream-50/70 max-w-2xl mx-auto mb-8">
              {t("description")}
            </p>

            <div className="flex flex-col items-center gap-2">
              <Link
                href="/register"
                className="btn border-0 h-14 px-8 rounded-full bg-gold-500 text-base-content hover:bg-gold-400 shadow-xl shadow-gold-500/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                {t("getStarted")}{" "}
                <span className="icon-[tabler--rocket] size-5"></span>
              </Link>
              <p className="text-sm text-cream-50/80">{t("freeForever")}</p>
            </div>
          </div>
        </div>

        {/* Self-Host */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="icon-[tabler--server] size-10 text-gold-600 block mb-4 mx-auto"></span>
          <h3 className="text-2xl md:text-3xl font-bold text-base-content mb-4">
            {t("selfHostTitle")}
          </h3>
          <p className="text-base-content/60 mb-8">{t("selfHostDescription")}</p>

          {/* Terminal mockup */}
          <div className="mockup-code bg-ink-950 text-cream-50 text-left border border-ink-800 shadow-xl">
            <pre data-prefix="$" className="flex items-center justify-between">
              <code className="flex-1 overflow-x-auto text-sm">
                git clone https://github.com/m73lab/biddu.git
              </code>
            </pre>
            <pre data-prefix="$" className="flex items-center justify-between">
              <code className="flex-1 overflow-x-auto text-sm">
                docker compose up -d --build
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}