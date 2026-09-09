"use client";

import { useTranslations } from "next-intl";

const useCases = [
  {
    key: "charity",
    icon: "icon-[tabler--heart-handshake]",
  },
  {
    key: "declutter",
    icon: "icon-[tabler--home-move]",
  },
  {
    key: "family",
    icon: "icon-[tabler--users-group]",
  },
  {
    key: "office",
    icon: "icon-[tabler--building]",
  },
];

export function UseCases() {
  const t = useTranslations("landing.useCases");

  return (
    <section
      id="casos"
      className="py-20 md:py-28 bg-ink-950 text-cream-50 relative overflow-hidden scroll-mt-24"
    >
      <div
        className="absolute top-0 -right-24 w-96 h-96 bg-gold-500/10 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      ></div>

      <div className="container relative mx-auto px-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gold-400 mb-4">
            <span className="w-8 h-px bg-gold-500"></span>
            {t("sectionDescription")}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            {t("sectionTitle")}{" "}
            <span className="bg-linear-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
              {t("sectionTitleHighlight")}
            </span>
          </h2>
        </div>

        <div className="flex lg:grid lg:grid-cols-4 gap-4 mt-10 md:mt-14 overflow-x-auto snap-x snap-mandatory lg:overflow-visible pb-4 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
          {useCases.map((useCase) => (
            <div
              key={useCase.key}
              className="shrink-0 w-[80%] sm:w-[45%] lg:w-auto snap-start rounded-2xl border border-cream-50/10 bg-ink-900 p-6 hover:border-gold-500/40 hover:bg-ink-800 hover:-translate-y-1 transition-all duration-300 lg:min-w-0"
            >
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/25 flex items-center justify-center mb-5">
                <span className={`${useCase.icon} size-7 text-gold-400`} />
              </div>
              <h3 className="text-lg font-bold mb-2">
                {t(`${useCase.key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-cream-50/60">
                {t(`${useCase.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}