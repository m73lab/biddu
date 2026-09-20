"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { preload } from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/fetcher";

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const router = useRouter();
  const currentPath = router.pathname;

  // Warm route + API cache on hover/touch so taps feel instant.
  // Data stays fresh via SWR revalidation; this only removes the cold flash.
  const prefetchNav = (href: string, api?: string) => {
    router.prefetch(href);
    if (api) preload(api, fetcher);
  };
  const touchProps = (href: string, api?: string) => ({
    onMouseEnter: () => prefetchNav(href, api),
    onTouchStart: () => prefetchNav(href, api),
  });

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return (
        currentPath === "/dashboard" ||
        (currentPath.startsWith("/auctions") &&
          currentPath !== "/auctions/mine")
      );
    }
    if (path === "/auctions/mine") {
      return currentPath === "/auctions/mine";
    }
    if (path === "/listings") {
      return currentPath === "/listings";
    }
    if (path === "/history") {
      return currentPath === "/history";
    }
    if (path === "/profile") {
      return currentPath === "/profile";
    }
    return false;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-content/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-20 px-2">
        <Link
          href="/dashboard"
          {...touchProps("/dashboard", "/api/user/dashboard")}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
            isActive("/dashboard")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <span
            className={`icon-[tabler--layout-dashboard] size-6 ${
              isActive("/dashboard") ? "text-primary" : ""
            }`}
          />
          <span className="text-xs font-medium">{t("dashboard")}</span>
        </Link>

        <Link
          href="/listings"
          {...touchProps("/listings", "/api/user/listings")}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
            isActive("/listings")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <span
            className={`icon-[tabler--tag] size-6 ${
              isActive("/listings") ? "text-primary" : ""
            }`}
          />
          <span className="text-xs font-medium">{t("myListings")}</span>
        </Link>

        <Link
          href="/history"
          {...touchProps("/history", "/api/user/history")}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
            isActive("/history")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <span
            className={`icon-[tabler--gavel] size-6 ${
              isActive("/history") ? "text-primary" : ""
            }`}
          />
          <span className="text-xs font-medium">{t("myBids")}</span>
        </Link>

        <Link
          href="/auctions/mine"
          {...touchProps("/auctions/mine")}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive("/auctions/mine") ? "text-primary" : "text-base-content/60 hover:text-base-content"}`}
        >
          <span
            className={`icon-[tabler--crown] size-6 ${isActive("/auctions/mine") ? "text-primary" : ""}`}
          />
          <span className="text-xs font-medium">{t("myAuctions")}</span>
        </Link>

        <Link
          href="/profile"
          {...touchProps("/profile", "/api/user/profile")}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
            isActive("/profile")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <span
            className={`icon-[tabler--user] size-6 ${
              isActive("/profile") ? "text-primary" : ""
            }`}
          />
          <span className="text-xs font-medium">{t("profile")}</span>
        </Link>
      </div>
    </nav>
  );
}
