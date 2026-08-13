import { ConvexError } from "convex/values";

import type { MutationCtx } from "../_generated/server";

/**
 * Fixed-window rate limiter for expensive or externally-billed operations.
 *
 * Deliberately simple and transactional: one row per (key, window). Callers pass
 * a key that already includes the identity being limited, so limits are never
 * shared across users.
 */

export type RateLimitName = "planGeneration" | "entitlementVerification" | "aiScan" | "export";

const WINDOWS: Record<RateLimitName, { windowMs: number; max: number }> = {
  /** Onboarding plan generation calls a paid provider. Keep this tight. */
  planGeneration: { windowMs: 60 * 60 * 1_000, max: 10 },
  /** RevenueCat REST verification. Enough for normal use, not for hammering. */
  entitlementVerification: { windowMs: 60 * 1_000, max: 10 },
  aiScan: { windowMs: 60 * 1_000, max: 6 },
  export: { windowMs: 24 * 60 * 60 * 1_000, max: 5 },
};

export async function consumeRateLimit(
  ctx: MutationCtx,
  name: RateLimitName,
  subject: string,
  now = Date.now(),
) {
  const { windowMs, max } = WINDOWS[name];
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${name}:${subject}`;

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!existing) {
    await ctx.db.insert("rateLimits", { key, windowStart, count: 1 });
    return { remaining: max - 1 };
  }

  if (existing.windowStart !== windowStart) {
    await ctx.db.patch(existing._id, { windowStart, count: 1 });
    return { remaining: max - 1 };
  }

  if (existing.count >= max) {
    throw new ConvexError({
      code: "rate_limited",
      message: "Too many requests. Please try again shortly.",
      retryAfterMs: windowStart + windowMs - now,
    });
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
  return { remaining: max - existing.count - 1 };
}
