import { createHandler, withAuth } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as bidService from "@/lib/services/bid.service";

/**
 * GET /api/user/bids - Get user's bid history with stats
 */
const getUserBids: ApiHandler = async (_req, res, ctx) => {
  const userId = ctx.session!.user.id;

  // Single bid-history scan (was: separate stats + items queries)
  const { stats: bidStats, items: bidItems } =
    await bidService.getUserBidsOverview(userId);

  res.status(200).json({
    bidStats,
    bidItems,
  });
};

export default createHandler({
  GET: [[withAuth], getUserBids],
});
