import { useTranslations } from "next-intl";

export function FaqSection() {
  const t = useTranslations("landing.faq");

  const items = t.raw("items") as Array<{ q: string; a: string }>;

  return (
    <section id="faq" className="py-20 md:py-28 bg-base-100 scroll-mt-24 border-t border-base-content/5">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16">
          <div className="lg:sticky lg:top-24 self-start">
            <span className="badge badge-ghost border border-gold-500/40 text-gold-600 font-bold tracking-widest uppercase mb-4">
              {t("eyebrow")}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-base-content mb-4">
              {t("title")}
            </h2>
            <p className="text-base sm:text-lg text-base-content/60">
              {t("subtitle")}
            </p>
          </div>

          <div className="space-y-3">
            {items.map((item, i) => (
              <div
                key={i}
                className="collapse collapse-plus bg-base-200 border border-base-content/10 rounded-xl shadow-sm"
              >
                <input type="radio" name="landing-faq" defaultChecked={i === 0} />
                <div className="collapse-title text-base sm:text-lg font-bold text-base-content pr-10">
                  {item.q}
                </div>
                <div className="collapse-content text-sm sm:text-base text-base-content/70 leading-relaxed">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}