"use client";

import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    { num: "01", key: "step1" },
    { num: "02", key: "step2" },
    { num: "03", key: "step3" },
    { num: "04", key: "step4" },
    { num: "05", key: "step5" },
  ];

  return (
    <section
      id="como-funciona"
      className="py-20 md:py-28 bg-white scroll-mt-24"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gold-600 mb-4">
            <span className="w-8 h-px bg-gold-500"></span>
            {t("sectionDescription")}
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-ink-950">
            {t("sectionTitle")}{" "}
            <span className="text-ink-800">{t("sectionTitleHighlight")}</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 mt-10 md:mt-14 items-start">
          {/* Timeline */}
          <div className="relative pl-0">
            <div
              className="absolute left-[22px] top-3 bottom-3 w-px bg-ink-950/10"
              aria-hidden="true"
            ></div>
            <div className="space-y-8">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-5">
                  <div className="shrink-0 w-11 h-11 rounded-full bg-ink-950 text-gold-400 flex items-center justify-center font-mono font-bold text-sm border border-gold-500/40 shadow-lg shadow-ink-950/10">
                    {step.num}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-bold text-ink-950 mb-1">
                      {t(`${step.key}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-950/60">
                      {t(`${step.key}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="hidden lg:block lg:sticky lg:top-24">
            <div className="relative">
              <div
                className="absolute inset-0 bg-linear-to-tr from-gold-500/20 to-live/10 rounded-3xl blur-2xl"
                aria-hidden="true"
              ></div>
              <div className="relative bg-ink-950 rounded-3xl p-6 border border-ink-800 shadow-2xl">
                <div className="space-y-4">
                  <div className="h-40 rounded-xl bg-ink-900 p-4 border border-ink-800">
                    <div className="w-1/3 h-3 bg-cream-50/15 rounded mb-4"></div>
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-cream-50/10 rounded-lg"></div>
                      <div className="flex-1 space-y-3">
                        <div className="w-full h-2.5 bg-cream-50/10 rounded"></div>
                        <div className="w-2/3 h-2.5 bg-cream-50/10 rounded"></div>
                        <div className="w-1/2 h-8 bg-gold-500/25 rounded mt-auto"></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-20 rounded-xl bg-ink-900 p-4 flex items-center justify-between border border-ink-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold-500/25"></div>
                      <div className="w-32 h-2.5 bg-cream-50/15 rounded"></div>
                    </div>
                    <div className="w-20 h-8 bg-gold-500 rounded-lg text-ink-950 flex items-center justify-center text-xs font-bold">
                      {t("newBid")}
                    </div>
                  </div>
                  <div className="h-20 rounded-xl bg-ink-900 p-4 flex items-center justify-between border border-ink-800 opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cream-50/15"></div>
                      <div className="w-32 h-2.5 bg-cream-50/10 rounded"></div>
                    </div>
                    <div className="w-20 h-8 bg-cream-50/10 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}