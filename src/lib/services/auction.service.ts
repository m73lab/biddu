import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/storage";
import * as memberService from "./member.service";
import * as itemService from "./item.service";
import { MemberRole } from "@/generated/prisma/enums";
import type { Auction, AuctionMember } from "@/generated/prisma/client";
import { publish, Channels, Events } from "@/lib/realtime";
import type {
  ItemEndedEvent,
  AuctionClosedEvent,
} from "@/lib/realtime/events";

// ============================================================================
// Types
// ============================================================================

export interface AuctionWithCounts extends Auction {
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

export interface AuctionListItem {
  id: string;
  name: string;
  description: string | null;
  endDate: string | null;
  timeZone: string;
  createdAt: string;
  role: string;
  thumbnailUrl: string | null;
  _count: {
    items: number;
    members: number;
  };
}

export interface CreateAuctionInput {
  name: string;
  description?: string | null;
  joinMode?: "FREE" | "INVITE_ONLY" | "LINK";
  memberCanInvite?: boolean;
  bidderVisibility?: "VISIBLE" | "ANONYMOUS" | "PER_BID";
  endDate?: string | null;
  timeZone?: string;
  itemEndMode?: "AUCTION_END" | "CUSTOM" | "NONE";
  defaultAntiSnipe?: boolean;
  defaultAntiSnipeThreshold?: number;
  defaultAntiSnipeExtension?: number;
}

export interface UpdateAuctionInput {
  name?: string;
  description?: string | null;
  joinMode?: "FREE" | "INVITE_ONLY" | "LINK";
  memberCanInvite?: boolean;
  bidderVisibility?: "VISIBLE" | "ANONYMOUS" | "PER_BID";
  itemEndMode?: "AUCTION_END" | "CUSTOM" | "NONE";
  endDate?: string | null;
  timeZone?: string | null;
  defaultItemsEditableByAdmin?: boolean;
  defaultAntiSnipe?: boolean;
    defaultAntiSnipeThreshold?: number;
    defaultAntiSnipeExtension?: number;
    bidderApproval?: boolean;
    winnerConfirmEnabled?: boolean;
    winnerConfirmHours?: number;
  }

  export interface AuctionDetailForPage {
  id: string;
  name: string;
  description: string | null;
  joinMode: string;
  memberCanInvite: boolean;
  bidderVisibility: string;
  endDate: string | null;
  timeZone: string;
  itemEndMode: string;
  inviteToken: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  defaultItemsEditableByAdmin: boolean;
  defaultAntiSnipe: boolean;
  defaultAntiSnipeThreshold: number;
  defaultAntiSnipeExtension: number;
  bidderApproval: boolean;
  winnerConfirmEnabled: boolean;
  winnerConfirmHours: number;
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

export interface CloseAuctionResult {
  auction: {
    id: string;
    name: string;
    endDate: string | undefined;
  };
  winners: Array<{
    itemId: string;
    itemName: string;
    winningBid: number;
    winner: {
      id: string;
      name: string | null;
      email: string;
    };
    currencyCode: string;
  }>;
  totalItems: number;
  itemsWithBids: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get auction by ID with creator and counts
 */
export async function getAuctionById(
  auctionId: string,
): Promise<AuctionWithCounts | null> {
  return prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });
}

/**
 * Get auction for detail page with all necessary data
 */
export async function getAuctionForDetailPage(
  auctionId: string,
): Promise<AuctionDetailForPage | null> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });

    if (!auction) return null;

    return {
      ...auction,
      endDate: auction.endDate?.toISOString() || null,
      createdAt: auction.createdAt.toISOString(),
      updatedAt: auction.updatedAt.toISOString(),
      thumbnailUrl: auction.thumbnailUrl
        ? getPublicUrl(auction.thumbnailUrl)
        : null,
    };
  }

  export interface AuctionDetailsPayload {
    auction: AuctionDetailForPage;
    items: Awaited<
      ReturnType<typeof itemService.getAuctionItemsForListPage>
    >;
  }

  /**
   * Full detail payload for the auction page, shared by SSR (as SWR
   * fallbackData) and GET /api/auctions/[id]/details. One function =
   * one round of queries, no duplicated logic between page and API.
   * Items lists are quota-capped (a few dozen max), so no pagination.
   * (No retention block: slots don't exist in this build.)
   */
  export async function getAuctionDetailsData(
    auctionId: string,
    userId: string,
  ): Promise<AuctionDetailsPayload | null> {
    const auction = await getAuctionForDetailPage(auctionId);

    if (!auction) return null;

    const items = await itemService.getAuctionItemsForListPage(
      auctionId,
      userId,
    );

    return { auction, items };
  }

