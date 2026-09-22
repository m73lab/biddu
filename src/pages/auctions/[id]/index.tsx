import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { getMessages, Locale } from "@/i18n";
import { fetcher } from "@/lib/fetcher";
import * as auctionService from "@/lib/services/auction.service";
import { useAuctionChannel, useEvent, Events } from "@/hooks/realtime";
import type {
  BidNewEvent,
  ItemEndedEvent,
  AuctionClosedEvent,
} from "@/lib/realtime/events";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { AuctionSidebar } from "@/components/auction";
import { ItemCard, ItemListItem } from "@/components/item";
import { SkeletonAuctionPage } from "@/components/ui/skeleton";
import { LiveViewers } from "@/components/common/LiveViewers";
import {
  SortDropdown,
  itemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import { useSortFilter, usePollingInterval } from "@/hooks/ui";
import { withAuth } from "@/lib/auth/withAuth";
import { isUserAdmin, canUserCreateItems } from "@/utils/auction-helpers";
import { useTranslations } from "next-intl";

interface Auction {
  id: string;
  name: string;
  description: string | null;
  joinMode: string;
  memberCanInvite: boolean;
  bidderVisibility: string;
  endDate: string | null;
  itemEndMode: string;
  inviteToken: string | null;
  createdAt: string;
  thumbnailUrl: string | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    items: number;
    members: number;
  };
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  startingBid: number;
  currentBid: number | null;
  endDate: string | null;
  createdAt: string;
  creatorId: string;
  thumbnailUrl: string | null;
  highestBidderId: string | null;
  userHasBid: boolean;
  _count: {
    bids: number;
  };
}

interface AuctionDetailsData {
  auction: Auction;
  items: Item[];
}

interface AuctionDetailProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auctionId: string;
  auctionName: string | null;
  membership: {
    role: string;
  } | null;
  hasLeft: boolean;
  fallback: AuctionDetailsData | null;
}

