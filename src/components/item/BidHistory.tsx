import { useTranslations } from "next-intl";
import {
  formatCurrency,
  decimalsForCurrency,
} from "@/utils/formatters";
import { useFormatters } from "@/i18n";
import { UserAvatar, AnonymousAvatar } from "@/components/ui/user-avatar";
import { ScoreBadge } from "@/components/common/ScoreBadge";

interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  isAnonymous: boolean;
  ipHash?: string | null;
  userAgent?: string | null;
    user: {
        id: string;
        name: string | null;
      createdAt?: string | null;
      avatarSeed?: string | null;
      avgSellerRating?: number | null;
      sellerRatingCount?: number;
      avgBuyerRating?: number | null;
      buyerRatingCount?: number;
    } | null;
  }

interface BidHistoryProps {
  bids: Bid[];
  currencySymbol: string;
  currencyCode?: string;
  showAudit?: boolean;
}

export function BidHistory({
  bids,
  currencySymbol,
  currencyCode,
  showAudit = false,
}: BidHistoryProps) {
  const t = useTranslations("item.history");
  const { formatDate } = useFormatters();

  return (
    <div>
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <span className="icon-[tabler--history] size-5"></span>
        {t("title")} ({bids.length})
      </h2>

      {bids.length === 0 ? (
        <p className="text-base-content/60 text-center py-8">{t("noBids")}</p>
      ) : (
        <div className="space-y-2">
          {bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`flex justify-between items-center p-3 rounded-lg ${
                index === 0 ? "bg-primary/10" : "bg-base-200"
              }`}
            >
              <div className="flex items-center gap-3">
                  {bid.user && !bid.isAnonymous ? (
                    <UserAvatar
                      name={bid.user.name}
                      seed={bid.user.id}
                      avatarSeed={bid.user.avatarSeed}
                      size="sm"
                    />
                  ) : (
                    <AnonymousAvatar size="sm" />
                  )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {bid.user && !bid.isAnonymous
                      ? bid.user.name || t("anonymous")
                      : t("anonymous")}
                  </span>
                  {index === 0 && (
                    <span className="badge badge-primary badge-sm text-center">
                      {t("highest")}
                    </span>
                  )}
                  {bid.user && !bid.isAnonymous && (
                    <ScoreBadge
                      avgSeller={bid.user.avgSellerRating ?? null}
                      sellerCount={bid.user.sellerRatingCount ?? 0}
                      avgBuyer={bid.user.avgBuyerRating ?? null}
                      buyerCount={bid.user.buyerRatingCount ?? 0}
                    />
                  )}
                  {bid.user &&
                    !bid.isAnonymous &&
                    bid.user.createdAt &&
                    Date.now() - new Date(bid.user.createdAt).getTime() <
                      7 * 24 * 60 * 60 * 1000 && (
                      <span
                        className="badge badge-warning badge-xs"
                        title={t("newAccount")}
                      >
                        {t("newAccount")}
                      </span>
                    )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatCurrency(bid.amount, currencySymbol, decimalsForCurrency(currencyCode))}
                </div>
                <div className="text-xs text-base-content/60">
                  {formatDate(bid.createdAt)}
                </div>
                {showAudit && bid.ipHash && (
                  <div
                    className="text-[10px] font-mono text-base-content/40"
                    title={bid.userAgent || undefined}
                  >
                    ip {bid.ipHash.slice(0, 8)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
