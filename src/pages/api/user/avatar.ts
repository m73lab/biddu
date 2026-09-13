import { createHandler, withAuth, withValidation } from "@/lib/api";
import { userHandlers, updateAvatarSchema } from "@/lib/api/handlers";

export default createHandler({
  PATCH: [
    [withAuth, withValidation(updateAvatarSchema)],
    userHandlers.updateAvatar,
  ],
});
