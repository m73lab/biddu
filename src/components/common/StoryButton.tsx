"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/ui/toast";
import {
  generateStoryPng,
  downloadBlob,
} from "@/lib/story-asset";

interface StoryButtonProps {
  photoUrl: string | null;
  title: string;
  price: string;
  endsLabel: string | null;
  /** Full https URL encoded in the QR. */
  url: string;
  fileSlug: string;
  className?: string;
}

/**
 * Creator kit: generates a 9:16 story asset (photo + price + QR + brand)
 * entirely client-side and downloads it for stories/TikTok/WhatsApp.
 */
export function StoryButton({
  photoUrl,
  title,
  price,
  endsLabel,
  url,
  fileSlug,
  className = "btn btn-ghost btn-sm gap-2 w-auto",
}: StoryButtonProps) {
  const t = useTranslations("item");
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const svg =
        qrRef.current?.querySelector("svg") ?? null;
      const blob = await generateStoryPng({
        photoUrl,
        title,
        price,
        endsLabel,
        url,
        qrSvg: svg,
      });
      const safeSlug = fileSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      downloadBlob(blob, `biddu-remate-${safeSlug || "lote"}.png`);
      showToast(t("detail.storySaved"), "success");
    } catch {
      showToast(t("detail.storyFailed"), "error");
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
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <QRCodeSVG value={url} size={300} />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={className}
        title={t("detail.createStory")}
      >
        {busy ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <span className="icon-[tabler--photo-down] size-4"></span>
        )}
        {t("detail.createStory")}
      </button>
    </>
  );
}
