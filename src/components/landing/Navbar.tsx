import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "next-intl";

const SECTION_LINKS = [
  { href: "#caracteristicas", key: "features" },
  { href: "#como-funciona", key: "howItWorks" },
  { href: "#casos", key: "useCases" },
  { href: "#modelo", key: "model" },
  { href: "#origen", key: "origin" },
  { href: "#faq", key: "faq" },
] as const;

interface SectionLink {
  href: string;
  key: string;
}

export function Navbar({
  links = SECTION_LINKS,
}: {
  links?: ReadonlyArray<SectionLink>;
}) {
  const t = useTranslations("landing.nav");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-ink-950/90 backdrop-blur-lg border-b border-cream-50/10 transition-all duration-300 ${
        scrolled ? "shadow-2xl shadow-ink-950/40 py-2.5" : "py-3.5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-xl sm:text-2xl font-bold text-cream-50 flex items-center gap-2 group shrink-0"
        >
          <div className="relative">
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:-rotate-6 duration-300" />
            <div className="absolute inset-0 bg-gold-500/30 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <span className="bg-linear-to-r from-cream-50 via-gold-300 to-gold-400 bg-clip-text text-transparent font-extrabold tracking-tight">
            {tCommon("appName")}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-5">
          <div className="flex items-center gap-5 text-sm font-medium text-cream-50/75">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-gold-400 transition-colors"
              >
                {t(link.key)}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2.5 pl-4 border-l border-cream-50/10">
            <LanguageSwitcher compact className="[&_label]:text-cream-50" />
            {mounted && (
              <button
                onClick={toggleTheme}
                className="btn btn-ghost btn-sm btn-circle text-cream-50 hover:bg-cream-50/10"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? (
                  <span className="icon-[tabler--sun] size-5"></span>
                ) : (
                  <span className="icon-[tabler--moon] size-5"></span>
                )}
              </button>
            )}
            <Link
              href="/login"
              className="btn btn-ghost btn-sm text-cream-50 hover:bg-cream-50/10"
            >
              {tNav("signIn")}
            </Link>
            <Link
              href="/register"
              className="btn btn-sm border-0 bg-gold-500 text-ink-950 hover:bg-gold-400 shadow-lg shadow-gold-500/25 transition-all hover:-translate-y-0.5 rounded-full px-5"
            >
              {tNav("getStarted")}
            </Link>
          </div>
        </div>

        {/* Mobile Button */}
        <div className="flex lg:hidden items-center gap-2">
          <LanguageSwitcher compact className="[&_label]:text-cream-50" />
          {mounted && (
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-sm btn-circle text-cream-50 hover:bg-cream-50/10"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <span className="icon-[tabler--sun] size-5"></span>
              ) : (
                <span className="icon-[tabler--moon] size-5"></span>
              )}
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-ghost btn-sm btn-circle text-gold-400 hover:bg-cream-50/10"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <span className="icon-[tabler--x] size-6"></span>
            ) : (
              <span className="icon-[tabler--menu-2] size-6"></span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-ink-950/95 backdrop-blur-lg border-b border-cream-50/10 shadow-2xl">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="btn btn-ghost justify-start text-cream-50 hover:bg-cream-50/10 hover:text-gold-300 rounded-xl"
              >
                {t(link.key)}
              </Link>
            ))}
            <div className="divider my-1 border-cream-50/10"></div>
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="btn btn-ghost justify-start text-cream-50 hover:bg-cream-50/10 hover:text-gold-300 rounded-xl"
            >
              {tNav("signIn")}
            </Link>
            <Link
              href="/register"
              onClick={closeMobileMenu}
              className="btn border-0 bg-gold-500 text-ink-950 hover:bg-gold-400 rounded-xl"
            >
              {tNav("getStarted")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
