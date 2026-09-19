import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api/errors";
import * as bidService from "@/lib/services/bid.service";
import * as itemService from "@/lib/services/item.service";
import * as memberService from "@/lib/services/member.service";
import * as auctionCurrencyService from "@/lib/services/auction-currency.service";
import {
  normalizeBidValue,
  evaluateBidRules,
} from "@/lib/services/auction-currency-rule.service";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/api/middleware/rate-limit";
import { createHash } from "crypto";
import {
  formatCurrency,
  decimalsForCurrency,
  normalizeAmountForCurrency,
} from "@/utils/formatters";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createBidSchema = z
  .object({
    amount: z.number().positive("Bid amount must be positive").optional(),
    enteredRepresentation: z.record(z.string(), z.unknown()).optional(),
    currencyProfileId: z.string().optional(),
    isAnonymous: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.amount === undefined &&
      value.enteredRepresentation === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Either amount or entered representation is required",
      });
    }
  });

export type CreateBidBody = z.infer<typeof createBidSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/auctions/[id]/items/[itemId]/bids - List bids
 */
export const listBids: ApiHandler = async (_req, res, ctx) => {
  const bids = await bidService.getItemBids(ctx.params.itemId);
  res.status(200).json(bids);
};

/**
 * POST /api/auctions/[id]/items/[itemId]/bids - Place bid
 */
export const placeBid: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  const { validatedBody } = req as ValidatedRequest<CreateBidBody>;

  // Anti-fraud: only verified emails can bid (sockpuppet friction).
  // Unverified users get a clear message pointing to verification.
  const bidderAccount = await prisma.user.findUnique({
    where: { id: ctx.session!.user.id },
    select: { emailVerified: true },
  });
  if (!bidderAccount?.emailVerified) {
    throw new BadRequestError(
      "Debes verificar tu email para pujar. Revisa tu bandeja de entrada o reenvía la verificación desde tu perfil.",
      { type: "EMAIL_NOT_VERIFIED" },
    );
  }

  // Anti-fraud: repeat no-show ghosts are blocked platform-wide
  if (await bidService.isBiddingBlocked(ctx.session!.user.id)) {
    throw new ForbiddenError(
      "Tus pujas están bloqueadas por incumplimientos reiterados. Contacta al administrador.",
    );
  }

  // Anti-fraud: users blocked from this auction cannot bid
  await memberService.assertNotBanned(auctionId, ctx.session!.user.id);

  // Get item with auction info
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      currency: true,
      auction: { select: { bidderVisibility: true, endDate: true, bidderApproval: true } },
    },
  });

  if (!item || item.auctionId !== auctionId) {
    throw new NotFoundError("Item not found");
  }

  // Bidder-approval mode: pending members cannot bid until approved
  if (item.auction.bidderApproval && ctx.membership?.role === "PENDING") {
    throw new ForbiddenError(
      "Tu acceso como pujador está pendiente de aprobación por el dueño de la subasta.",
    );
  }

  // Check if item is published
  if (!item.isPublished) {
    throw new BadRequestError("Cannot bid on unpublished items");
  }

  // Check if user is the item creator
  if (item.creatorId === ctx.session!.user.id) {
    throw new ForbiddenError("You cannot bid on your own item");
  }

    // Check if bidding has ended
    if (itemService.isItemEnded(item.endDate)) {
      throw new BadRequestError("Bidding has ended for this item");
    }

    // Lots inherit the auction end: no bids once the auction has ended,
    // even if the item itself still shows a future date (or none)
    if (item.auction.endDate && item.auction.endDate < new Date()) {
      throw new BadRequestError("Bidding has ended for this auction");
    }

  const currencyProfile =
    await auctionCurrencyService.resolveAuctionCurrencyForBid(
      auctionId,
      validatedBody.currencyProfileId,
    );

  const normalizedAmount = normalizeBidValue(currencyProfile, {
    amount: validatedBody.amount,
    enteredRepresentation: validatedBody.enteredRepresentation,
  });

  if (normalizedAmount === null) {
    throw new BadRequestError("Invalid bid representation", {
      type: "INVALID_BID_REPRESENTATION",
    });
  }

  const ruleViolations = evaluateBidRules({
    normalizedAmount,
    currentHighestNormalized: item.currentBid,
    rules: currencyProfile?.rules ?? [],
    enteredRepresentation: validatedBody.enteredRepresentation,
  });

  if (ruleViolations.length > 0) {
    throw new BadRequestError("Bid violates auction currency rules", {
      type: "RULE_VIOLATION",
      violations: ruleViolations,
    });
  }

  // Backward-compatible minimum check for auctions without custom rule configs
  const { valid, minBid } = bidService.validateBidAmount(
    normalizedAmount,
    item.currentBid,
    item.startingBid,
    item.minBidIncrement,
  );

  if (!valid) {
    throw new BadRequestError(
      `La puja mínima es ${formatCurrency(
        minBid,
        item.currency.symbol,
        decimalsForCurrency(item.currency.code),
        item.currency.code,
      )}`,
    );
  }

  // Anti-joke guard: reject absurd bids far above any sane price for
  // this item. The cap scales with the auction's own numbers so legit
  // bidding (including healthy jumps) is unaffected.
  const absurdCap =
    Math.max(item.currentBid ?? 0, item.startingBid, minBid) * 50;
  if (absurdCap > 0 && normalizedAmount > absurdCap) {
    throw new BadRequestError(
      `La puja supera el máximo permitido (${formatCurrency(
        absurdCap,
        item.currency.symbol,
        decimalsForCurrency(item.currency.code),
        item.currency.code,
      )})`,
    );
  }

  // Owner-set maximum bid cap (per-item anti-joke limit)
  if (item.maxBid != null && normalizedAmount > item.maxBid) {
    throw new BadRequestError(
      `La puja supera el máximo fijado por el dueño (${formatCurrency(
        item.maxBid,
        item.currency.symbol,
        decimalsForCurrency(item.currency.code),
        item.currency.code,
      )})`,
    );
  }

  // Zero-decimal currencies (CLP) without a custom profile: whole numbers
  const plainAmount = currencyProfile
    ? validatedBody.amount ?? normalizedAmount
    : normalizeAmountForCurrency(
        validatedBody.amount ?? normalizedAmount,
        item.currency.code,
      );

  // Anti-fraud audit (hashed IP + user agent, visible to item owner/admin)
  const ipHash = createHash("sha256").update(getClientIp(req)).digest("hex");
  const rawUa = req.headers["user-agent"];
  const userAgent = typeof rawUa === "string" ? rawUa.slice(0, 255) : null;

  const bid = await bidService.placeBid(
    itemId,
    ctx.session!.user.id,
    {
      amount: plainAmount,
      normalizedAmount,
      enteredRepresentation: validatedBody.enteredRepresentation,
      currencyProfileId: currencyProfile?.id,
      isAnonymous: validatedBody.isAnonymous,
      ipHash,
      userAgent,
    },
    item.auction.bidderVisibility,
  );

  res.status(201).json(bid);
};