export default function AuctionDetailPage({
  user,
  auctionId,
  auctionName,
  membership,
  hasLeft,
  fallback,
}: AuctionDetailProps) {
  const router = useRouter();
  const t = useTranslations("auction");
  const tCommon = useTranslations("common");
  const tItem = useTranslations("item");
  const { currentSort } = useSortFilter("sort", "date-desc");
  const viewMode = (router.query.view as "grid" | "list") || "grid";
  const [rejoining, setRejoining] = useState(false);
  const [rejoinError, setRejoinError] = useState<string | null>(null);

  // Use high priority for auction detail page, pauses when tab hidden
  const refreshInterval = usePollingInterval({ priority: "high" });

  // Client-side data fetching with polling for live bid updates.
  // SSR seeds fallbackData: first paint comes from props, SWR
  // revalidates in background (no second skeleton, no double fetch).
  const { data, isLoading, mutate } = useSWR<AuctionDetailsData>(
    hasLeft ? null : `/api/auctions/${auctionId}/details`,
    fetcher,
    {
      fallbackData: fallback ?? undefined,
      refreshInterval,
      revalidateOnFocus: true,
      // Seed the SWR cache on mount: fallbackData is not written to the cache,
      // so without this the realtime mutate() below no-ops after a client-side
      // navigation (when the socket is already connected).
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  // Live bid ticks: the server publishes every BID_NEW to the auction
  // channel as well as the item channel, so the overview updates instantly
  // without waiting for the next poll (and without one subscription per
  // item). Patches the cached item in place, no refetch.
  const auctionChannel = useAuctionChannel(hasLeft ? null : auctionId);
  const handleAuctionBid = useCallback(
    (event: BidNewEvent) => {
      if (event.auctionId !== auctionId) return;
      mutate(
        (current) => {
          const base = current ?? fallback;
          if (!base) return current;
          let changed = false;
          const items = base.items.map((it) => {
            if (it.id !== event.itemId) return it;
            changed = true;
            return {
              ...it,
              currentBid: event.highestBid,
              highestBidderId: event.bidderId,
              userHasBid: it.userHasBid || event.bidderId === user.id,
              _count: { bids: it._count.bids + 1 },
            };
          });
          if (!changed) return base;
          return { ...base, items };
        },
        { revalidate: false },
      );
    },
    [auctionId, mutate, user.id],
  );
  useEvent(auctionChannel, Events.BID_NEW, handleAuctionBid);

  // Live item-ended updates: paper over the profile so an item the owner
  // ended (or an auction close that ends every item) reads as terminated
  // immediately. No refetch: closing an auction delivers N events at once,
  // the AUCTION_CLOSED handler below does the single reconciliation fetch.
  const handleItemEnded = useCallback(
    (event: ItemEndedEvent) => {
      if (event.auctionId !== auctionId) return;
      mutate(
        (current) => {
          const base = current ?? fallback;
          if (!base) return current;
          let changed = false;
          const items = base.items.map((it) => {
            if (it.id !== event.itemId) return it;
            changed = true;
            return { ...it, endDate: new Date().toISOString() };
          });
          if (!changed) return base;
          return { ...base, items };
        },
        { revalidate: false },
      );
    },
    [auctionId, mutate],
  );
  useEvent(auctionChannel, Events.ITEM_ENDED, handleItemEnded);

  // Live auction-closed update: the owner closed the auction, so mark it
  // terminated in the cache; the default revalidation reconciles items to
  // server truth in a single fetch.
  const handleAuctionClosed = useCallback(
    (event: AuctionClosedEvent) => {
      if (event.auctionId !== auctionId) return;
      mutate((current) => {
        const base = current ?? fallback;
        if (!base) return current;
        return {
          ...base,
          auction: { ...base.auction, endDate: new Date().toISOString() },
        };
      });
    },
    [auctionId, mutate],
  );
  useEvent(auctionChannel, Events.AUCTION_CLOSED, handleAuctionClosed);

  const auction = data?.auction;
  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const sortedItems = useMemo(
    () => sortItems(items, currentSort),
    [items, currentSort],
  );

  const setViewMode = (mode: "grid" | "list") => {
    router.push(
      { pathname: router.pathname, query: { ...router.query, view: mode } },
      undefined,
      { shallow: true },
    );
  };

  const handleRejoin = async () => {
    setRejoining(true);
    setRejoinError(null);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/rejoin`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setRejoinError(data.message || t("rejoin.error"));
        return;
      }
      router.reload();
    } catch {
      setRejoinError(t("rejoin.error"));
    } finally {
      setRejoining(false);
    }
  };

  // Show rejoin prompt if user previously left
  if (hasLeft) {
    return (
      <PageLayout user={user}>
        <BackLink href="/dashboard" label={t("create.backToDashboard")} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="card bg-base-100 shadow-xl border border-base-content/10 max-w-md w-full">
            <div className="card-body items-center text-center">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-2">
                <span className="icon-[tabler--door-enter] size-8 text-warning"></span>
              </div>
              <h2 className="card-title text-lg">{t("rejoin.title")}</h2>
              <p className="text-base-content/60 text-sm">
                {t("rejoin.message", {
                  name: auctionName || t("rejoin.thisAuction"),
                })}
              </p>
              {rejoinError && (
                <div className="alert alert-error text-sm w-full">
                  <span className="icon-[tabler--alert-circle] size-5"></span>
                  {rejoinError}
                </div>
              )}
              <div className="card-actions mt-4 w-full flex-col gap-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleRejoin}
                  disabled={rejoining}
                >
                  {rejoining ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <span className="icon-[tabler--door-enter] size-5"></span>
                  )}
                  {rejoining ? t("rejoin.rejoining") : t("rejoin.button")}
                </button>
                <Link href="/dashboard" className="btn btn-ghost w-full">
                  {t("create.backToDashboard")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const isAdmin = isUserAdmin(membership!.role);
  const canCreate = canUserCreateItems(membership!.role);

  // Show skeleton only on cold load (cached data renders instantly)
  if (isLoading || !auction) {
    return (
      <PageLayout user={user}>
        <BackLink href="/dashboard" label={t("create.backToDashboard")} />
        <SkeletonAuctionPage />
      </PageLayout>
    );
  }

  return (
    <PageLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <BackLink
          href="/dashboard"
          label={t("create.backToDashboard")}
          shortLabel={tCommon("back")}
        />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center text-primary-content shadow-lg shadow-primary/20">
            <span className="icon-[tabler--gavel] size-7"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {auction.name}
          </h1>
        </div>
        <div className="mt-3">
          <LiveViewers auctionId={auction.id} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content - Items */}
        <div className="flex-1 min-w-0">
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
            <div className="card-body p-6">
              {/* Items Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-base-content/5">
                <h2 className="card-title flex items-center gap-2">
                  <span className="icon-[tabler--package] size-5 text-primary"></span>
                  {t("sidebar.items")}
                  <span className="badge badge-secondary badge-sm shadow-sm">
                    {items.length}
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <SortDropdown
                    options={itemSortOptions}
                    currentSort={currentSort}
                  />
                  <div className="join shadow-sm">
                    <button
                      className={`btn btn-sm join-item ${
                        viewMode === "grid"
                          ? "btn-active btn-primary"
                          : "btn-ghost bg-base-200/50"
                      }`}
                      onClick={() => setViewMode("grid")}
                      title="Grid view"
                    >
                      <span className="icon-[tabler--layout-grid] size-4"></span>
                    </button>
                    <button
                      className={`btn btn-sm join-item ${
                        viewMode === "list"
                          ? "btn-active btn-primary"
                          : "btn-ghost bg-base-200/50"
                      }`}
                      onClick={() => setViewMode("list")}
                      title="List view"
                    >
                      <span className="icon-[tabler--list] size-4"></span>
                    </button>
                  </div>
                  {canCreate && (
                    <Link
                      href={`/auctions/${auction.id}/items/create`}
                      className="btn btn-primary btn-sm shadow-md shadow-primary/20 w-full sm:w-auto"
                    >
                      <span className="icon-[tabler--plus] size-4"></span>
                      <span className="hidden sm:inline ">
                        {t("sidebar.addItem")}
                      </span>
                      <span className="sm:hidden ">{tCommon("create")}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Items Content */}
              {sortedItems.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    icon="icon-[tabler--package-off]"
                    title={tItem("empty.title")}
                    description={tItem("empty.description")}
                    action={
                      canCreate ? (
                        <Link
                          href={`/auctions/${auction.id}/items/create`}
                          className="btn btn-primary shadow-lg"
                        >
                          <span className="icon-[tabler--plus] size-5"></span>
                          {tItem("empty.createFirst")}
                        </Link>
                      ) : undefined
                    }
                  />
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sortedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      auctionId={auction.id}
                      userId={user.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedItems.map((item) => (
                    <ItemListItem
                      key={item.id}
                      item={item}
                      auctionId={auction.id}
                      userId={user.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 shrink-0">
          <AuctionSidebar auction={auction} membership={membership!} />
        </div>
      </div>
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const auctionId = context.params?.id as string;

  // Membership + full details payload + messages in one parallel round
  // (were sequential). Details double as SWR fallbackData: the client
  // paints instantly with no second fetch round-trip.
  const [membership0, details, messages] = await Promise.all([
    auctionService.getUserMembership(auctionId, context.session.user.id),
    auctionService.getAuctionDetailsData(auctionId, context.session.user.id),
    getMessages(context.locale as Locale),
  ]);

  const auction = details?.auction ?? null;

  if (!auction) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Get membership check
  let membership = membership0;

  // If not a member, check if this is an OPEN or LINK auction
  if (!membership) {
    if (auction.joinMode === "FREE" || auction.joinMode === "LINK") {
      // Check if user previously left voluntarily
      const hasLeft = await auctionService.hasUserLeftAuction(
        auctionId,
        context.session.user.id,
      );

      if (hasLeft) {
        // Show rejoin prompt instead of auto-joining
        return {
          props: {
            user: {
              id: context.session.user.id,
              name: context.session.user.name || null,
              email: context.session.user.email || "",
            },
            auctionId,
            auctionName: auction.name,
            membership: null,
            hasLeft: true,
            fallback: null,
            messages,
          },
        };
      }

      // Auto-join new users
      membership = await auctionService.autoJoinAuction(
        auctionId,
        context.session.user.id,
      );
    }

    // Not a member and not a public auction - redirect
    if (!membership) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }
  }

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      auctionId,
      auctionName: null,
      membership: {
        role: membership.role,
      },
      hasLeft: false,
      fallback: details,
      messages,
    },
  };
});
