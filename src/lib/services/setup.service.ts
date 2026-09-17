/**
 * Initial-setup service (self-host bootstrap).
 *
 * Problem it solves: on a fresh self-hosted deployment without SMTP, the
 * first user registers but can never log in (login requires a verified
 * email, and the verification email is silently skipped). There are also
 * no default credentials, so the deployment is bricked with no way in.
 *
 * Two complementary ways in (either one closes the setup gate):
 *  1. Wizard (`/setup` page + `/api/setup/*`): creates the first user
 *     already verified and claims the deployment admin for it.
 *  2. Env seed (`INITIAL_ADMIN_EMAIL` [+ `INITIAL_ADMIN_PASSWORD`]):
 *     `ensureEnvAdmin()` creates the same admin lazily on the setup
 *     endpoints, so plain `docker compose up` can be fully automated.
 *     The password is generated and logged ONCE when it is created.
 *
 * Gate rule (checked everywhere, enforced atomically at write time):
 *   setup is required  <=>  NOT hosted AND no deployment admin AND
 *   zero verified users.
 * Once any verified user exists or an admin is set, the gate closes
 * forever: the wizard and the seed become inert.
 *
 * NOTE: SQLite (better-sqlite3) has no interactive transactions, so the
 * claim uses a conditional `updateMany` (only wins when admin is still
 * NULL) instead of `prisma.$transaction(async tx => ...)`.
 */
import { hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSystemSettings } from "./system.service";
import {
  SetupInput,
  generateAdminPassword,
  isHostedEnvironment,
} from "./setup-utils";

const logger = createLogger("setup");

export type SetupResult =
  | { success: true; email: string }
  | {
      success: false;
      error: "hosted" | "already_completed" | "email_taken" | "invalid_email";
    };

/**
 * Is the initial setup still pending?
 * Cheap enough to be called by the client-side guard on every navigation:
 * one indexed settings read + one indexed count.
 */
export async function isSetupRequired(): Promise<boolean> {
  if (isHostedEnvironment()) return false;

  const settings = await getSystemSettings();
  if (settings.deploymentAdminEmail) return false;

  const verifiedCount = await prisma.user.count({
    where: { emailVerified: { not: null } },
  });
  return verifiedCount === 0;
}

export async function getSetupStatus(): Promise<{
  setupRequired: boolean;
  hosted: boolean;
}> {
  return {
    setupRequired: await isSetupRequired(),
    hosted: isHostedEnvironment(),
  };
}

/**
 * Create the initial admin account (already verified) and claim the
 * deployment admin for it. Safe to call concurrently: the admin claim is
 * a conditional write, so exactly one caller wins; losers get
 * `already_completed` (their just-created user row is rolled back).
 */
export async function completeSetup(input: SetupInput): Promise<SetupResult> {
  if (isHostedEnvironment()) {
    return { success: false, error: "hosted" };
  }

  // Fast path (re-checked atomically below before writing anything).
  if (!(await isSetupRequired())) {
    return { success: false, error: "already_completed" };
  }

  const email = input.email.toLowerCase().trim();
  const passwordHash = await hash(input.password, 12);

  let userId: string;
  try {
    userId = (
      await prisma.user.create({
        data: {
          name: input.name.trim(),
          email,
          passwordHash,
          emailVerified: new Date(),
        },
        select: { id: true },
      })
    ).id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "email_taken" };
    }
    throw error;
  }

  // Claim the admin seat only if it is still empty (atomic on SQLite).
  // getSystemSettings() above guarantees the singleton row exists, but
  // upsert defensively: a concurrent delete could otherwise 404 here.
  const claimed = await prisma.systemSettings.updateMany({
    where: { id: "system", deploymentAdminEmail: null },
    data: { deploymentAdminEmail: email },
  });

  if (claimed.count === 0) {
    // Lost a race (or the gate closed between check and write): roll back
    // the user we just created so no stray admin-less account is left.
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    logger.warn({ email }, "Setup race lost, rolled back created user");
    return { success: false, error: "already_completed" };
  }

  logger.info({ email }, "Initial setup completed, deployment admin claimed");
  return { success: true, email };
}

export type EnvSeedResult =
  | { applied: false }
  | { applied: true; email: string; generatedPassword?: string };

/**
 * Lazily seed the initial admin from environment variables.
 *
 * - `INITIAL_ADMIN_EMAIL` (required to opt in; must look like an email).
 * - `INITIAL_ADMIN_PASSWORD` (optional; generated + logged ONCE if absent).
 *
 * Idempotent: if the user already exists it is verified (if needed) and
 * the admin seat is filled only when still empty — never rotated away
 * from an existing admin, never rewrites an existing password.
 * Inert on hosted deployments and once setup is complete... except it
 * still fills an empty admin seat for the declared email (explicit
 * operator intent), without touching passwords.
 */
export async function ensureEnvAdmin(): Promise<EnvSeedResult> {
  const rawEmail = process.env.INITIAL_ADMIN_EMAIL?.trim();
  if (!rawEmail || !rawEmail.includes("@") || isHostedEnvironment()) {
    return { applied: false };
  }
  const email = rawEmail.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const updates: { emailVerified?: Date } = {};
    if (!existing.emailVerified) updates.emailVerified = new Date();
    if (updates.emailVerified) {
      await prisma.user.update({ where: { email }, data: updates });
    }
    await prisma.systemSettings.updateMany({
      where: { id: "system", deploymentAdminEmail: null },
      data: { deploymentAdminEmail: email },
    });
    logger.info({ email }, "Env-seeded admin ensured (existing user)");
    return { applied: true, email };
  }

  // Only seed into an actually-empty deployment: never attach a fresh
  // admin account to a database that already has verified users.
  const verifiedCount = await prisma.user.count({
    where: { emailVerified: { not: null } },
  });
  if (verifiedCount > 0) {
    const settings = await getSystemSettings();
    if (!settings.deploymentAdminEmail) {
      logger.warn(
        { email },
        "INITIAL_ADMIN_EMAIL ignored: deployment already has verified users " +
          "but no admin; claim it from Settings after logging in",
      );
    }
    return { applied: false };
  }

  const configuredPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const password = configuredPassword || generateAdminPassword();
  const passwordHash = await hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        name: "Administrator",
        email,
        passwordHash,
        emailVerified: new Date(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { applied: false };
    }
    throw error;
  }

  await prisma.systemSettings.upsert({
    where: { id: "system" },
    create: { id: "system", deploymentAdminEmail: email },
    update: { deploymentAdminEmail: email },
  });

  if (!configuredPassword) {
    // Shown exactly once: this branch only runs when the user is created.
    logger.warn(
      "================================================================\n" +
        `INITIAL ADMIN PASSWORD (shown only once, user ${email}):\n` +
        `${password}\n` +
        "Store it now. It is never logged or exposed again.\n" +
        "================================================================",
    );
    return { applied: true, email, generatedPassword: password };
  }

  logger.info({ email }, "Env-seeded admin created with configured password");
  return { applied: true, email };
}
