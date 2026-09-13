import { prisma } from "@/lib/prisma";
import * as notificationService from "./notification.service";

// ============================================================================
// Types
// ============================================================================

export type RatingRole = "BUYER" | "SELLER";

/** Blind window: ratings reveal when both sides rate, or after 7 days. */
export const RATING_REVEAL_DAYS = 7;

export interface RatingForDisplay {
  id: string;
  role: RatingRole;
  score: number | null;
  comment: string | null;
  revealed: boolean;
  createdAt: string;
  rater: { id: string; name: string | null } | null;
  mine: boolean;
}

export interface UserScore {
  avgSellerRating: number | null;
  sellerRatingCount: number;
  avgBuyerRating: number | null;
  buyerRatingCount: number;
  recent: Array<{
    id: string;
    role: RatingRole;
    score: number;
    comment: string | null;
    createdAt: string;
    raterName: string | null;
    itemId: string;
    itemName: string;
  }>;
}

// ============================================================================
// Write
// ============================================================================

/**
 * Rate your counterpart after a delivered deal (one per side per item).
 * - Only on DELIVERED items, only between winner and creator.
 * - Blind: stays hidden until the counterpart also rates (or 7 days pass).
 * - Denormalized averages count REVEALED ratings only, so a blind score
 *   never leaks through the public average; averages refresh on reveal.
 */
export async function upsertRating(
  itemId: string,
  raterId: string,
  score: number,
  comment?: string | null,
  auctionId?: string,
): Promise<{ ratingId: string; revealed: boolean }> {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("Score must be an integer between 1 and 5");
  }

  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      name: true,
      auctionId: true,
      creatorId: true,
      highestBidderId: true,
      fulfillmentStatus: true,
    },
  });

  if (!item || (auctionId && item.auctionId !== auctionId)) {
    throw new Error("Item not found");
  }
  if (item.fulfillmentStatus !== "DELIVERED") {
    throw new Error("Only delivered items can be rated");
  }
  if (!item.highestBidderId) {
    throw new Error("Item has no winner to rate");
  }

  // Determine ratee + role from who is rating
  let rateeId: string;
  let role: RatingRole;
  if (raterId === item.highestBidderId) {
    rateeId = item.creatorId;
    role = "SELLER";
  } else if (raterId === item.creatorId) {
    rateeId = item.highestBidderId;
    role = "BUYER";
  } else {
    throw new Error("Only the winner and the creator can rate this deal");
  }

  const cleanComment = comment?.trim().slice(0, 500) || null;

  const rating = await prisma.rating.upsert({
    where: {
      auctionItemId_raterId_role: { auctionItemId: itemId, raterId, role },
    },
    update: { score, comment: cleanComment },
    create: {
      auctionItemId: itemId,
      auctionId: item.auctionId,
      raterId,
      rateeId,
      role,
      score,
      comment: cleanComment,
    },
  });

  await recomputeUserScore(rateeId);

  // Reveal: if the counterpart already rated, reveal both + notify them
  const counterpart = await prisma.rating.findFirst({
    where: {
      auctionItemId: itemId,
      raterId: rateeId,
      rateeId: raterId,
    },
  });

  let revealed = false;
  if (counterpart) {
    await prisma.rating.updateMany({
      where: { auctionItemId: itemId },
      data: { revealed: true },
    });
    revealed = true;
    // Both sides just revealed: refresh averages for the two of them
    await recomputeUserScore(rateeId).catch(() => undefined);
    await recomputeUserScore(raterId).catch(() => undefined);
    const rater = await prisma.user.findUnique({
      where: { id: raterId },
      select: { name: true },
    });
    await notificationService
      .notifyRatingReceived(
        rateeId,
        rater?.name ?? null,
        score,
        item.name,
        item.auctionId,
        itemId,
      )
      .catch(() => undefined);
  }

  return { ratingId: rating.id, revealed };
}

