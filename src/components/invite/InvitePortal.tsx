import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RichTextRenderer } from "@/components/ui/rich-text-editor";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { useFormatters } from "@/i18n";

export interface PortalHostInfo {
  id: string;
  name: string | null;
  storeName: string | null;
  avatarSeed: string | null;
  createdAt: string;
  isNewAccount: boolean;
  avgSellerRating: number | null;
  sellerRatingCount: number;
  avgBuyerRating: number | null;
  buyerRatingCount: number;
}

export interface PortalAuctionInfo {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  endDate: string | null;
  memberCount: number;
  itemCount: number;
  host: PortalHostInfo | null;
}

interface InvitePortalProps {
  status: "loading" | "invalid" | "ready";
  invalidMessage: string | null;
  title: string;
  subtitle: string;
  auction: PortalAuctionInfo | null;
  inviterRowLabel: string;
  inviterName: string;
  roleLabel: string;
  role: string;
  /** Extra chip under the title (e.g. the invite code). */
  headerBadge?: ReactNode;
  error: string | null;
  children: ReactNode;
}

/**
 * Shared join portal: same look for email invites (/invite/[token])
 * and shareable codes (/join/[code]).
 */
export function InvitePortal({
  status,
  invalidMessage,
  title,
  subtitle,
  auction,
  inviterRowLabel,
  inviterName,
  roleLabel,
  role,
  headerBadge,
  error,
  children,
}: InvitePortalProps) {
  const t = useTranslations("auction.acceptInvite");
  const tCommon = useTranslations("common");
  const { formatShortDate } = useFormatters();

  if (status === "loading") {
    return (
      <div className="min-h-dvh bg-base-200 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,var(--color-primary),transparent)] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,var(--color-secondary),transparent)] opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="text-center relative z-10">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/60 font-medium animate-pulse">
            {tCommon("loading")}
          </p>
        </div>
      </div>
    );
  }

  if (status === "invalid" || !auction) {
    return (
      <div className="min-h-dvh bg-base-200 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,var(--color-error),transparent)] opacity-10"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl max-w-md w-full relative z-10">
          <div className="card-body items-center text-center p-8">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-4">
              <span className="icon-[tabler--alert-circle] size-10 text-error"></span>
            </div>
            <h1 className="text-2xl font-bold mt-2">{t("invalid")}</h1>
            <p className="text-base-content/60 mt-2">{invalidMessage}</p>
            <div className="card-actions mt-8 w-full">
              <Link
                href="/dashboard"
                className="btn btn-primary w-full shadow-lg shadow-primary/20"
              >
                {t("dashboard")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-base-200 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,var(--color-primary),transparent)] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,var(--color-secondary),transparent)] opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl max-w-md w-full relative z-10">
        <div className="card-body p-8">
          <div className="text-center mb-8">
            <div className="inline-flex relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl flex items-center justify-center relative z-10 border border-base-content/5 rotate-3">
                <span className="icon-[tabler--mail-opened] size-12 text-primary -rotate-3"></span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold mt-6 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-base-content/60 mt-2">{subtitle}</p>
            {headerBadge && (
              <div className="mt-3 flex justify-center">{headerBadge}</div>
            )}
          </div>

          <div className="bg-base-100/80 rounded-xl p-5 mb-4 border border-base-content/5 shadow-inner">
            {auction.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={auction.thumbnailUrl}
                alt={auction.name}
                className="w-full h-36 object-cover rounded-lg mb-4"
              />
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="icon-[tabler--gavel] size-6"></span>
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {auction.name}
                </h2>
                <p className="text-xs text-base-content/50 uppercase tracking-wide font-semibold">
                  {tCommon("appName")}
                </p>
              </div>
            </div>

            {auction.description && (
              <div className="mb-4 pl-[52px]">
                <RichTextRenderer
                  content={auction.description}
                  className="text-sm text-base-content/70"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60 pl-[52px] mb-2">
              <span className="inline-flex items-center gap-1">
                <span className="icon-[tabler--users] size-3.5"></span>
                {auction.memberCount} {t("members")}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="icon-[tabler--package] size-3.5"></span>
                {auction.itemCount} {t("items")}
              </span>
              {auction.endDate && (
                <span className="inline-flex items-center gap-1">
                  <span className="icon-[tabler--calendar] size-3.5"></span>
                  {formatShortDate(auction.endDate)}
                </span>
              )}
            </div>

            <div className="divider my-3 opacity-50"></div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-base-content/60">{inviterRowLabel}</span>
                <span className="font-medium flex items-center gap-1.5">
                  <span className="icon-[tabler--user] size-3.5 opacity-50"></span>
                  {inviterName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base-content/60">{roleLabel}</span>
                <span className="badge badge-primary badge-sm font-semibold shadow-sm shadow-primary/20">
                  {role}
                </span>
              </div>
            </div>
          </div>

          {auction.host && (
            <div className="bg-base-100/80 rounded-xl p-4 mb-8 border border-base-content/5">
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-semibold mb-3">
                {t("hostedBy")}
              </p>
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={auction.host.storeName || auction.host.name}
                  seed={auction.host.id}
                  avatarSeed={auction.host.avatarSeed}
                  size="md"
                  expandable={false}
                />
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">
                    {auction.host.storeName || auction.host.name || t("hostNoName")}
                    {auction.host.isNewAccount && (
                      <span className="badge badge-warning badge-xs ml-2">
                        {t("newAccount")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {t("memberSince")} {formatShortDate(auction.host.createdAt)}
                  </div>
                  <div className="mt-1">
                    <ScoreBadge
                      avgSeller={auction.host.avgSellerRating}
                      sellerCount={auction.host.sellerRatingCount}
                      avgBuyer={auction.host.avgBuyerRating}
                      buyerCount={auction.host.buyerRatingCount}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error mb-6 shadow-sm">
              <span className="icon-[tabler--alert-circle] size-5"></span>
              <span>{error}</span>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