/**
 * Get all auctions for a user (as member)
 */
export async function getUserAuctions(
  userId: string,
): Promise<AuctionListItem[]> {
  const memberships = await prisma.auctionMember.findMany({
    where: { userId },
    include: {
      auction: {
        include: {
          _count: {
            select: {
              items: true,
              members: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.auction.id,
    name: m.auction.name,
    description: m.auction.description,
    endDate: m.auction.endDate?.toISOString() || null,
    timeZone: m.auction.timeZone,
    createdAt: m.auction.createdAt.toISOString(),
    role: m.role,
    thumbnailUrl: m.auction.thumbnailUrl
      ? getPublicUrl(m.auction.thumbnailUrl)
      : null,
    _count: m.auction._count,
  }));
}

/**
 * Get open auctions that user is not a member of
 */
export async function getOpenAuctionsForUser(
  userId: string,
): Promise<AuctionListItem[]> {
  const [memberAuctionIds, leftAuctionIds] = await Promise.all([
    prisma.auctionMember.findMany({
      where: { userId },
      select: { auctionId: true },
    }),
    prisma.auctionLeave.findMany({
      where: { userId },
      select: { auctionId: true },
    }),
  ]);

  const memberIds = new Set(memberAuctionIds.map((m) => m.auctionId));
  const leftIds = new Set(leftAuctionIds.map((l) => l.auctionId));

  const openAuctions = await prisma.auction.findMany({
    where: {
      joinMode: "FREE",
      id: { notIn: [...memberIds] },
    },
    include: {
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });

  return openAuctions.map((auction) => ({
    id: auction.id,
    name: auction.name,
    description: auction.description,
    endDate: auction.endDate?.toISOString() || null,
    timeZone: auction.timeZone,
    createdAt: auction.createdAt.toISOString(),
    role: leftIds.has(auction.id) ? "Left" : "Open",
    thumbnailUrl: auction.thumbnailUrl
      ? getPublicUrl(auction.thumbnailUrl)
      : null,
    _count: auction._count,
  }));
}

/**
 * Get user's membership for an auction
 */
export async function getUserMembership(
  auctionId: string,
  userId: string,
): Promise<AuctionMember | null> {
  return prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId,
      },
    },
  });
}

/**
 * Get user's membership with auction details
 */
export async function getUserMembershipWithAuction(
  auctionId: string,
  userId: string,
) {
  return prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId,
      },
    },
    include: {
      auction: true,
    },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a new auction with the creator as owner
 */
