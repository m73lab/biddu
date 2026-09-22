"use client";

import { useTranslations } from "next-intl";
import { Channels } from "@/lib/realtime/events";
import { usePresenceCount } from "@/hooks/realtime";

interface LiveViewersProps {
  auctionId?: string;
  itemId?: string;
  className?: string;
}

/**
 * Live viewer counter ("3 mirando"). Works for guests: presence channels
 * expose aggregate counts only, never identities. Hidden until the first
 * count arrives (or when realtime is off) and while showing just yourself
 * would be noise... actually the count includes you, so 1 = only you.
 * We still show it: on a quiet page it proves the counter is alive.
 */
export function LiveViewers({
  auctionId,
  itemId,
  className = "",
}: LiveViewersProps) {
  const t = useTranslations("live");
  const channel = itemId
    ? Channels.presenceItem(itemId)
    : auctionId
      ? Channels.presenceAuction(auctionId)
      : null;
  const count = usePresenceCount(channel);

  if (!channel || count === null || count < 1) return null;

  return (
    <span
      className={`badge badge-ghost gap-1.5 font-medium ${className}`}
      title={t("live.viewers", { count })}
    >
      <span className="size-2 rounded-full bg-error shrink-0"></span>
      {t("live.viewers", { count })}
    </span>
  );
}