/**
 * Recompute denormalized averages for a user (both roles).
 * Only revealed ratings count, so blind scores never leak via averages.
 */
export async function recomputeUserScore(userId: string): Promise<void> {
  for (const role of ["SELLER", "BUYER"] as const) {
    const agg = await prisma.rating.aggregate({
      where: { rateeId: userId, role, revealed: true },
      _avg: { score: true },
      _count: true,
    });
    await prisma.user.update({
      where: { id: userId },
      data:
        role === "SELLER"
          ? {
              avgSellerRating: agg._avg.score,
              sellerRatingCount: agg._count,
            }
          : {
              avgBuyerRating: agg._avg.score,
              buyerRatingCount: agg._count,
            },
    });
  }
}

/**
 * Time-based reveal for ratings older than the blind window.
 * Runs inside processEndedItems (notification polling).
 */
export async function revealDueRatings(): Promise<number> {
  const cutoff = new Date(Date.now() - RATING_REVEAL_DAYS * 86400 * 1000);
  const start = new Date();
  const r = await prisma.rating.updateMany({
    where: { revealed: false, createdAt: { lt: cutoff } },
    data: { revealed: true },
  });
  if (r.count > 0) {
    // Refresh averages of everyone revealed by this run
    const touched = await prisma.rating.findMany({
      where: { revealed: true, updatedAt: { gte: start } },
      select: { rateeId: true },
      take: 500,
    });
    const ratees = [...new Set(touched.map((t) => t.rateeId))];
    await Promise.all(
      ratees.map((id) => recomputeUserScore(id).catch(() => undefined)),
    );
  }
  return r.count;
}

// ============================================================================
// Read
// ============================================================================

/**
 * Ratings for an item as seen by a viewer.
 * Own ratings fully visible; others only when revealed.
 */
export async function getItemRatings(
  itemId: string,
  viewerId: string,
  auctionId?: string,
): Promise<{ ratings: RatingForDisplay[]; myRating: RatingForDisplay | null }> {
  if (auctionId) {
    const item = await prisma.auctionItem.findUnique({
      where: { id: itemId },
      select: { auctionId: true },
    });
    if (!item || item.auctionId !== auctionId) throw new Error("Item not found");
  }
  const rows = await prisma.rating.findMany({
    where: { auctionItemId: itemId },
    include: { rater: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const ratings: RatingForDisplay[] = rows.map((r) => {
    const mine = r.raterId === viewerId;
    if (mine || r.revealed) {
      return {
        id: r.id,
        role: r.role as RatingRole,
        score: r.score,
        comment: r.comment,
        revealed: r.revealed,
        createdAt: r.createdAt.toISOString(),
        rater: { id: r.rater.id, name: r.rater.name },
        mine,
      };
    }
    return {
      id: r.id,
      role: r.role as RatingRole,
      score: null,
      comment: null,
      revealed: false,
      createdAt: r.createdAt.toISOString(),
      rater: null,
      mine: false,
    };
  });

  return { ratings, myRating: ratings.find((r) => r.mine) ?? null };
}

/**
 * Public score + recent revealed reviews for a user.
 */
export async function getUserScore(userId: string): Promise<UserScore> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avgSellerRating: true,
      sellerRatingCount: true,
      avgBuyerRating: true,
      buyerRatingCount: true,
    },
  });
  if (!user) throw new Error("User not found");

  const recent = await prisma.rating.findMany({
    where: { rateeId: userId, revealed: true },
    include: {
      rater: { select: { name: true } },
      auctionItem: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return {
    avgSellerRating: user.avgSellerRating,
    sellerRatingCount: user.sellerRatingCount,
    avgBuyerRating: user.avgBuyerRating,
    buyerRatingCount: user.buyerRatingCount,
    recent: recent.map((r) => ({
      id: r.id,
      role: r.role as RatingRole,
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      raterName: r.rater.name,
      itemId: r.auctionItem.id,
      itemName: r.auctionItem.name,
    })),
  };
}
