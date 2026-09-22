"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/ui/toast";
import {
  generateStoryPng,
  downloadBlob,
  type StoryVariant,
} from "@/lib/story-asset";

interface StoryButtonProps {
  variant: StoryVariant;
  photoUrl: string | null;
  title: string;
  price?: string | null;
  badge?: string | null;
  endDate?: string | null;
  /** Full https URL encoded in the QR. */
  url: string;
  fileSlug: string;
  className?: string;
}

/** Compact relative deadline, e.g. "26 d", "3 h", "12 min". */
function relativeTime(endDate: string): string | null {
  const ms = new Date(endDate).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

/**
 * Creator kit: generates a 9:16 story asset (photo + price/stats + QR +
 * brand) entirely client-side and downloads it for stories/TikTok/WhatsApp.
 * The copy and accent depend on the variant (owner/bidder, item/auction).
 */
export function StoryButton({
  variant,
  photoUrl,
  title,
  price,
  badge,
  endDate,
  url,
  fileSlug,
  className = "btn btn-ghost btn-sm gap-2",
}: StoryButtonProps) {
  const t = useTranslations("story");
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

  const [scope, role] = variant.split("-") as [
    "item" | "auction",
    "owner" | "bidder",
  ];

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const svg = qrRef.current?.querySelector("svg") ?? null;
      const endsIn = endDate ? relativeTime(endDate) : null;
      const blob = await generateStoryPng({
        variant,
        photoUrl,
        eyebrow: t(`${scope}.${role}.eyebrow`),
        title,
        price: scope === "item" ? price : null,
        badge: scope === "auction" ? badge : null,
        endsLabel: endsIn ? t("endsIn", { time: endsIn }) : null,
        cta: t(`${scope}.${role}.cta`),
        hashtag: t(`${scope}.${role}.hashtag`),
        url,
        qrSvg: svg,
      });
      const safeSlug = fileSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      downloadBlob(blob, `biddu-${variant}-${safeSlug || "lote"}.png`);
      showToast(t("saved"), "success");
    } catch {
      showToast(t("failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Offscreen QR source for the canvas (never visible). */}
      <div
        ref={qrRef}
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <QRCodeSVG value={url} size={300} />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={className}
        title={t("button")}
      >
        {busy ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <span className="icon-[tabler--photo-down] size-4"></span>
        )}
        {t("button")}
      </button>
    </>
  );
}
