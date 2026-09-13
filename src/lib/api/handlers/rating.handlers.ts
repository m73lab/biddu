import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import * as ratingService from "@/lib/services/rating.service";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const upsertRatingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
});

export type UpsertRatingBody = z.infer<typeof upsertRatingSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/auctions/[id]/items/[itemId]/ratings - List ratings for an item
 * (blind-aware: others' ratings only when revealed).
 */
export const listRatings: ApiHandler = async (_req, res, ctx) => {
  try {
    const data = await ratingService.getItemRatings(
      ctx.params.itemId,
      ctx.session!.user.id,
      ctx.params.id,
    );
    res.status(200).json(data);
  } catch {
    throw new NotFoundError("Item not found");
  }
};

/**
 * POST /api/auctions/[id]/items/[itemId]/ratings - Rate your counterpart
 * (one per side per item, only on delivered deals).
 */
export const upsertRating: ApiHandler = async (req, res, ctx) => {
  const { validatedBody } = req as ValidatedRequest<UpsertRatingBody>;
  try {
    const result = await ratingService.upsertRating(
      ctx.params.itemId,
      ctx.session!.user.id,
      validatedBody.score,
      validatedBody.comment,
      ctx.params.id,
    );
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot rate";
    if (message === "Item not found") {
      throw new NotFoundError("Item not found");
    }
    throw new BadRequestError(message);
  }
};

/**
 * GET /api/user/rating?userId=... - Public score + revealed reviews.
 */
export const getUserScore: ApiHandler = async (req, res) => {
  const userId =
    typeof req.query.userId === "string" ? req.query.userId : undefined;
  if (!userId) {
    throw new NotFoundError("User not found");
  }
  try {
    const data = await ratingService.getUserScore(userId);
    res.status(200).json(data);
  } catch {
    throw new NotFoundError("User not found");
  }
};
