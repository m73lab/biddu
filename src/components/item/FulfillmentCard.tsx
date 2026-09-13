import { useState, useEffect } from "react";
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
  canRate: boolean;
  amount: string;
}

export function FulfillmentCard({
  auctionId,
  itemId,
  initialStatus,
  canManage,
  isWinnerView,
  canRate,
  amount,
}: FulfillmentCardProps) {
  const t = useTranslations("item.detail.fulfillment");
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [saving, setSaving] = useState<FulfillmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const key = status ?? "NONE";

  // Rating (two-way, blind until both sides rate)
  const [myRating, setMyRating] = useState<{
    score: number;
    comment: string | null;
  } | null>(null);
  const [showRate, setShowRate] = useState(false);
  const [stars, setStars] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "DELIVERED" || !canRate) return;
    fetch(`/api/auctions/${auctionId}/items/${itemId}/ratings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.myRating) {
          setMyRating({
            score: data.myRating.score,
            comment: data.myRating.comment ?? null,
          });
        }
      })
      .catch(() => undefined);
  }, [auctionId, itemId, status, canRate]);

  const submitRating = async () => {
    setRatingSaving(true);
    setRatingMsg(null);
    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/ratings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: stars,
            comment: rateComment.trim() || null,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || t("rateFailed"));
      }
      setMyRating({ score: stars, comment: rateComment.trim() || null });
      setShowRate(false);
      setRatingMsg(t("rateThanks"));
    } catch (err) {
      setRatingMsg(err instanceof Error ? err.message : t("rateFailed"));
    } finally {
      setRatingSaving(false);
    }
  };

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

      {status === "DELIVERED" && canRate && (
        <div className="mt-4 rounded-lg bg-base-200/50 p-4">
          {myRating ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="icon-[tabler--star-filled] size-5 text-warning"></span>
                <span className="font-bold">
                  {t("myRating", { score: myRating.score })}
                </span>
                <span className="text-xs text-base-content/60">
                  {t("blindNote")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStars(myRating.score);
                  setRateComment(myRating.comment ?? "");
                  setShowRate(true);
                }}
                className="btn btn-ghost btn-sm gap-1"
              >
                <span className="icon-[tabler--edit] size-4"></span>
                {t("rateEdit")}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{t("rateTitle")}</div>
              <button
                type="button"
                onClick={() => setShowRate(true)}
                className="btn btn-sm btn-warning gap-1"
              >
                <span className="icon-[tabler--star] size-4"></span>
                {t("rateButton")}
              </button>
            </div>
          )}
          {ratingMsg && (
            <div className="text-xs text-base-content/60 mt-2">{ratingMsg}</div>
          )}
        </div>
      )}

      {showRate && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="icon-[tabler--star] size-5 text-warning"></span>
              {t("rateTitle")}
            </h3>
            <div className="flex items-center gap-1 my-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  className="btn btn-ghost btn-square"
                  aria-label={`${n} / 5`}
                >
                  <span
                    className={`size-7 ${
                      n <= stars
                        ? "icon-[tabler--star-filled] text-warning"
                        : "icon-[tabler--star] text-base-content/30"
                    }`}
                  ></span>
                </button>
              ))}
            </div>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={500}
              placeholder={t("ratePlaceholder")}
              value={rateComment}
              onChange={(e) => setRateComment(e.target.value)}
            />
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowRate(false)}
                disabled={ratingSaving}
              >
                {t("rateCancel")}
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={submitRating}
                disabled={ratingSaving}
              >
                {ratingSaving && (
                  <span className="loading loading-spinner loading-xs"></span>
                )}
                {t("rateSubmit")}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => !ratingSaving && setShowRate(false)}
          ></div>
        </div>
      )}
    </div>
  );
}
