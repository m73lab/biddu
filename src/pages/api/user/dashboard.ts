import { createHandler, withAuth } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as auctionService from "@/lib/services/auction.service";
import * as bidService from "@/lib/services/bid.service";
import * as itemService from "@/lib/services/item.service";

/**
 * GET /api/user/dashboard - Get all dashboard data
 */
const getDashboardData: ApiHandler = async (_req, res, ctx) => {
  const userId = ctx.session!.user.id;

  const [memberAuctions, openAuctions, bidsOverview, userItems] =
    await Promise.all([
      auctionService.getUserAuctions(userId),
      auctionService.getOpenAuctionsForUser(userId),
      // Single bid-history scan (was: separate stats + items queries)
      bidService.getUserBidsOverview(userId),
      itemService.getUserCreatedItems(userId),
    ]);

  const auctions = [...memberAuctions, ...openAuctions];

  res.status(200).json({
    auctions,
    bidStats: bidsOverview.stats,
    bidItems: bidsOverview.items,
    userItems,
  });
};

export default createHandler({
  GET: [[withAuth], getDashboardData],
});
