import { useTranslations } from "next-intl";

export function FaqSection() {
  const t = useTranslations("landing.faq");

  const items = t.raw("items") as Array<{ q: string; a: string }>;

  return (
    <section id="faq" className="py-32 bg-base-100">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="badge badge-accent badge-outline font-bold tracking-widest uppercase mb-4">
            {t("eyebrow")}
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-base-content/60">{t("subtitle")}</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="collapse collapse-plus bg-base-200/40 border border-base-content/5 rounded-2xl"
            >
              <input type="radio" name="landing-faq" defaultChecked={i === 0} />
              <div className="collapse-title text-lg font-bold">{item.q}</div>
              <div className="collapse-content text-base-content/70 leading-relaxed">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
