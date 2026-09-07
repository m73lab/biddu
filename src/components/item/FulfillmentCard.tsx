import { useState } from "react";
import { useTranslations } from "next-intl";

export type FulfillmentStatus = "PENDING_PAYMENT" | "PAID" | "DELIVERED";

const NEXT_ACTIONS: Record<string, FulfillmentStatus[]> = {
  NONE: ["PENDING_PAYMENT", "PAID"],
  PENDING_PAYMENT: ["PAID"],
  PAID: ["DELIVERED", "PENDING_PAYMENT"],
  DELIVERED: ["PAID"],
};

const ACTION_LABEL_KEY: Record<FulfillmentStatus, string> = {
  PENDING_PAYMENT: "markPending",
  PAID: "markPaid",
  DELIVERED: "markDelivered",
};

const BADGE_CLASS: Record<string, string> = {
  NONE: "badge-ghost",
  PENDING_PAYMENT: "badge-warning",
  PAID: "badge-info",
  DELIVERED: "badge-success",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  NONE: "noStatus",
  PENDING_PAYMENT: "pendingPayment",
  PAID: "paid",
  DELIVERED: "delivered",
};

export function FulfillmentBadge({
  status,
}: {
  status: string | null;
}) {
  const t = useTranslations("item.detail.fulfillment");
  if (!status) return null;
  const key = STATUS_LABEL_KEY[status] ?? "noStatus";
  return (
    <span
      className={`badge ${BADGE_CLASS[status] ?? "badge-ghost"} badge-sm font-semibold`}
    >
      {t(key)}
    </span>
  );
}

interface FulfillmentCardProps {
  auctionId: string;
  itemId: string;
  initialStatus: FulfillmentStatus | string | null;
  canManage: boolean;
  isWinnerView: boolean;
  amount: string;
}

export function FulfillmentCard({
  auctionId,
  itemId,
  initialStatus,
  canManage,
  isWinnerView,
  amount,
}: FulfillmentCardProps) {
  const t = useTranslations("item.detail.fulfillment");
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [saving, setSaving] = useState<FulfillmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const key = status ?? "NONE";

  const update = async (next: FulfillmentStatus) => {
    setSaving(next);
    setError(null);
    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/fulfillment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("updateFailed"));
      }
      setStatus(data.fulfillmentStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-xl border border-base-content/5 bg-base-100/80 p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="icon-[tabler--package] size-5 text-primary"></span>
          <h3 className="font-bold">{t("title")}</h3>
        </div>
        <span className={`badge ${BADGE_CLASS[key]} font-semibold`}>
          {t(STATUS_LABEL_KEY[key])}
        </span>
      </div>

      <p className="text-sm text-base-content/60 mb-4">{t("offlineNote")}</p>

      <div className="flex items-center justify-between bg-base-200/50 rounded-lg px-4 py-3 mb-4">
        <span className="text-sm text-base-content/60 flex items-center gap-2">
          <span className="icon-[tabler--cash] size-4"></span>
          {t("amountToPay")}
        </span>
        <span className="text-xl font-mono font-extrabold text-primary">
          {amount}
        </span>
      </div>

      {canManage && (
        <p className="text-sm text-base-content/70 mb-3">{t("ownerHint")}</p>
      )}
      {!canManage && isWinnerView && (
        <p className="text-sm text-base-content/70 mb-3">{t("winnerHint")}</p>
      )}

      {error && (
        <div className="alert alert-error alert-sm mb-3">
          <span className="icon-[tabler--alert-circle] size-4"></span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {NEXT_ACTIONS[key].map((next) => (
            <button
              key={next}
              type="button"
              disabled={saving !== null}
              onClick={() => update(next)}
              className={`btn btn-sm ${
                next === "DELIVERED" ? "btn-success" : "btn-primary"
              }`}
            >
              {saving === next && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              {t(ACTION_LABEL_KEY[next])}
            </button>
          ))}
          {saving && (
            <span className="text-xs text-base-content/50 self-center">
              {t("updating")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
