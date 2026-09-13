import { createHandler, withAuth } from "@/lib/api";
import { userHandlers } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], userHandlers.getUserStats],
});
