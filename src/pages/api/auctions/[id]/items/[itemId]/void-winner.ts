import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { bidHandlers, voidWinnerSchema } from "@/lib/api/handlers";

export default createHandler({
  POST: [
    [withAuth, requireMembership, withValidation(voidWinnerSchema)],
    bidHandlers.voidWinningBid,
  ],
});
