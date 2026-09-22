"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";

interface ShareButtonsProps {
  /** Absolute URL to share. Defaults to the current page URL. */
  url?: string;
  title: string;
  /** Prefilled message (without the URL; it's appended automatically). */
  text: string;
  className?: string;
  compact?: boolean;
  /** Optional data-tour anchor for guided tours. */
  dataTour?: string;
}

interface NetworkDef {
  key: string;
  label: string;
  icon: string;
  href: (fullText: string, pageUrl: string) => string;
}

const NETWORKS: NetworkDef[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "icon-[tabler--brand-whatsapp]",
    href: (fullText) => `https://wa.me/?text=${encodeURIComponent(fullText)}`,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: "icon-[tabler--brand-telegram]",
    href: (fullText, pageUrl) =>
      `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(fullText)}`,
  },
  {
    key: "x",
    label: "X",
    icon: "icon-[tabler--brand-x]",
    href: (fullText, pageUrl) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}&url=${encodeURIComponent(pageUrl)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: "icon-[tabler--brand-facebook]",
    href: (_fullText, pageUrl) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
  },
];

/**
 * Universal share button. On mobile it opens the native share sheet
 * (where TikTok/Instagram/WhatsApp live); elsewhere it shows a compact
 * menu with the main networks plus copy-link.
 */
export function ShareButtons({
  url,
  title,
  text,
  className = "btn btn-ghost btn-sm gap-2",
  compact = false,
  dataTour,
}: ShareButtonsProps) {
  const t = useTranslations("share");
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  // Lazy initializers (no effects): SSR-safe, and all usages pass url.
  const [canNative] = useState(
    () =>
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      typeof (navigator as Navigator & { share?: unknown }).share ===
        "function",
  );
  const [pageUrl] = useState(
    () => url ?? (typeof window !== "undefined" ? window.location.href : ""),
  );
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const fullText = `${text} ${pageUrl}`.trim();

  const doNativeShare = async () => {
    try {
      const nav = navigator as Navigator & {
        share?: (data: {
          title?: string;
          text?: string;
          url?: string;
        }) => Promise<void>;
      };
      await nav.share?.({ title, text, url: pageUrl });
    } catch {
      // User dismissed the sheet: nothing to do.
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showToast(t("linkCopied"), "success");
    setOpen(false);
  };

  const label = (
    <>
      <span className="icon-[tabler--share] size-4"></span>
      {!compact && t("share")}
    </>
  );

  if (canNative) {
    return (
      <button
        type="button"
        onClick={doNativeShare}
        className={className}
        title={t("share")}
        aria-label={t("share")}
        data-tour={dataTour}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef} data-tour={dataTour}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={className}
        title={t("share")}
        aria-label={t("share")}
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 card bg-base-100 border border-base-content/10 shadow-xl p-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50 px-2 pt-1 pb-2">
            {t("shareVia")}
          </p>
          {NETWORKS.map((n) => (
            <a
              key={n.key}
              href={n.href(fullText, pageUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-base-200 text-sm"
              onClick={() => setOpen(false)}
            >
              <span className={`${n.icon} size-5`}></span>
              {n.label}
            </a>
          ))}
          <div className="divider my-1 opacity-50"></div>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-base-200 text-sm w-full text-left"
          >
            <span className="icon-[tabler--copy] size-5"></span>
            {t("copyLink")}
          </button>
        </div>
      )}
    </div>
  );
}
