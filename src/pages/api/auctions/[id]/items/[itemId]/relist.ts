import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { itemHandlers, relistItemSchema } from "@/lib/api/handlers";

export default createHandler({
  POST: [
    [withAuth, requireMembership, withValidation(relistItemSchema)],
    itemHandlers.relistItem,
  ],
});
