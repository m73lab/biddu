import Link from "next/link";
import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("landing.hero");

  const stats = t.raw("stats") as Array<{ value: string; label: string }>;

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-28 pb-16 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            {t("title")} <br />
            <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-base-content/60 max-w-3xl mx-auto mb-12 leading-relaxed">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="btn btn-primary btn-lg h-14 px-8 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
            >
              <span className="icon-[tabler--rocket] size-6"></span>
              {t("startAuction")}
            </Link>
            <Link
              href="#como-funciona"
              className="btn btn-ghost btn-lg h-14 px-8 rounded-full border border-base-content/10 hover:bg-base-200 hover:border-base-content/20 transition-all duration-300"
            >
              <span className="icon-[tabler--player-play] size-6"></span>
              {t("secondaryCta")}
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-14 flex flex-col sm:flex-row gap-4 justify-center items-stretch max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex-1 rounded-2xl bg-base-100/60 border border-base-content/5 backdrop-blur-sm px-6 py-5 shadow-sm"
              >
                <div className="text-3xl font-extrabold text-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-base-content/60 font-medium mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Live preview mock */}
          <div className="mt-12 p-4 rounded-2xl bg-base-200/30 border border-base-content/5 backdrop-blur-sm max-w-4xl mx-auto shadow-2xl">
            <div className="rounded-xl overflow-hidden relative bg-base-100 border border-base-content/5 p-6 text-left">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-base-content/50 font-bold">
                    {t("previewBidders")}
                  </div>
                  <div className="text-2xl font-extrabold">
                    {t("previewTitle")}
                  </div>
                </div>
                <span className="badge badge-success gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-content opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success-content"></span>
                  </span>
                  EN VIVO
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-base-200/50 rounded-xl p-5">
                <div>
                  <div className="text-sm text-base-content/60">
                    {t("previewBid")}
                  </div>
                  <div className="text-4xl font-mono font-extrabold text-primary">
                    $125.000
                  </div>
                </div>
                <div className="btn btn-primary rounded-full px-8">
                  <span className="icon-[tabler--gavel] size-5"></span>
                  {t("previewButton")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