export async function createAuction(
  creatorId: string,
  input: CreateAuctionInput,
): Promise<AuctionWithCounts> {
  return prisma.auction.create({
    data: {
      name: input.name,
      description: input.description || null,
      joinMode: input.joinMode || "INVITE_ONLY",
      memberCanInvite: input.memberCanInvite || false,
      bidderVisibility: input.bidderVisibility || "VISIBLE",
      endDate: input.endDate ? new Date(input.endDate) : null,
      timeZone: input.timeZone || "America/Santiago",
      itemEndMode: input.itemEndMode || "CUSTOM",
      defaultAntiSnipe: input.defaultAntiSnipe ?? false,
      defaultAntiSnipeThreshold: input.defaultAntiSnipeThreshold ?? 300,
      defaultAntiSnipeExtension: input.defaultAntiSnipeExtension ?? 300,
      creatorId,
      members: {
        create: {
          userId: creatorId,
          role: "OWNER",
        },
      },
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });
}

/**
 * Update an auction
 */
export async function updateAuction(
  auctionId: string,
  input: UpdateAuctionInput,
): Promise<Auction> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.joinMode !== undefined) updateData.joinMode = input.joinMode;
  if (input.memberCanInvite !== undefined)
    updateData.memberCanInvite = input.memberCanInvite;
  if (input.bidderVisibility !== undefined)
    updateData.bidderVisibility = input.bidderVisibility;
  if (input.itemEndMode !== undefined)
    updateData.itemEndMode = input.itemEndMode;
  if (input.endDate !== undefined) {
    updateData.endDate = input.endDate ? new Date(input.endDate) : null;
  }
  if (input.timeZone !== undefined) {
    updateData.timeZone = input.timeZone || "America/Santiago";
  }
  if (input.defaultItemsEditableByAdmin !== undefined) {
    updateData.defaultItemsEditableByAdmin = input.defaultItemsEditableByAdmin;
  }
  if (input.defaultAntiSnipe !== undefined) {
    updateData.defaultAntiSnipe = input.defaultAntiSnipe;
  }
  if (input.defaultAntiSnipeThreshold !== undefined) {
    updateData.defaultAntiSnipeThreshold = input.defaultAntiSnipeThreshold;
  }
  if (input.defaultAntiSnipeExtension !== undefined) {
    updateData.defaultAntiSnipeExtension = input.defaultAntiSnipeExtension;
  }
  if (input.bidderApproval !== undefined) {
    updateData.bidderApproval = input.bidderApproval;
  }
  if (input.winnerConfirmEnabled !== undefined) {
    updateData.winnerConfirmEnabled = input.winnerConfirmEnabled;
  }
  if (input.winnerConfirmHours !== undefined) {
    updateData.winnerConfirmHours = input.winnerConfirmHours;
  }

  // Previous end date, needed to propagate date changes to items below
  const current =
    input.endDate !== undefined
      ? await prisma.auction.findUnique({
          where: { id: auctionId },
          select: { endDate: true },
        })
      : null;

  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: updateData,
  });

  // Propagate auction end-date changes to its lots:
  // - items following the old auction end date adopt the new one
  //   (same instant ±60s: exact copies, cascade writes, or picker
  //   values rounded to the minute all count as "following it")
  // - items beyond the new end are clamped to it (never past the cap)
  // - custom earlier dates and dateless items are left untouched
  if (input.endDate !== undefined) {
    await syncItemsToAuctionEnd(
      auctionId,
      current?.endDate ?? null,
      input.endDate ? new Date(input.endDate) : null,
    );
  }

  return updated;
}

/**
 * Align item end dates with a new auction end date (see updateAuction).
 */
export async function syncItemsToAuctionEnd(
  auctionId: string,
  oldEnd: Date | null,
  newEnd: Date | null,
): Promise<number> {
  const oldMs = oldEnd ? oldEnd.getTime() : null;
  const newMs = newEnd ? newEnd.getTime() : null;
  if (oldMs === newMs) return 0;

  const FOLLOW_TOLERANCE_MS = 60 * 1000;
  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    select: { id: true, endDate: true },
  });

  const toUpdate: string[] = [];
  for (const item of items) {
    if (!item.endDate) continue;
    const t = item.endDate.getTime();
    const followsOld =
      oldMs !== null && Math.abs(t - oldMs) <= FOLLOW_TOLERANCE_MS;
    const exceedsNew = newMs !== null && t > newMs;
    if (followsOld || exceedsNew) toUpdate.push(item.id);
  }

  if (toUpdate.length === 0) return 0;
  const r = await prisma.auctionItem.updateMany({
    where: { id: { in: toUpdate } },
    data: { endDate: newEnd },
  });
  return r.count;
}

/**
 * Delete an auction
 */
export async function deleteAuction(auctionId: string): Promise<void> {
  await prisma.auction.delete({
    where: { id: auctionId },
  });
}

/**
 * Close an auction and all its items
 */
