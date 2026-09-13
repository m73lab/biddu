import { createHandler, withAuth, requireMembership } from "@/lib/api";
import { bidHandlers } from "@/lib/api/handlers";

export default createHandler({
  POST: [[withAuth, requireMembership], bidHandlers.confirmWinner],
});
