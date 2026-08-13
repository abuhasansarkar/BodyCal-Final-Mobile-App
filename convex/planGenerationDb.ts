import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { consumeRateLimit } from "./lib/rateLimit";

/**
 * Rate-limit gate for onboarding plan generation. A `"use node"` action cannot
 * open a transaction, so the counter lives here.
 */
export const consumeBudget = internalMutation({
  args: { subject: v.string() },
  returns: v.null(),
  handler: async (ctx, { subject }) => {
    await consumeRateLimit(ctx, "planGeneration", subject);
    return null;
  },
});
