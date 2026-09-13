import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { ratingHandlers, upsertRatingSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], ratingHandlers.listRatings],
  POST: [
    [withAuth, requireMembership, withValidation(upsertRatingSchema)],
    ratingHandlers.upsertRating,
  ],
});
