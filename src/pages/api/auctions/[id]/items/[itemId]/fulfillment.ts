import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { itemHandlers, fulfillmentSchema } from "@/lib/api/handlers";

export default createHandler({
  PATCH: [
    [withAuth, requireMembership, withValidation(fulfillmentSchema)],
    itemHandlers.setFulfillmentStatus,
  ],
});
