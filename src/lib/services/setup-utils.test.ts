/**
 * Unit tests for the setup bootstrap (pure helpers only).
 *
 * These deliberately import `./setup-utils` and NOT `./setup.service`:
 * the service module instantiates Prisma at import time, which needs a
 * database + generated client. The helpers below are environment-only.
 *
 * Run:  npx tsx --test src/lib/services/setup-utils.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  setupSchema,
  generateAdminPassword,
  isHostedEnvironment,
  GENERATED_ADMIN_PASSWORD_BYTES,
} from "./setup-utils";

test("setupSchema accepts a valid initial admin", () => {
  const parsed = setupSchema.safeParse({
    name: "Ada Admin",
    email: "Admin@Example.com",
    password: "correct-horse-123",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    // Email is normalized so the admin claim matches login normalization
    assert.equal(parsed.data.email, "admin@example.com");
  }
});

test("setupSchema rejects weak/invalid input", () => {
  for (const input of [
    { name: "A", email: "a@b.co", password: "long-enough-1" }, // short name
    { name: "Ada", email: "not-an-email", password: "long-enough-1" },
    { name: "Ada", email: "a@b.co", password: "short" }, // short password
    { name: "Ada", email: "a@b.co", password: "" },
  ]) {
    assert.equal(
      setupSchema.safeParse(input).success,
      false,
      `should reject ${JSON.stringify(input)}`,
    );
  }
});

test("isHostedEnvironment mirrors the system-settings guard", () => {
  const prevVercel = process.env.VERCEL;
  const prevHosted = process.env.HOSTED;
  try {
    delete process.env.VERCEL;
    delete process.env.HOSTED;
    assert.equal(isHostedEnvironment(), false);

    process.env.VERCEL = "1";
    assert.equal(isHostedEnvironment(), true);
    delete process.env.VERCEL;

    process.env.HOSTED = "true";
    assert.equal(isHostedEnvironment(), true);
  } finally {
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    if (prevHosted === undefined) delete process.env.HOSTED;
    else process.env.HOSTED = prevHosted;
  }
});

test("generateAdminPassword is long, url-safe and unique", () => {
  const a = generateAdminPassword();
  const b = generateAdminPassword();

  // 24 bytes -> 32 base64url chars, no padding, no + / =
  assert.equal(a.length, Math.ceil((GENERATED_ADMIN_PASSWORD_BYTES * 4) / 3));
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(a, b);
});