export const voidWinnerSchema = z.object({
  reason: z.string().max(280).optional(),
});

export type VoidWinnerBody = z.infer<typeof voidWinnerSchema>;

/**
 * POST /api/auctions/[id]/items/[itemId]/void-winner - Void the winning
 * bid of an ended item (ghost-bid remedy, owner/admin only).
 * Promotes the runner-up (or leaves the item unsold) and records a
 * strike for the ghost bidder.
 */
export const voidWinningBid: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  const role = ctx.membership?.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new ForbiddenError("Only auction owners or admins can void a winner");
  }

  const { validatedBody } = req as ValidatedRequest<VoidWinnerBody>;

  try {
    const result = await bidService.voidWinningBid(
      itemId,
      ctx.session!.user.id,
      validatedBody.reason,
      auctionId,
    );
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot void winner";
    if (message === "Item not found") {
      throw new NotFoundError("Item not found");
    }
    throw new BadRequestError(message);
  }
};

/**
 * POST /api/auctions/[id]/items/[itemId]/confirm-winner - Winner confirms
 * the purchase (opt-in winner-confirmation mode).
 */
export const confirmWinner: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const itemId = ctx.params.itemId;

  try {
    const result = await bidService.confirmWinner(
      itemId,
      ctx.session!.user.id,
      auctionId,
    );
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot confirm";
    if (message === "Item not found") {
      throw new NotFoundError("Item not found");
    }
    throw new BadRequestError(message);
  }
};