export async function closeAuction(
  auctionId: string,
): Promise<CloseAuctionResult> {
  // Get all items with their highest bids
  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      bids: {
        orderBy: { amount: "desc" },
        take: 1,
        include: {
          currencyProfile: {
            select: {
              id: true,
              symbol: true,
              inputMode: true,
              fractionMode: true,
              precision: true,
              denominationConfig: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  // Close the auction by setting end date to now
  const auction = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      endDate: new Date(),
    },
  });

  // Release slots bound to this auction back to the unassigned pool.
  // They keep their own expiry; they just stop being tied to a
  // finished auction so they can be reused elsewhere.
  await prisma.slotRedemption.updateMany({
    where: { auctionId },
    data: { auctionId: null },
  });

  // Close all items that haven't ended yet
  const now = new Date();
  await prisma.auctionItem.updateMany({
    where: {
      auctionId,
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    data: {
      endDate: now,
    },
  });

  // Prepare winners summary
  const winners = items
    .filter((item) => item.bids.length > 0)
    .map((item) => ({
      itemId: item.id,
      itemName: item.name,
      winningBid: item.bids[0].amount,
      winner: item.bids[0].user,
      currencyCode: item.currencyCode,
    }));

  // Broadcast realtime events so open views flip to the ended state live:
  // - item:ended on each item channel (per-item watchers) and the auction
  //   channel (so the overview and other members' sidebars update).
  // - auction:closed on the auction channel (member overview).
  for (const item of items) {
    const topBid = item.bids[0] ?? null;
    const itemEndedEvent: ItemEndedEvent = {
      itemId: item.id,
      auctionId,
      itemName: item.name,
      winnerId: topBid?.user.id ?? null,
      winnerName: topBid?.user.name ?? null,
      winningBid: topBid?.amount ?? null,
      currencyCode: item.currencyCode,
    };
    publish(Channels.item(item.id), Events.ITEM_ENDED, itemEndedEvent);
    publish(
      Channels.privateAuction(auctionId),
      Events.ITEM_ENDED,
      itemEndedEvent,
    );
  }

  const auctionClosedEvent: AuctionClosedEvent = {
    auctionId,
    name: auction.name,
  };
  publish(
    Channels.privateAuction(auctionId),
    Events.AUCTION_CLOSED,
    auctionClosedEvent,
  );

  return {
    auction: {
      id: auction.id,
      name: auction.name,
      endDate: auction.endDate?.toISOString(),
    },
    winners,
    totalItems: items.length,
    itemsWithBids: winners.length,
  };
}

/**
 * Check if a user has previously left an auction voluntarily
 */
export async function hasUserLeftAuction(
  auctionId: string,
  userId: string,
): Promise<boolean> {
  const leave = await prisma.auctionLeave.findUnique({
    where: { auctionId_userId: { auctionId, userId } },
  });
  return !!leave;
}

/**
 * Auto-join user to an open/link auction.
 * Returns null if the user previously left this auction voluntarily.
 */
export async function autoJoinAuction(
  auctionId: string,
  userId: string,
): Promise<AuctionMember | null> {
  // Don't auto-rejoin if the user previously left voluntarily
  const hasLeft = await hasUserLeftAuction(auctionId, userId);
  if (hasLeft) {
    return null;
  }

  // Banned users cannot join
  if (await memberService.isUserBanned(auctionId, userId)) {
    return null;
  }

  // Bidder-approval mode: join as PENDING until an owner/admin approves
  const targetAuction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { bidderApproval: true },
  });

  return prisma.auctionMember.create({
    data: {
      auctionId,
      userId,
      role: targetAuction?.bidderApproval
        ? MemberRole.PENDING
        : MemberRole.BIDDER,
    },
  });
}

/**
 * Rejoin a public auction the user previously left.
 * Clears the AuctionLeave record and creates a new membership atomically.
 */
export async function rejoinAuction(
  auctionId: string,
  userId: string,
): Promise<AuctionMember> {
  return prisma.$transaction(async (tx) => {
    // Verify the auction exists and is joinable
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        select: { joinMode: true, bidderApproval: true },
      });
    if (!auction) {
      throw new Error("AUCTION_NOT_FOUND");
    }
    if (auction.joinMode !== "FREE" && auction.joinMode !== "LINK") {
      throw new Error("NOT_PUBLIC_AUCTION");
    }

    // Verify user actually has a leave record
    const leave = await tx.auctionLeave.findUnique({
      where: { auctionId_userId: { auctionId, userId } },
    });
    if (!leave) {
      throw new Error("NOT_LEFT");
    }

    // Banned users cannot rejoin
    const banned = await tx.auctionBan.findUnique({
      where: { auctionId_userId: { auctionId, userId } },
    });
    if (banned) {
      throw new Error("BANNED_FROM_AUCTION");
    }

    // Verify not already a member
    const existing = await tx.auctionMember.findUnique({
      where: { auctionId_userId: { auctionId, userId } },
    });
    if (existing) {
      throw new Error("ALREADY_MEMBER");
    }

    // Clear leave record and create membership
    // Bidder-approval mode: rejoin as PENDING until approved
    await tx.auctionLeave.delete({
      where: { auctionId_userId: { auctionId, userId } },
    });

    return tx.auctionMember.create({
      data: {
        auctionId,
        userId,
        role: auction.bidderApproval ? MemberRole.PENDING : MemberRole.BIDDER,
      },
    });
  });
}

