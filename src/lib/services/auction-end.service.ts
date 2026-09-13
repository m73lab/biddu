import { prisma } from "@/lib/prisma";
import * as notificationService from "./notification.service";
import { processUnconfirmedWinners } from "./bid.service";
import { revealDueRatings } from "./rating.service";
import { queueItemWonEmail } from "@/lib/email/service";
import { createLogger } from "@/lib/logger";

const auctionEndLogger = createLogger("auction-end");

/**
 * Process items that have ended but winner hasn't been notified yet.
 * This runs as a background task triggered by notification polling.
 */
export async function processEndedItems(): Promise<number> {
  try {
    // Find items that:
    // 1. Have ended (endDate < now)
    // 2. Have a winner (highestBidderId exists)
    // 3. Winner hasn't been notified yet
    const endedItems = await prisma.auctionItem.findMany({
      where: {
        endDate: { lt: new Date() },
        highestBidderId: { not: null },
        winnerNotified: false,
      },
      include: {
        currency: { select: { symbol: true, code: true } },
        auction: { select: { id: true, name: true } },
      },
      take: 50, // Process max 50 at a time to avoid long-running queries
    });

    if (endedItems.length > 0) {
      auctionEndLogger.info(
        { count: endedItems.length },
        "Processing ended items",
      );

      // Process each ended item
      await Promise.all(
        endedItems.map(async (item) => {
          try {
            // Create winner notification (in-app)
            await notificationService.notifyAuctionWon(
              item.highestBidderId!,
              item.name,
              item.auction.id,
              item.id,
              item.currentBid!,
              item.currency.symbol,
              undefined,
              item.currency.code,
            );

            // Fetch winner info for email
            const winner = await prisma.user.findUnique({
              where: { id: item.highestBidderId! },
              select: { id: true, email: true, name: true },
            });

            // Queue item won email (respects user preference)
            if (winner) {
              await queueItemWonEmail({
                winnerId: winner.id,
                winnerEmail: winner.email,
                winnerName: winner.name,
                itemId: item.id,
                itemName: item.name,
                auctionId: item.auction.id,
                auctionName: item.auction.name,
                winningAmount: item.currentBid!,
                currencySymbol: item.currency.symbol,
              });
            }

            // Mark as notified
            await prisma.auctionItem.update({
              where: { id: item.id },
              data: { winnerNotified: true },
            });

            auctionEndLogger.debug(
              { itemId: item.id, winnerId: item.highestBidderId },
              "Processed ended item",
            );
          } catch (err) {
            auctionEndLogger.error(
              { err, itemId: item.id },
              "Failed to notify winner for item",
            );
          }
        }),
      );

      auctionEndLogger.info(
        { processed: endedItems.length },
        "Completed processing ended items",
      );
    }

    // Items that ended with NO bids: notify the creator once (in-app only).
    // winnerNotified doubles as the "end-of-life processed" flag here.
    const bidlessItems = await prisma.auctionItem.findMany({
      where: {
        endDate: { lt: new Date() },
        highestBidderId: null,
        winnerNotified: false,
      },
      include: {
        auction: { select: { id: true, name: true } },
      },
      take: 50,
    });

    await Promise.all(
      bidlessItems.map(async (item) => {
        try {
          await notificationService.notifyItemEndedNoBids(
            item.creatorId,
            item.name,
            item.auction.id,
            item.id,
            item.auction.name,
          );
          await prisma.auctionItem.update({
            where: { id: item.id },
            data: { winnerNotified: true },
          });
          auctionEndLogger.debug(
            { itemId: item.id },
            "Notified creator of bidless ended item",
          );
        } catch (err) {
          auctionEndLogger.error(
            { err, itemId: item.id },
            "Failed to notify creator for bidless item",
          );
        }
      }),
    );

    // Winner-confirmation mode: auto-void unconfirmed winners past
    // their deadline (passes to runner-up with a fresh window).
    const autoVoided = await processUnconfirmedWinners().catch((err) => {
      auctionEndLogger.error({ err }, "Failed to auto-void unconfirmed");
      return 0;
    });

    // Ratings blind window: reveal ratings older than 7 days.
    const revealed = await revealDueRatings().catch((err) => {
      auctionEndLogger.error({ err }, "Failed to reveal due ratings");
      return 0;
    });

    return endedItems.length + bidlessItems.length + autoVoided + revealed;
  } catch (err) {
    auctionEndLogger.error({ err }, "Failed to process ended items");
    return 0;
  }
}

/**
 * Cascade-close: lots of an ended auction must end too.
 * Sets endDate = auction endDate on items that are still open
 * (no date, or a date beyond the auction end). This runs as a
 * background task alongside processEndedItems (notification polling),
 * so time-based auction ends propagate even without manual close.
 */
export async function closeItemsOfEndedAuctions(): Promise<number> {
  try {
    const now = new Date();
    const endedAuctions = await prisma.auction.findMany({
      where: {
        endDate: { lt: now },
        items: {
          some: { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        },
      },
      select: { id: true, endDate: true },
    });

    if (endedAuctions.length === 0) {
      return 0;
    }

    let closed = 0;
    await Promise.all(
      endedAuctions.map(async (a) => {
        const r = await prisma.auctionItem.updateMany({
          where: {
            auctionId: a.id,
            OR: [{ endDate: null }, { endDate: { gt: a.endDate! } }],
          },
          data: { endDate: a.endDate! },
        });
        closed += r.count;
      }),
    );

    if (closed > 0) {
      auctionEndLogger.info(
        { closed, auctions: endedAuctions.length },
        "Cascade-closed items of ended auctions",
      );
    }

    return closed;
  } catch (err) {
    auctionEndLogger.error({ err }, "Failed to cascade-close items");
    return 0;
  }
}
