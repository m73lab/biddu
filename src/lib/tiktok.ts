/**
 * TikTok Pixel (client-side) for biddu.online.
 *
 * Dormant until NEXT_PUBLIC_TIKTOK_PIXEL_ID is configured: every function
 * is a no-op without it, so this ships safely before the pixel exists.
 * Standard events used: ViewContent (item view), InitiateCheckout (bid).
 * CompleteRegistration is sent server-side only (reliable + hashed email,
 * no double counting with the pixel).
 */

type TtqStub = ((...args: unknown[]) => void) & {
  q?: unknown[][];
  methods?: string[];
  setAndDefer?: (t: unknown, e: string) => void;
  load?: (id: string) => void;
  page?: () => void;
  track?: (event: string, params?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    ttq?: TtqStub;
    TiktokAnalyticsObject?: string;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "";
let loaded = false;

export function tiktokEnabled(): boolean {
  return PIXEL_ID !== "";
}

/** Inject the official snippet once + fire the initial PageView. */
export function initTikTokPixel(): void {
  if (!tiktokEnabled() || loaded || typeof document === "undefined") return;
  loaded = true;

  window.TiktokAnalyticsObject = "ttq";
  const ttq: TtqStub = (window.ttq = window.ttq || ((() => {}) as TtqStub));
  ttq.methods = ["page", "track"];
  ttq.setAndDefer = (t: unknown, e: string) => {
    (t as Record<string, (...a: unknown[]) => void>)[e] = (...args: unknown[]) => {
      (ttq.q = ttq.q || []).push([e, ...args]);
    };
  };
  for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
  ttq.load = (id: string) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=ttq`;
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) first.parentNode.insertBefore(s, first);
    else document.head.appendChild(s);
  };
  ttq.load(PIXEL_ID);
  ttq.page?.();
}

/** Virtual pageview for SPA navigations. */
export function trackTikTokPage(): void {
  if (!tiktokEnabled() || typeof window === "undefined") return;
  try {
    window.ttq?.page?.();
  } catch {
    // Tracking must never break the app.
  }
}

export interface TikTokEventParams {
  content_id?: string;
  content_name?: string;
  value?: number;
  currency?: string;
}

/** Track a standard event (ViewContent, InitiateCheckout). No-op without pixel. */
export function trackTikTokEvent(
  event: "ViewContent" | "InitiateCheckout",
  params?: TikTokEventParams,
): void {
  if (!tiktokEnabled() || typeof window === "undefined") return;
  try {
    window.ttq?.track?.(event, { ...(params ?? {}) });
  } catch {
    // Tracking must never break the app.
  }
}
