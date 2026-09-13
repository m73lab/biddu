import {
  createHandler,
  withAuth,
  requireAdmin,
  withValidation,
} from "@/lib/api";
import { memberHandlers, banMemberSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireAdmin], memberHandlers.listBans],
  POST: [
    [withAuth, requireAdmin, withValidation(banMemberSchema)],
    memberHandlers.banMember,
  ],
  DELETE: [[withAuth, requireAdmin], memberHandlers.unbanMember],
});
