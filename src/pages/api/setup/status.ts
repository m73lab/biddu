import { createHandler } from "@/lib/api";
import { getSetupStatus } from "@/lib/api/handlers/setup.handlers";

export default createHandler({
  GET: getSetupStatus,
});
