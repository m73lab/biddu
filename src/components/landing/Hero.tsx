import Link from "next/link";
import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("landing.hero");

  const stats = t.raw("stats") as Array<{ value: string; label: string }>;

  return (
    <section className="relative overflow-hidden bg-ink-950 text-cream-50 pt-24 pb-16 md:pt-32 md:pb-24 scroll-mt-24">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.04]"></div>
        <div className="absolute -top-24 -left-16 w-80 h-80 bg-gold-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 -right-16 w-96 h-96 bg-live/15 rounded-full blur-[130px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-px bg-cream-50/5"></div>
      </div>

      <div className="container relative mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 items-center">
          {/* Copy */}
          <div className="text-left animate-fade-in-up">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gold-400 mb-5">
              <span className="w-8 h-px bg-gold-500"></span>
              {t("previewBidders")}
            </p>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]">
              {t("title")}{" "}
              <br className="hidden sm:block" />
              <span className="bg-linear-to-r from-gold-300 via-gold-400 to-gold-600 bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-cream-50/70 max-w-xl mt-6 leading-relaxed">
              {t("description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 sm:items-center">
              <Link
                href="/register"
                className="btn border-0 h-13 px-7 rounded-full bg-gold-500 text-ink-950 hover:bg-gold-400 shadow-xl shadow-gold-500/25 hover:-translate-y-0.5 transition-all duration-300 min-h-12"
              >
                <span className="icon-[tabler--rocket] size-5"></span>
                {t("startAuction")}
              </Link>
              <Link
                href="#como-funciona"
                className="btn btn-ghost h-13 px-7 rounded-full border border-cream-50/20 text-cream-50 hover:bg-cream-50/10 hover:border-cream-50/40 transition-all duration-300 min-h-12"
              >
                <span className="icon-[tabler--player-play] size-5"></span>
                {t("secondaryCta")}
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-10">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="px-4 py-3 rounded-2xl bg-ink-900/70 border border-cream-50/10 backdrop-blur-sm"
                >
                  <div className="text-2xl font-extrabold text-gold-400">
                    {stat.value}
                  </div>
                  <div className="text-xs text-cream-50/60 font-medium mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live mock card */}
          <div className="relative animate-fade-in-up">
            <div
              className="absolute inset-0 bg-linear-to-tr from-gold-500/20 to-live/10 rounded-[2.5rem] blur-2xl"
              aria-hidden="true"
            ></div>

            <div className="relative rounded-[2.5rem] border border-cream-50/10 bg-ink-900/80 backdrop-blur p-5 sm:p-7 shadow-2xl">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-widest text-cream-50/50 font-bold">
                    {t("previewBidders")}
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold truncate">
                    {t("previewTitle")}
                  </div>
                </div>
                <span className="badge gap-1.5 bg-live/15 text-live border border-live/30 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-live"></span>
                  </span>
                  EN VIVO
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-4 bg-ink-950/60 rounded-2xl border border-cream-50/10 p-5">
                <div>
                  <div className="text-xs text-cream-50/60">
                    {t("previewBid")}
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-extrabold text-gold-400 mt-1">
                    $125.000
                  </div>
                </div>
                <div className="btn border-0 bg-gold-500 text-ink-950 hover:bg-gold-400 rounded-full px-7 min-h-11 sm:ml-auto">
                  <span className="icon-[tabler--gavel] size-5"></span>
                  {t("previewButton")}
                </div>
              </div>
            </div>

            {/* Floating chips */}
            <div className="absolute -top-5 -right-2 sm:-right-5 animate-float-y">
              <div className="flex items-center gap-2 rounded-full bg-ink-800 border border-gold-500/40 text-gold-300 px-3.5 py-2 text-xs font-semibold shadow-xl">
                <span className="icon-[tabler--bolt] size-4"></span>
                {t("previewBid")}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-2 sm:-left-5 animate-float-y-delayed">
              <div className="flex items-center gap-2 rounded-full bg-gold-500 text-ink-950 px-3.5 py-2 text-xs font-bold shadow-xl">
                <span className="icon-[tabler--gavel] size-4"></span>
                {t("previewButton")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}