"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

export interface LightboxImage {
  src: string;
  alt: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  onClose: () => void;
  /** Counter text, e.g. "3 / 8". Defaults to a plain fraction. */
  formatCounter?: (current: number, total: number) => string;
  prevLabel?: string;
  nextLabel?: string;
}

/**
 * Full-screen image viewer (modal to body).
 * Click the backdrop or press Escape to close, arrows to navigate.
 */
export function ImageLightbox({
  images,
  initialIndex = 0,
  onClose,
  formatCounter,
  prevLabel = "‹",
  nextLabel = "›",
}: ImageLightboxProps) {
  const t = useTranslations("common");
  const [index, setIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
  );

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, go]);

  if (images.length === 0 || typeof document === "undefined") return null;
  const current = images[index];

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium tabular-nums">
          {formatCounter
            ? formatCounter(index + 1, images.length)
            : `${index + 1} / ${images.length}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle text-white"
          aria-label={t("close")}
        >
          <span className="icon-[tabler--x] size-6"></span>
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center px-2 pb-2 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-sm sm:btn-md bg-white/10 hover:bg-white/20 border-none text-white z-10"
            aria-label={prevLabel}
          >
            <span className="icon-[tabler--chevron-left] size-5"></span>
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
        />
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-sm sm:btn-md bg-white/10 hover:bg-white/20 border-none text-white z-10"
            aria-label={nextLabel}
          >
            <span className="icon-[tabler--chevron-right] size-5"></span>
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
