"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { preload } from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/fetcher";

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const currentPath = router.pathname;
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Prevent body scroll when the confirm sheet is open
  useEffect(() => {
    if (signOutOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [signOutOpen]);

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
    <>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100/95 backdrop-blur-lg border-t border-base-content/10 safe-area-bottom">
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

        <button
          onClick={() => setSignOutOpen(true)}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-base-content/60 hover:text-error"
          aria-label={t("signOut")}
        >
          <span className="icon-[tabler--logout] size-6" />
          <span className="text-xs font-medium">{t("signOut")}</span>
        </button>
      </div>
    </nav>

    {signOutOpen && (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setSignOutOpen(false)}
        />
        <div className="md:hidden fixed inset-x-0 bottom-0 z-[60] animate-in slide-in-from-bottom duration-300">
          <div className="bg-base-100 rounded-t-3xl shadow-2xl">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-base-content/20 rounded-full" />
            </div>
            <div className="px-6 py-4 flex flex-col items-center text-center gap-2">
              <span className="icon-[tabler--logout] size-10 text-error" />
              <h2 className="text-lg font-bold">{t("signOut")}</h2>
              <p className="text-sm text-base-content/60">{t("signOutConfirm")}</p>
            </div>
            <div className="px-4 pb-6 pt-2 grid grid-cols-2 gap-3">
              <button
                onClick={() => setSignOutOpen(false)}
                className="btn btn-ghost"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn btn-error"
              >
                {t("signOut")}
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  );
}
