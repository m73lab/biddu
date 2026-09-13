import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api/errors";
import * as bidService from "@/lib/services/bid.service";
import * as itemService from "@/lib/services/item.service";
import * as auctionCurrencyService from "@/lib/services/auction-currency.service";
import {
  normalizeBidValue,
  evaluateBidRules,
} from "@/lib/services/auction-currency-rule.service";
import { prisma } from "@/lib/prisma";
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

  // Get item with auction info
  const item = await prisma.auctionItem.findUnique({
    where: { id: itemId },
    include: {
      currency: true,
      auction: { select: { bidderVisibility: true, endDate: true } },
    },
  });

  if (!item || item.auctionId !== auctionId) {
    throw new NotFoundError("Item not found");
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

  const bid = await bidService.placeBid(
    itemId,
    ctx.session!.user.id,
    {
      amount: plainAmount,
      normalizedAmount,
      enteredRepresentation: validatedBody.enteredRepresentation,
      currencyProfileId: currencyProfile?.id,
      isAnonymous: validatedBody.isAnonymous,
    },
    item.auction.bidderVisibility,
  );

  res.status(201).json(bid);
};
