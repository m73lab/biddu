/**
 * Setup utilities (PURE module — no prisma/email imports).
 *
 * Kept free of backend singletons so it can be unit-tested with plain
 * `node --test` (via tsx) without a database or generated Prisma client.
 * DB-backed logic lives in `./setup.service`.
 */
import { z } from "zod";
import { randomBytes } from "crypto";

/**
 * Validation for the initial administrator account.
 * Mirrors the public registration rules (name >= 2, valid email,
 * password >= 8) so the first account is never weaker than the rest.
 */
export const setupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export type SetupInput = z.infer<typeof setupSchema>;

/** Length in bytes of the generated admin password (base64url-encoded). */
export const GENERATED_ADMIN_PASSWORD_BYTES = 24;

/**
 * Generate a one-time admin password when INITIAL_ADMIN_PASSWORD is not set.
 * base64url keeps it copy-paste safe (no `+`, `/` or `=`).
 */
export function generateAdminPassword(): string {
  return randomBytes(GENERATED_ADMIN_PASSWORD_BYTES).toString("base64url");
}

/**
 * Hosted (managed-cloud) deployments must NEVER expose the setup wizard:
 * it would let anyone visiting the URL claim the deployment admin.
 * Mirrors the guard already used by the system-settings handlers.
 */
export function isHostedEnvironment(): boolean {
  return !!process.env.VERCEL || process.env.HOSTED === "true";
}
