import { createHandler, withAuth } from "@/lib/api";
import { ratingHandlers } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], ratingHandlers.getUserScore],
});
