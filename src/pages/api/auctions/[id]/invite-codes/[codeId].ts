import { createHandler, withAuth, requireMembership } from "@/lib/api";
import { inviteHandlers } from "@/lib/api/handlers";

export default createHandler({
  DELETE: [[withAuth, requireMembership], inviteHandlers.revokeInviteCode],
});
