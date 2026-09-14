import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { inviteHandlers, createInviteCodeSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], inviteHandlers.listInviteCodes],
  POST: [
    [withAuth, requireMembership, withValidation(createInviteCodeSchema)],
    inviteHandlers.createInviteCode,
  ],
});
