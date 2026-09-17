import { createHandler, withRegistrationRateLimit } from "@/lib/api";
import { completeSetup } from "@/lib/api/handlers/setup.handlers";

export default createHandler({
  // Creating the initial admin is as sensitive as registration:
  // same strict limit (2 attempts per hour per IP).
  POST: [[withRegistrationRateLimit], completeSetup],
});
