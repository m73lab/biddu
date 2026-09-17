import { ApiHandler } from "../types";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../errors";
import { isEmailEnabled } from "@/lib/email";
import * as setupService from "@/lib/services/setup.service";
import { setupSchema } from "@/lib/services/setup-utils";

// ============================================================================
// Setup status (public: reports only deployment-global state, nothing
// user-specific, so it cannot be used for account enumeration)
// ============================================================================

export const getSetupStatus: ApiHandler = async (req, res) => {
  // Env seed wins: a configured INITIAL_ADMIN_* may complete the setup
  // before we report, so automated deployments never see the wizard.
  await setupService.ensureEnvAdmin();

  const status = await setupService.getSetupStatus();

  return res.status(200).json({
    ...status,
    emailEnabled: isEmailEnabled(),
  });
};

// ============================================================================
// Complete initial setup: create the first (verified) admin account
// ============================================================================

export const completeSetup: ApiHandler = async (req, res) => {
  const parsed = setupSchema.safeParse(req.body);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      }
    });
    throw new ValidationError("Validation failed", errors);
  }

  // Env seed wins over the wizard form (single admin source of truth).
  await setupService.ensureEnvAdmin();

  const result = await setupService.completeSetup(parsed.data);

  if (!result.success) {
    if (result.error === "hosted") {
      throw new ForbiddenError(
        "Initial setup is not available on hosted deployments",
      );
    }
    if (result.error === "already_completed") {
      throw new ForbiddenError(
        "Initial setup was already completed. Log in instead.",
      );
    }
    if (result.error === "email_taken") {
      throw new ConflictError(
        "An account with this email already exists. Log in (or verify it first) instead of running setup again.",
      );
    }
    throw new BadRequestError("Invalid setup request");
  }

  return res.status(201).json({
    success: true,
    email: result.email,
  });
};
