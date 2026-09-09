import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "next-intl";

const PRODUCT_LINKS = [
  { href: "#caracteristicas", key: "features" },
  { href: "#como-funciona", key: "howItWorks" },
  { href: "#casos", key: "useCases" },
  { href: "#faq", key: "faq" },
] as const;

export function Footer() {
  const t = useTranslations();
  const tNav = useTranslations("landing.nav");
  const tAppNav = useTranslations("nav");

  return (
    <footer className="bg-ink-950 text-cream-50 pt-14 pb-8 border-t border-cream-50/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-5">
              <span className="icon-[tabler--gavel] size-8 text-gold-400"></span>
              <span className="text-2xl font-bold bg-linear-to-r from-cream-50 via-gold-300 to-gold-400 bg-clip-text text-transparent">
                {t("common.appName")}
              </span>
            </Link>
            <p className="text-cream-50/60 max-w-md mb-6 leading-relaxed">
              {t("footer.description")}
            </p>
            <Link
              href="/register"
              className="btn border-0 bg-gold-500 text-ink-950 hover:bg-gold-400 rounded-full px-6 shadow-lg shadow-gold-500/25"
            >
              {tAppNav("getStarted")}
            </Link>
          </div>

          <div>
            <h4 className="font-bold mb-5 text-gold-400">
              {t("footer.resources")}
            </h4>
            <ul className="space-y-3.5 text-sm text-cream-50/70">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-gold-300 transition-colors"
                  >
                    {tNav(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/changelog"
                  className="hover:text-gold-300 transition-colors"
                >
                  {t("footer.changelog")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-5 text-gold-400">
              {t("footer.legal")}
            </h4>
            <ul className="space-y-3.5 text-sm text-cream-50/70">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-gold-300 transition-colors"
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-gold-300 transition-colors"
                >
                  {t("footer.termsOfService")}
                </Link>
              </li>
            </ul>
            <div className="mt-5">
              <div className="dropdown dropdown-top">
                <LanguageSwitcher className="[&_label]:text-cream-50" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-cream-50/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-cream-50/60">
          <p>
            © {new Date().getFullYear()} {t("common.appName")}.{" "}
            {t("footer.allRightsReserved")}
          </p>
          <p className="flex items-center gap-2">
            <span className="icon-[tabler--heart] size-4 text-live"></span>
            Hecho en Chile
          </p>
        </div>
      </div>
    </footer>
  );
}