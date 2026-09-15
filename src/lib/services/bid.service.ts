import { prisma } from "@/lib/prisma";
import { queueOutbidEmail } from "@/lib/email/service";
import * as notificationService from "./notification.service";
import { formatCurrency, decimalsForCurrency } from "@/utils/formatters";
import { publish, Events, Channels } from "@/lib/realtime";
import type { BidNewEvent, BidOutbidEvent } from "@/lib/realtime/events";
import type { Bid } from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

  export interface CreateBidInput {
    amount: number;
    normalizedAmount?: number;
    enteredRepresentation?: unknown;
    currencyProfileId?: string;
    isAnonymous?: boolean;
    ipHash?: string | null;
    userAgent?: string | null;
  }

export interface BidWithUser extends Bid {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface UserBidStats {
  totalBids: number;
  currencyTotals: Array<{
    code: string;
    symbol: string;
    total: number;
  }>;
  itemsBidOn: number;
  currentlyWinning: number;
}

export interface UserBidItem {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  currentBid: number | null;
  startingBid: number;
  highestBidderId: string | null;
  endDate: string | null;
  createdAt: string;
  currencySymbol: string;
  currencyCode: string;
  auctionId: string;
  auctionName: string;
  userHighestBid: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all bids for an item
 */
export async function getItemBids(itemId: string): Promise<BidWithUser[]> {
  return prisma.bid.findMany({
    where: { auctionItemId: itemId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { amount: "desc" },
  });
}

/**
 * Get user's bid stats + bid items in ONE query.
 * Replaces the former getUserBidStats + getUserBidItems pair, which each
 * scanned the user's full bid history (double I/O growing with every bid).
 */
export async function getUserBidsOverview(userId: string): Promise<{
  stats: UserBidStats;
  items: UserBidItem[];
}> {
  const { getPublicUrl } = await import("@/lib/storage");

  const userBids = await prisma.bid.findMany({
    where: { userId },
    include: {
      auctionItem: {
        include: {
          currency: { select: { code: true, symbol: true } },
          auction: { select: { id: true, name: true } },
          images: {
            select: { url: true },
            orderBy: { order: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // --- stats (same shape as the old getUserBidStats) ---
  const totalBids = userBids.length;

  // Calculate currency totals
  const currencyMap = new Map<
    string,
    { code: string; symbol: string; total: number }
  >();
  for (const bid of userBids) {
    const code = bid.auctionItem.currency.code;
    const symbol = bid.auctionItem.currency.symbol;
    const existing = currencyMap.get(code);
    if (existing) {
      existing.total += bid.amount;
    } else {
      currencyMap.set(code, { code, symbol, total: bid.amount });
    }
  }
  const currencyTotals = Array.from(currencyMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // Get unique items and winning count
  const itemsMap = new Map<
    string,
    { highestBidderId: string | null; userHighestBid: number }
  >();
  for (const bid of userBids) {
    const existing = itemsMap.get(bid.auctionItemId);
    if (!existing || bid.amount > existing.userHighestBid) {
      itemsMap.set(bid.auctionItemId, {
        highestBidderId: bid.auctionItem.highestBidderId,
        userHighestBid: bid.amount,
      });
    }
  }

  const stats: UserBidStats = {
    totalBids,
    currencyTotals,
    itemsBidOn: itemsMap.size,
    currentlyWinning: Array.from(itemsMap.values()).filter(
      (item) => item.highestBidderId === userId,
    ).length,
  };

  // --- items (same shape as the old getUserBidItems) ---
  const fullItemsMap = new Map<
    string,
    (typeof userBids)[0]["auctionItem"] & { userHighestBid: number }
  >();
  for (const bid of userBids) {
    const existing = fullItemsMap.get(bid.auctionItemId);
    if (!existing || bid.amount > existing.userHighestBid) {
      fullItemsMap.set(bid.auctionItemId, {
        ...bid.auctionItem,
        userHighestBid: bid.amount,
      });
    }
  }

  const items: UserBidItem[] = Array.from(fullItemsMap.values()).map(
    (item) => ({
      id: item.id,
      name: item.name,
      thumbnailUrl: item.images[0]?.url
        ? getPublicUrl(item.images[0].url)
        : null,
      currentBid: item.currentBid,
      startingBid: item.startingBid,
      highestBidderId: item.highestBidderId,
      endDate: item.endDate?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      currencySymbol: item.currency.symbol,
      currencyCode: item.currency.code,
      auctionId: item.auction.id,
      auctionName: item.auction.name,
      userHighestBid: item.userHighestBid,
    }),
  );

  return { stats, items };
}

/**
 * Get user's bid statistics for dashboard
 * @deprecated Use getUserBidsOverview (single query) instead.
 */
export async function getUserBidStats(userId: string): Promise<UserBidStats> {
  const { stats } = await getUserBidsOverview(userId);
  return stats;
}

/**
 * Get user's bid history for history page
 */
export async function getUserBidHistory(userId: string) {
  const bids = await prisma.bid.findMany({
    where: { userId },
    include: {
      auctionItem: {
        include: {
          currency: true,
          auction: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Calculate stats
  const winningBids = bids.filter(
    (b) => b.auctionItem.highestBidderId === userId,
  );

  // Calculate per-currency totals for winning bids
  const currencyMap = new Map<
    string,
    { code: string; symbol: string; total: number }
  >();
  for (const bid of winningBids) {
    const code = bid.auctionItem.currency.code;
    const symbol = bid.auctionItem.currency.symbol;
    const existing = currencyMap.get(code);
    if (existing) {
      existing.total += bid.amount;
    } else {
      currencyMap.set(code, { code, symbol, total: bid.amount });
    }
  }
  const winningTotals = Array.from(currencyMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return {
    bids: bids.map((b) => ({
      id: b.id,
      amount: b.amount,
      createdAt: b.createdAt.toISOString(),
      isWinning: b.auctionItem.highestBidderId === userId,
      item: {
        id: b.auctionItem.id,
        name: b.auctionItem.name,
        currentBid: b.auctionItem.currentBid,
        endDate: b.auctionItem.endDate?.toISOString() || null,
        fulfillmentStatus: b.auctionItem.fulfillmentStatus,
        currency: {
          code: b.auctionItem.currency.code,
          symbol: b.auctionItem.currency.symbol,
        },
      },
      auction: b.auctionItem.auction,
    })),
    stats: {
      totalBids: bids.length,
      winningBids: winningBids.length,
      winningTotals,
    },
  };
}

/**
 * Get user's bid items for dashboard
 * @deprecated Use getUserBidsOverview (single query) instead.
 */
export async function getUserBidItems(userId: string): Promise<UserBidItem[]> {
  const { items } = await getUserBidsOverview(userId);
  return items;
}

/**
 * Get items user has bid on in an auction
 */
export async function getUserBidItemIds(
  userId: string,
  auctionId: string,
): Promise<Set<string>> {
  const userBids = await prisma.bid.findMany({
    where: {
      userId,
      auctionItem: { auctionId },
    },
    select: { auctionItemId: true },
    distinct: ["auctionItemId"],
  });

  return new Set(userBids.map((b) => b.auctionItemId));
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Place a bid on an item
 */
export async function placeBid(
  itemId: string,
  userId: string,
  input: CreateBidInput,
  bidderVisibility: string,
): Promise<Bid> {
  // Get item with auction info and bidder name
  const [item, bidder] = await Promise.all([
    prisma.auctionItem.findUnique({
      where: { id: itemId },
      include: {
        currency: true,
        auction: {
          select: { id: true, name: true, bidderVisibility: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
  ]);

  if (!item) {
    throw new Error("Item not found");
  }

  // Store previous highest bidder for notification
  const previousBidderId = item.highestBidderId;

  // Determine if bid should be anonymous
  const shouldBeAnonymous =
    bidderVisibility === "PER_BID" ? (input.isAnonymous ?? false) : false;

  // Anti-snipe: check if we need to extend the end date
  let newEndDate: Date | null = null;
  if (item.antiSnipeEnabled && item.endDate) {
    const now = new Date();
    const endTime = new Date(item.endDate);
    const msUntilEnd = endTime.getTime() - now.getTime();
    const thresholdMs = item.antiSnipeThresholdSeconds * 1000;

    // If bid arrives within the threshold window before end, extend
    if (msUntilEnd > 0 && msUntilEnd <= thresholdMs) {
      newEndDate = new Date(
        endTime.getTime() + item.antiSnipeExtensionSeconds * 1000,
      );
    }
  }

  // Create bid and update item in transaction
  const itemUpdateData: Record<string, unknown> = {
    currentBid: input.amount,
    highestBidderId: userId,
  };
  if (newEndDate) {
    itemUpdateData.endDate = newEndDate;
  }

  const [bid] = await prisma.$transaction([
      prisma.bid.create({
        data: {
          auctionItemId: itemId,
          userId,
          amount: input.amount,
          normalizedAmount: input.normalizedAmount ?? input.amount,
          enteredRepresentation: input.enteredRepresentation as never,
          currencyProfileId: input.currencyProfileId,
          isAnonymous: shouldBeAnonymous,
          ipHash: input.ipHash ?? null,
          userAgent: input.userAgent ?? null,
        },
      }),
    prisma.auctionItem.update({
      where: { id: itemId },
      data: itemUpdateData,
    }),
  ]);

  // Publish realtime event for new bid (private item channel)
  const bidEvent: BidNewEvent = {
    itemId,
    auctionId: item.auction.id,
    bidId: bid.id,
    amount: input.amount,
    currencyCode: item.currency.code,
    normalizedAmount: input.normalizedAmount ?? input.amount,
    enteredRepresentation: input.enteredRepresentation,
    currencyProfileId: input.currencyProfileId,
    bidderId: userId,
    bidderName: shouldBeAnonymous ? null : bidder?.name || null,
    isAnonymous: shouldBeAnonymous,
    timestamp: bid.createdAt.toISOString(),
    highestBid: input.amount,
    newEndDate: newEndDate?.toISOString() || undefined,
  };
  publish(Channels.item(itemId), Events.BID_NEW, bidEvent);

  // Notify previous bidder they've been outbid
  if (previousBidderId && previousBidderId !== userId) {
    notifyOutbidUser(
      previousBidderId,
      item.name,
      item.auction.id,
      itemId,
      input.amount,
      input.normalizedAmount ?? input.amount,
      item.currency.symbol,
      item.auction.name,
      item.currency.code,
    );
  }

  // Notify all other auction members about the new bid (fire and forget)
  notifyMembersOfNewBid({
    auctionId: item.auction.id,
    itemId,
    itemName: item.name,
    bidderId: userId,
    displayName: shouldBeAnonymous
      ? "Un pujador anónimo"
      : bidder?.name || "Alguien",
    amount: input.amount,
    currencySymbol: item.currency.symbol,
    currencyCode: item.currency.code,
    excludeUserIds: previousBidderId ? [previousBidderId] : [],
  });

  // Shill/fake-bid detection (fire-and-forget, never blocks the bid)
  detectShillPatterns(item.auction.id, itemId, userId).catch(() => undefined);

  return bid;
}

// ============================================================================
// Anti-fraud: void winner, strikes
// ============================================================================

/**
 * Ghost winners voided across the platform before bidding is blocked.
 */
export const MAX_VOID_STRIKES = 2;

/**
 * Whether the user is blocked from bidding platform-wide
 * (too many voided winning bids as a no-show).
 */
export async function isBiddingBlocked(userId: string): Promise<boolean> {
  const voids = await prisma.bidVoid.count({ where: { userId } });
  return voids >= MAX_VOID_STRIKES;
}

export interface VoidWinnerResult {
  voidedBidId: string;
  voidedUserId: string;
  voidedAmount: number;
  newHighestBid: number | null;
  newHighestBidderId: string | null;
  newHighestBidderName: string | null;
}

/**
 * Void the winning bid of an ENDED item (ghost-bid remedy).
 * - Only ended items (item or auction end in the past).
 * - Deletes the top bid, promotes the runner-up (or leaves the item
 *   unsold), resets fulfillment, and re-arms winner notification so the
 *   runner-up is notified by the existing ended-items flow.
 * - Records a BidVoid row (audit trail + strike for the ghost bidder).
 */
export async function voidWinningBid(
  itemId: string,
  actorId: string,
  reason?: string | null,
  auctionId?: string,
): Promise<VoidWinnerResult> {
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      auction: { select: { id: true, endDate: true } },
      bids: { orderBy: { amount: "desc" }, take: 2 },
    },
  });

  if (!item || (auctionId && item.auctionId !== auctionId)) {
    throw new Error("Item not found");
  }

  const now = new Date();
  const itemEnded = !!item.endDate && item.endDate < now;
  const auctionEnded =
    !!item.auction.endDate && item.auction.endDate < now;
  if (!itemEnded && !auctionEnded) {
    throw new Error("Only ended items can void their winner");
  }

  const [top, runnerUp] = item.bids;
  if (!top || !item.highestBidderId) {
    throw new Error("Item has no winning bid to void");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.bid.delete({ where: { id: top.id } });

    await tx.bidVoid.create({
      data: {
        auctionItemId: itemId,
        auctionId: item.auction.id,
        bidId: top.id,
        userId: top.userId,
        amount: top.amount,
        reason: reason ?? null,
        createdById: actorId,
      },
    });

    let newName: string | null = null;
    if (runnerUp) {
      const runnerUser = await tx.user.findUnique({
        where: { id: runnerUp.userId },
        select: { name: true },
      });
      newName = runnerUser?.name ?? null;
    }

    await tx.auctionItem.update({
      where: { id: itemId },
      data: {
        currentBid: runnerUp ? runnerUp.amount : null,
        highestBidderId: runnerUp ? runnerUp.userId : null,
        fulfillmentStatus: null,
        winnerNotified: false,
        winnerConfirmed: false,
        winnerConfirmDeadline: null,
      },
    });

    return {
      voidedBidId: top.id,
      voidedUserId: top.userId,
      voidedAmount: top.amount,
      newHighestBid: runnerUp ? runnerUp.amount : null,
      newHighestBidderId: runnerUp ? runnerUp.userId : null,
      newHighestBidderName: newName,
    };
  });

  return result;
}

/**
 * Shill/fake-bid detection (advisory, never blocks the bid).
 * Runs fire-and-forget after a bid is placed. Flags explainable patterns:
 * - R1 IP ring: other accounts sharing an IP with this bidder in the auction
 * - R2 new account concentrated on a single seller without ever winning
 * - R3 chronic raiser: many bids, never highest anywhere
 * Notifies auction owners/admins once per item per week (in-app only).
 */
export async function detectShillPatterns(
  auctionId: string,
  itemId: string,
  bidderId: string,
): Promise<void> {
  try {
    const [bidder, auction] = await Promise.all([
      prisma.user.findUnique({
        where: { id: bidderId },
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.auction.findUnique({
        where: { id: auctionId },
        select: {
          id: true,
          name: true,
          creatorId: true,
          members: {
            where: { role: { in: ["OWNER", "ADMIN"] } },
            select: { userId: true },
          },
        },
      }),
    ]);
    if (!bidder || !auction) return;

    const bids = await prisma.bid.findMany({
      where: { auctionItem: { auctionId }, userId: bidderId },
      select: { id: true, auctionItemId: true, ipHash: true },
    });
    if (bids.length < 3) return;

    const wins = await prisma.auctionItem.count({
      where: { auctionId, highestBidderId: bidderId },
    });

    const reasons: string[] = [];

    // R1: IP ring
    const ipHashes = [...new Set(bids.map((b) => b.ipHash).filter(Boolean))];
    if (ipHashes.length > 0) {
      const ring = await prisma.bid.findMany({
        where: {
          auctionItem: { auctionId },
          ipHash: { in: ipHashes as string[] },
          userId: { not: bidderId },
        },
        select: { userId: true },
      });
      const ringUsers = new Set(ring.map((r) => r.userId));
      if (ringUsers.size > 0) {
        reasons.push(
          `comparte IP con otras ${ringUsers.size} cuenta(s) que también pujan aquí`,
        );
      }
    }

    // R2: new account concentrated on a single seller, never wins
    const itemIds = [...new Set(bids.map((b) => b.auctionItemId))];
    const sellers = await prisma.auctionItem.findMany({
      where: { id: { in: itemIds } },
      select: { creatorId: true },
    });
    const sellerIds = new Set(sellers.map((s) => s.creatorId));
    if (
      Date.now() - bidder.createdAt.getTime() < 7 * 86400 * 1000 &&
      sellerIds.size === 1 &&
      wins === 0
    ) {
      reasons.push(
        "cuenta nueva que solo puja artículos de un mismo vendedor sin ganar",
      );
    }

    // R3: chronic raiser
    if (bids.length >= 5 && wins === 0) {
      reasons.push(`${bids.length} pujas sin ganar ninguna`);
    }

    if (reasons.length === 0) return;

    const owners = [
      ...new Set([
        auction.creatorId,
        ...auction.members.map((m) => m.userId),
      ]),
    ].filter((id) => id !== bidderId);
    if (owners.length === 0) return;

    // Dedup: one flag per item per week
    const recent = await prisma.notification.findFirst({
      where: {
        auctionId,
        itemId,
        type: "SHILL_SUSPECTED",
        createdAt: { gt: new Date(Date.now() - 7 * 86400 * 1000) },
      },
    });
    if (recent) return;

    const item = await prisma.auctionItem.findUnique({
      where: { id: itemId },
      select: { name: true },
    });
    await Promise.all(
      owners.map((ownerId) =>
        notificationService.notifyShillSuspected(
          ownerId,
          bidder.name,
          item?.name ?? "un artículo",
          auctionId,
          itemId,
          auction.name,
          reasons.join("; "),
        ),
      ),
    );
  } catch (err) {
    console.error("Shill detection failed:", err);
  }
}

/**
 * Winner confirms the purchase (opt-in winner-confirmation mode).
 * Only the current highest bidder of an ended item can confirm,
 * and only before the confirmation deadline.
 */
export async function confirmWinner(
  itemId: string,
  userId: string,
  auctionId?: string,
): Promise<{ confirmed: boolean }> {
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      auction: {
        select: {
          id: true,
          endDate: true,
          winnerConfirmEnabled: true,
          winnerConfirmHours: true,
        },
      },
    },
  });

  if (!item || (auctionId && item.auctionId !== auctionId)) {
    throw new Error("Item not found");
  }
  if (!item.auction.winnerConfirmEnabled) {
    throw new Error("Winner confirmation is not enabled for this auction");
  }
  if (!item.highestBidderId || item.highestBidderId !== userId) {
    throw new Error("Only the winner can confirm");
  }
  const now = new Date();
  const itemEnded = !!item.endDate && item.endDate < now;
  const auctionEnded =
    !!item.auction.endDate && item.auction.endDate < now;
  if (!itemEnded && !auctionEnded) {
    throw new Error("Item has not ended yet");
  }
  if (item.winnerConfirmed) {
    return { confirmed: true };
  }
  if (item.winnerConfirmDeadline && item.winnerConfirmDeadline < now) {
    throw new Error("Confirmation deadline has passed");
  }

  await prisma.auctionItem.update({
    where: { id: itemId },
    data: { winnerConfirmed: true },
  });
  return { confirmed: true };
}

/**
 * Auto-void unconfirmed winners past their deadline (opt-in
 * winner-confirmation mode). Runs inside processEndedItems.
 * - Items missing a deadline get one stamped first (never voided
 *   the same round it is stamped).
 * - Pre-existing winners (ended long ago, e.g. mode enabled later)
 *   get at least a 24h grace window from the stamping moment.
 * - Promoted runner-ups get a fresh full window from promotion time.
 */
export async function processUnconfirmedWinners(): Promise<number> {
  const now = new Date();
  const candidates = await prisma.auctionItem.findMany({
    where: {
      endDate: { lt: now },
      highestBidderId: { not: null },
      winnerConfirmed: false,
      winnerNotified: true,
      auction: { winnerConfirmEnabled: true },
    },
    include: {
      auction: { select: { id: true, winnerConfirmHours: true } },
    },
    take: 50,
  });

  let voided = 0;
  for (const item of candidates) {
    try {
      const hours = item.auction.winnerConfirmHours || 48;
      if (!item.winnerConfirmDeadline) {
        const endMs = item.endDate ? item.endDate.getTime() : now.getTime();
        const deadline = new Date(
          Math.max(
            endMs + hours * 3600 * 1000,
            now.getTime() + 24 * 3600 * 1000,
          ),
        );
        await prisma.auctionItem.update({
          where: { id: item.id },
          data: { winnerConfirmDeadline: deadline },
        });
        continue;
      }
      if (item.winnerConfirmDeadline < now) {
        const result = await voidWinningBid(
          item.id,
          "system",
          "Confirmation deadline passed",
          item.auction.id,
        );
        if (result.newHighestBidderId) {
          await prisma.auctionItem.update({
            where: { id: item.id },
            data: {
              winnerConfirmDeadline: new Date(
                now.getTime() + hours * 3600 * 1000,
              ),
            },
          });
        }
        voided++;
      }
    } catch (err) {
      console.error("Auto-void unconfirmed winner failed:", err);
    }
  }
  return voided;
}

/**
 * Notify outbid user (fire and forget)
 */
interface NewBidFanout {
  auctionId: string;
  itemId: string;
  itemName: string;
  bidderId: string;
  displayName: string;
  amount: number;
  currencySymbol: string;
  currencyCode: string;
  excludeUserIds: string[];
}

/**
 * Notify every auction member (except the bidder and already-notified
 * users) about a new bid. Fire and forget - must never break bidding.
 */
async function notifyMembersOfNewBid(f: NewBidFanout): Promise<void> {
  try {
    const members = await prisma.auctionMember.findMany({
      where: { auctionId: f.auctionId },
      select: { userId: true },
    });
    const displayAmount = formatCurrency(
      f.amount,
      f.currencySymbol,
      decimalsForCurrency(f.currencyCode),
    );
    const excluded = new Set([f.bidderId, ...f.excludeUserIds]);
    await Promise.all(
      members
        .map((m) => m.userId)
        .filter((id) => !excluded.has(id))
        .map((id) =>
          notificationService
            .notifyNewBid(
              id,
              f.displayName,
              f.itemName,
              f.auctionId,
              f.itemId,
              displayAmount,
            )
            .catch(() => {
              // One failed notification shouldn't block the rest
            }),
        ),
    );
  } catch {
    // Fan-out must never break bidding
  }
}

async function notifyOutbidUser(
  previousBidderId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  newAmount: number,
  normalizedAmount: number,
  currencySymbol: string,
  auctionName: string,
  currencyCode: string,
) {
  // Get previous bidder's highest bid for the outbid event
  const previousBid = await prisma.bid.findFirst({
    where: { auctionItemId: itemId, userId: previousBidderId },
    orderBy: { amount: "desc" },
    select: { amount: true },
  });

  // Publish realtime outbid event to user's private channel
  const outbidEvent: BidOutbidEvent = {
    itemId,
    itemName,
    auctionId,
    auctionName,
    newHighestBid: newAmount,
    currencyCode,
    yourBid: previousBid?.amount || 0,
  };
  publish(
    Channels.privateUser(previousBidderId),
    Events.BID_OUTBID,
    outbidEvent,
  );
  try {
    // In-app notification
    await notificationService.notifyOutbid(
      previousBidderId,
      itemName,
      auctionId,
      itemId,
      newAmount,
      currencySymbol,
      normalizedAmount,
      currencyCode,
    );

    // Get previous bidder info for email
    const previousBidder = await prisma.user.findUnique({
      where: { id: previousBidderId },
      select: { email: true, name: true },
    });

    if (previousBidder) {
      // Queue outbid email (await to ensure it completes on serverless)
      await queueOutbidEmail({
        previousBidderId,
        previousBidderEmail: previousBidder.email,
        previousBidderName: previousBidder.name || "",
        itemId,
        itemName,
        auctionId,
        auctionName,
        newAmount,
        currencySymbol,
        normalizedAmount,
      });
    }
  } catch (err) {
    console.error("Failed to notify outbid user:", err);
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Calculate minimum bid for an item
 */
export function calculateMinBid(
  currentBid: number | null,
  startingBid: number,
  minBidIncrement: number,
): number {
  return currentBid ? currentBid + minBidIncrement : startingBid;
}

/**
 * Validate bid amount
 */
export function validateBidAmount(
  amount: number,
  currentBid: number | null,
  startingBid: number,
  minBidIncrement: number,
): { valid: boolean; minBid: number } {
  const minBid = calculateMinBid(currentBid, startingBid, minBidIncrement);
  return {
    valid: amount >= minBid,
    minBid,
  };
}
