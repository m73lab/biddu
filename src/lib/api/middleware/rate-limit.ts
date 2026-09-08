import { RateLimiterMemory } from "rate-limiter-flexible";
import type { Middleware } from "../types";
import { ApiError } from "../errors";

/**
 * Rate limiting middleware using rate-limiter-flexible
 *
 * IMPORTANT: This uses in-memory storage which works for:
 * - Local deployments (PM2, Docker, single server)
 * - Self-hosted instances
 *
 * For serverless deployments (Vercel, AWS Lambda), in-memory rate limiting
 * won't work reliably because each function invocation may run in a different
 * instance. For serverless, consider:
 * - @upstash/ratelimit with Upstash Redis
 * - Vercel KV
 * - RateLimiterRedis with external Redis
 *
 * The rate limiting is still useful as a defense-in-depth measure and works
 * fully for self-hosted deployments.
 */

interface RateLimitOptions {
  /** Maximum requests per window */
  points?: number;
  /** Window duration in seconds */
  duration?: number;
  /** Key prefix for different endpoints */
  keyPrefix?: string;
}

function normalizeIp(ip: string): string {
  // Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 -> 1.2.3.4)
  return ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : ip;
}

function isPrivateOrLoopback(ip: string): boolean {
  const clean = normalizeIp(ip.trim());
  if (clean === "127.0.0.1" || clean === "::1" || clean === "localhost") {
    return true;
  }
  const parts = clean.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) {
    return false;
  }
  const [a, b] = parts.map(Number);
  return (
    a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  );
}

function firstHeaderValue(
  value: string | string[] | undefined,
): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value.split(",")[0];
  const trimmed = (raw || "").trim();
  return trimmed || null;
}

/**
 * Get client IP address from request.
 *
 * Proxy headers (X-Forwarded-For / X-Real-IP) are only trusted when the
 * direct TCP peer is a private or loopback address - i.e. we sit behind
 * our own reverse proxy (Caddy/Docker) on a trusted host. Otherwise the
 * socket address is used, so attackers cannot spoof their way around
 * rate limits with a forged header.
 */
export function getClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const socketIp = req.socket?.remoteAddress || "";

  if (socketIp && isPrivateOrLoopback(socketIp)) {
    const forwarded = firstHeaderValue(req.headers["x-forwarded-for"]);
    if (forwarded) return normalizeIp(forwarded);
    const realIp = firstHeaderValue(req.headers["x-real-ip"]);
    if (realIp) return normalizeIp(realIp);
  }

  if (socketIp) return normalizeIp(socketIp);
  const fallback =
    firstHeaderValue(req.headers["x-forwarded-for"]) ||
    firstHeaderValue(req.headers["x-real-ip"]);
  return fallback ? normalizeIp(fallback) : "unknown";
}

// Cache rate limiters to avoid creating new instances on each request
const rateLimiterCache = new Map<string, RateLimiterMemory>();

function getRateLimiter(options: RateLimitOptions): RateLimiterMemory {
  const key = `${options.keyPrefix}-${options.points}-${options.duration}`;

  if (!rateLimiterCache.has(key)) {
    rateLimiterCache.set(
      key,
      new RateLimiterMemory({
        points: options.points || 10,
        duration: options.duration || 60,
        keyPrefix: options.keyPrefix || "global",
      }),
    );
  }

  return rateLimiterCache.get(key)!;
}

/**
 * Rate limiting middleware factory using rate-limiter-flexible
 *
 * @example
 * // 5 requests per minute
 * export default createHandler({
 *   POST: [[withRateLimit({ points: 5, duration: 60 })], handler],
 * });
 */
export function withRateLimit(options: RateLimitOptions = {}): Middleware {
  const rateLimiter = getRateLimiter(options);

  return (next) => async (req, res, ctx) => {
    const ip = getClientIp(req);

    try {
      const rateLimiterRes = await rateLimiter.consume(ip);

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", options.points?.toString() || "10");
      res.setHeader(
        "X-RateLimit-Remaining",
        rateLimiterRes.remainingPoints.toString(),
      );
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil(
          Date.now() / 1000 + rateLimiterRes.msBeforeNext / 1000,
        ).toString(),
      );

      return next(req, res, ctx);
    } catch (rateLimiterRes) {
      // Rate limited
      const retryAfter = Math.ceil(
        (rateLimiterRes as { msBeforeNext: number }).msBeforeNext / 1000,
      );

      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", options.points?.toString() || "10");
      res.setHeader("X-RateLimit-Remaining", "0");

      throw new ApiError(
        "Too many requests. Please try again later.",
        429,
        "RATE_LIMITED",
        { retryAfter },
      );
    }
  };
}

/**
 * Stricter rate limit for authentication endpoints
 * 5 attempts per 15 minutes
 */
export const withAuthRateLimit = withRateLimit({
  points: 5,
  duration: 15 * 60, // 15 minutes in seconds
  keyPrefix: "auth",
});

/**
 * Rate limit for registration
 * 3 registrations per hour per IP
 */
export const withRegistrationRateLimit = withRateLimit({
  points: 3,
  duration: 60 * 60, // 1 hour in seconds
  keyPrefix: "register",
});

/**
 * Rate limit for bid placement
 * 30 bids per minute (allows rapid bidding but prevents abuse)
 */
export const withBidRateLimit = withRateLimit({
  points: 30,
  duration: 60, // 1 minute in seconds
  keyPrefix: "bid",
});

/**
 * Rate limit for password reset requests
 * 3 requests per hour (already implemented in service, this is additional protection)
 */
export const withPasswordResetRateLimit = withRateLimit({
  points: 3,
  duration: 60 * 60, // 1 hour in seconds
  keyPrefix: "password-reset",
});
