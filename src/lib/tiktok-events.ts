import crypto from "crypto";
import { createLogger } from "@/lib/logger";

const tiktokLogger = createLogger("tiktok-events");

/**
 * TikTok Events API (server-side) for biddu.online.
 *
 * Dormant until TIKTOK_EVENTS_API_TOKEN (+ pixel code) is configured.
 * Complements the browser pixel where the browser is unreliable or the
 * data is sensitive: email goes SHA-256 hashed, never raw.
 * Currently wired: CompleteRegistration on true user creation
 * (client pixel deliberately does NOT fire it: no double counting).
 */
const EVENTS_TOKEN = process.env.TIKTOK_EVENTS_API_TOKEN || "";
const PIXEL_CODE =
  process.env.TIKTOK_PIXEL_ID ||
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ||
  "";

export function tiktokEventsEnabled(): boolean {
  return EVENTS_TOKEN !== "" && PIXEL_CODE !== "";
}

export interface TikTokServerEvent {
  event: string;
  eventId?: string;
  email?: string;
  value?: number;
  currency?: string;
  contentId?: string;
  contentName?: string;
  url?: string;
}

/** Best-effort server event. Never throws, never blocks the request. */
export async function sendTikTokServerEvent(
  opts: TikTokServerEvent,
): Promise<void> {
  if (!tiktokEventsEnabled()) return;
  try {
    const user: Record<string, string> = {};
    if (opts.email) {
      user.email = crypto
        .createHash("sha256")
        .update(opts.email.trim().toLowerCase(), "utf8")
        .digest("hex");
    }
    const properties: Record<string, unknown> = {};
    if (opts.value !== undefined) properties.value = opts.value;
    if (opts.currency) properties.currency = opts.currency;
    if (opts.contentId) properties.content_id = opts.contentId;
    if (opts.contentName) properties.content_name = opts.contentName;
    const res = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "Access-Token": EVENTS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixel_code: PIXEL_CODE,
          event: opts.event,
          event_id:
            opts.eventId ||
            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: new Date().toISOString(),
          context: {
            page: opts.url ? { url: opts.url } : {},
            user,
          },
          properties,
        }),
      },
    );
    if (!res.ok) {
      tiktokLogger.warn(
        { status: res.status, event: opts.event },
        "TikTok Events API non-OK",
      );
    }
  } catch (err) {
    tiktokLogger.warn({ err }, "TikTok server event failed");
  }
}
