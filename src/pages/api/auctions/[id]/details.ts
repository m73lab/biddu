import { createHandler, withAuth, withMembership } from "@/lib/api";
import type { ApiHandler } from "@/lib/api/types";
import * as auctionService from "@/lib/services/auction.service";

/**
 * GET /api/auctions/[id]/details - Get auction details with items for the detail page.
 * Payload built by getAuctionDetailsData (shared with SSR fallbackData).
 */
const getAuctionDetails: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const userId = ctx.session!.user.id;

  const data = await auctionService.getAuctionDetailsData(auctionId, userId);

  if (!data) {
    return res.status(404).json({ message: "Auction not found" });
  }

  res.status(200).json(data);
};

export default createHandler({
  GET: [[withAuth, withMembership()], getAuctionDetails],
});
