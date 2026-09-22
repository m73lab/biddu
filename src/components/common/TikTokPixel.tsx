"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { initTikTokPixel, tiktokEnabled, trackTikTokPage } from "@/lib/tiktok";

/**
 * Mount once in _app: loads the TikTok pixel (if configured) and fires
 * a PageView on every SPA navigation. Renders nothing.
 */
export function TikTokPixel() {
  const router = useRouter();

  useEffect(() => {
    initTikTokPixel();
  }, []);

  useEffect(() => {
    if (!tiktokEnabled()) return;
    const onRoute = () => trackTikTokPage();
    router.events.on("routeChangeComplete", onRoute);
    return () => {
      router.events.off("routeChangeComplete", onRoute);
    };
  }, [router]);

  return null;
}
