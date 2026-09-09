"use client";

import { useTranslations } from "next-intl";

const featureKeys = [
  {
    key: "realTimeBidding",
    icon: "icon-[tabler--bolt]",
  },
  {
    key: "privateSecure",
    icon: "icon-[tabler--shield-lock]",
  },
  {
    key: "multiCurrency",
    icon: "icon-[tabler--world-dollar]",
  },
  {
    key: "smartNotifications",
    icon: "icon-[tabler--bell-ringing]",
  },
  {
    key: "richMedia",
    icon: "icon-[tabler--photo-star]",
  },
  {
    key: "offlineExchange",
    icon: "icon-[tabler--transfer]",
  },
];

export function FeatureGrid() {
  const t = useTranslations("landing.features");

  return (
    <section
      id="caracteristicas"
      className="py-20 md:py-28 bg-base-100 relative overflow-hidden scroll-mt-24 border-t border-base-content/5"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gold-600 mb-4">
            <span className="w-8 h-px bg-gold-500"></span>
            {t("sectionDescription")}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-base-content">
            {t("sectionTitle")}{" "}
            <span className="text-gold-600">{t("sectionTitleHighlight")}</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-10 md:mt-14">
          {featureKeys.map((feature, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl border border-base-content/10 bg-base-200 p-6 sm:p-7 hover:border-gold-500/50 hover:shadow-xl hover:shadow-gold-500/10 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute top-5 right-6 font-mono text-3xl font-extrabold text-gold-500/20 group-hover:text-gold-500/50 transition-colors duration-300">
                0{idx + 1}
              </div>

              <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <span
                  className={`${feature.icon} size-6 text-gold-600`}
                ></span>
              </div>

              <h3 className="text-lg font-bold text-base-content mb-2">
                {t(`${feature.key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-base-content/60">
                {t(`${feature.key}.description`)}
              </p>

              <span className="absolute bottom-6 right-6 icon-[tabler--arrow-up-right] size-5 text-gold-500 opacity-0 group-hover:opacity-100 -rotate-45 group-hover:rotate-0 transition-all duration-300"></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}