/**
 * Get auction results data for results page
 * @param isAdmin - If true, show winner info even for anonymous bids (for auction owners)
 */
export async function getAuctionResultsData(
  auctionId: string,
  userId: string,
  isAdmin: boolean = false,
) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  });

  if (!auction) return null;

  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      currency: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
      bids: {
        orderBy: { amount: "desc" },
        take: 1,
        include: {
          currencyProfile: {
            select: {
              id: true,
              symbol: true,
              inputMode: true,
              fractionMode: true,
              precision: true,
              denominationConfig: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { bids: true },
      },
    },
  });

  const totalBids = items.reduce((sum, item) => sum + item._count.bids, 0);

  const winners = items
    .filter((item) => item.bids.length > 0)
    .map((item) => {
      const isItemCreator = item.creatorId === userId;
      // Show winner info if: admin, or item creator (so they can contact winner)
      const canSeeWinner = isAdmin || isItemCreator || !item.bidderAnonymous;
      return {
        itemId: item.id,
        itemName: item.name,
        thumbnailUrl: item.images[0]?.url
          ? getPublicUrl(item.images[0].url)
          : null,
        winningBid: item.bids[0].amount,
        normalizedWinningBid: item.bids[0].normalizedAmount,
        enteredRepresentation: item.bids[0].enteredRepresentation,
        currencyCode: item.currencyCode,
        currencySymbol: item.currency.symbol,
        currencyProfile: item.bids[0].currencyProfile,
        winner: canSeeWinner ? item.bids[0].user : null,
        isCurrentUser: item.bids[0].userId === userId,
        isItemCreator,
      };
    });

  const userWins = winners.filter((w) => w.isCurrentUser);

  const unsoldItems = items
    .filter((item) => item.bids.length === 0)
    .map((item) => ({
      itemId: item.id,
      itemName: item.name,
      thumbnailUrl: item.images[0]?.url
        ? getPublicUrl(item.images[0].url)
        : null,
      isItemCreator: item.creatorId === userId,
    }));

  const isEnded = auction.endDate
    ? new Date(auction.endDate) < new Date()
    : false;

  return {
    auction: {
      id: auction.id,
      name: auction.name,
      description: auction.description,
      endDate: auction.endDate?.toISOString() || null,
      timeZone: auction.timeZone,
      isEnded,
    },
    winners,
    userWins,
    unsoldItems,
    totalItems: items.length,
    totalBids,
  };
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user is owner of auction
 */
export function isOwner(membership: AuctionMember | null): boolean {
  return membership?.role === "OWNER";
}

/**
 * Check if user is admin (owner or admin role)
 */
export function isAdmin(membership: AuctionMember | null): boolean {
  return membership?.role === "OWNER" || membership?.role === "ADMIN";
}

/**
 * Check if user can create items
 */
export function canCreateItems(membership: AuctionMember | null): boolean {
  return ["OWNER", "ADMIN", "CREATOR"].includes(membership?.role || "");
}

/**
 * Check if auction allows open join
 */
export function canAutoJoin(auction: Auction): boolean {
  return auction.joinMode === "FREE" || auction.joinMode === "LINK";
}

// ============================================================================
// Public Access Functions (for OG tags / social sharing)
// ============================================================================

export interface PublicAuctionData {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  endDate: string | null;
  timeZone: string;
  joinMode: string;
  creatorName: string | null;
  _count: {
    items: number;
    members: number;
  };
}

/**
 * Get public auction data for OG tags and social sharing.
 * Only returns data for auctions that are publicly accessible (FREE or LINK join mode).
 */
export async function getPublicAuctionData(
  auctionId: string,
): Promise<PublicAuctionData | null> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      creator: {
        select: { name: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });

  // Public share preview: any auction the owner chooses to share can be
  // previewed (id is a non-enumerable cuid). Privacy-sensitive fields are
  // not exposed; the CTA still routes through login/membership.
  if (!auction) {
    return null;
  }

  return {
    id: auction.id,
    name: auction.name,
    description: auction.description,
    thumbnailUrl: auction.thumbnailUrl
      ? getPublicUrl(auction.thumbnailUrl)
      : null,
    endDate: auction.endDate?.toISOString() || null,
    timeZone: auction.timeZone,
    joinMode: auction.joinMode,
    creatorName: auction.creator.name,
    _count: auction._count,
  };
}
