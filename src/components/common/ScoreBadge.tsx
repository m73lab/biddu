interface ScoreBadgeProps {
  avgSeller: number | null;
  sellerCount: number;
  avgBuyer: number | null;
  buyerCount: number;
  size?: "xs" | "sm";
}

/**
 * Compact two-way reputation badge (seller + buyer averages).
 * Renders nothing when the user has no ratings yet.
 */
export function ScoreBadge({
  avgSeller,
  sellerCount,
  avgBuyer,
  buyerCount,
  size = "xs",
}: ScoreBadgeProps) {
  if (sellerCount <= 0 && buyerCount <= 0) return null;
  const cls = `badge badge-ghost gap-1 shrink-0 ${size === "xs" ? "badge-xs" : "badge-sm"}`;
  return (
    <span className="inline-flex items-center gap-1">
      {sellerCount > 0 && avgSeller != null && (
        <span className={cls} title={`${avgSeller.toFixed(1)}/5 · ${sellerCount}`}>
          <span className="icon-[tabler--star-filled] size-2.5 text-warning"></span>
          {avgSeller.toFixed(1)} ({sellerCount})
        </span>
      )}
      {buyerCount > 0 && avgBuyer != null && (
        <span className={cls} title={`${avgBuyer.toFixed(1)}/5 · ${buyerCount}`}>
          <span className="icon-[tabler--shopping-cart] size-2.5 text-info"></span>
          {avgBuyer.toFixed(1)} ({buyerCount})
        </span>
      )}
    </span>
  );
}
