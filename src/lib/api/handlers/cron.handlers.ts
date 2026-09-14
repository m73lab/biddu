import { ApiHandler, Middleware } from "../types";
import { UnauthorizedError } from "../errors";
import { retryFailedEmails, processPendingEmails } from "@/lib/email";

// ============================================================================
// Cron Middleware
// ============================================================================

/**
 * Verify cron secret for security (Vercel Cron sends this header)
 */
export const withCronSecret: Middleware = (next) => async (req, res, ctx) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // In production, require CRON_SECRET to be configured
  if (!cronSecret && process.env.NODE_ENV === "production") {
    throw new Error("CRON_SECRET not configured in production");
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw new UnauthorizedError("Invalid cron secret");
  }

  return next(req, res, ctx);
};

// ============================================================================
// Email Retry Handler
// ============================================================================

export const retryEmails: ApiHandler = async (_req, res) => {
  // First process any pending emails
  const pendingResult = await processPendingEmails();

  // Then retry failed emails
  const retryResult = await retryFailedEmails();

  return res.status(200).json({
    ok: true,
    pending: pendingResult,
    retried: retryResult,
    timestamp: new Date().toISOString(),
  });
};

// ============================================================================
// Auction-End Handler (ended items, cascade-close, slot release)
// ============================================================================

/**
 * Process everything that must happen when auctions end. Runs on a
 * schedule instead of piggybacking on notification polling, so N app
 * replicas don't run it N times.
 */
export const runAuctionEnd: ApiHandler = async (_req, res) => {
  const { processEndedItems, closeItemsOfEndedAuctions, releaseSlotsOfEndedAuctions } =
    await import("@/lib/services/auction-end.service");

  const ended = await processEndedItems();
  const [closed, released] = await Promise.all([
    closeItemsOfEndedAuctions(),
    releaseSlotsOfEndedAuctions(),
  ]);

  return res.status(200).json({
    ok: true,
    ended,
    closed,
    released,
    timestamp: new Date().toISOString(),
  });
};
