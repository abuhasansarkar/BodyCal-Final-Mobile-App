"use node";

import { actionGeneric as action, makeFunctionReference } from "convex/server";
import { ConvexError } from "convex/values";

const applyVerification = makeFunctionReference<"mutation">("subscriptions:_applyVerification");

export const verifyEntitlement = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");
    const secret = process.env.REVENUECAT_SECRET_KEY;
    if (!secret) throw new ConvexError("RevenueCat verification is not configured");
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(identity.subject)}`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    });
    if (!response.ok) throw new ConvexError("Unable to verify subscription");
    const payload = await response.json() as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }>; subscriptions?: Record<string, { period_type?: string }> } };
    const entitlement = payload.subscriber?.entitlements?.pro;
    const expirationAt = entitlement?.expires_date ? Date.parse(entitlement.expires_date) : undefined;
    const active = Boolean(entitlement) && (!expirationAt || expirationAt > Date.now());
    const productId = entitlement?.product_identifier;
    const trial = Boolean(productId && payload.subscriber?.subscriptions?.[productId]?.period_type?.toLowerCase() === "trial");
    await ctx.runMutation(applyVerification, { customerId: identity.subject, active, productId, expirationAt, trial });
    return { active, expirationAt, trial };
  },
});
