import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { consumeRateLimit } from "./lib/rateLimit";

/**
 * Rate-limit gate for the client-callable entitlement refresh. Lives in a
 * non-Node module because `"use node"` actions cannot open a transaction.
 */
export const consumeVerificationBudget = internalMutation({
  args: { subject: v.string() },
  returns: v.null(),
  handler: async (ctx, { subject }) => {
    await consumeRateLimit(ctx, "entitlementVerification", subject);
    return null;
  },
});
