import Link from "next/link";
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
    <footer className="bg-base-100 border-t border-base-content/10 pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <span className="icon-[tabler--gavel] size-8 text-primary"></span>
              <span className="text-2xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t("common.appName")}
              </span>
            </Link>
            <p className="text-base-content/60 max-w-md mb-8">
              {t("footer.description")}
            </p>
            <div className="flex gap-3">
              <Link
                href="/register"
                className="btn btn-primary btn-sm rounded-full px-6"
              >
                {tAppNav("getStarted")}
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">
              {t("footer.resources")}
            </h4>
            <ul className="space-y-4 text-base-content/60">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-primary transition-colors"
                  >
                    {tNav(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/changelog"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.changelog")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">{t("footer.legal")}</h4>
            <ul className="space-y-4 text-base-content/60">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.termsOfService")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-base-content/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-base-content/60">
          <p>
            © {new Date().getFullYear()} {t("common.appName")}.{" "}
            {t("footer.allRightsReserved")}
          </p>
          <p className="flex items-center gap-2">
            <span className="icon-[tabler--heart-filled] size-4 text-error"></span>
            Hecho en Chile
          </p>
        </div>
      </div>
    </footer>
  );
}
