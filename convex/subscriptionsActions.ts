"use node";

import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction, type ActionCtx } from "./_generated/server";

type SubscriberResponse = {
  subscriber?: {
    entitlements?: Record<
      string,
      { expires_date?: string | null; product_identifier?: string; purchase_date?: string | null }
    >;
    subscriptions?: Record<
      string,
      {
        period_type?: string;
        unsubscribe_detected_at?: string | null;
        billing_issues_detected_at?: string | null;
        expires_date?: string | null;
      }
    >;
  };
};

export type EntitlementResult = {
  active: boolean;
  trial: boolean;
  expirationAt?: number;
  productId?: string;
  willRenew?: boolean;
};

async function verify(ctx: ActionCtx, clerkUserId: string): Promise<EntitlementResult> {
  const secret = process.env.REVENUECAT_SECRET_KEY;
  if (!secret) throw new ConvexError("RevenueCat verification is not configured");

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(clerkUserId)}`,
    { headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" } },
  );
  if (!response.ok) throw new ConvexError("Unable to verify subscription");

  const payload = (await response.json()) as SubscriberResponse;
  const entitlement = payload.subscriber?.entitlements?.pro;
  const expiresRaw = entitlement?.expires_date;
  const expirationAt = expiresRaw ? Date.parse(expiresRaw) : undefined;
  const active =
    Boolean(entitlement) &&
    (expirationAt === undefined || Number.isNaN(expirationAt) || expirationAt > Date.now());

  const productId = entitlement?.product_identifier;
  const subscription = productId ? payload.subscriber?.subscriptions?.[productId] : undefined;
  const trial = subscription?.period_type?.toLowerCase() === "trial";
  const unsubscribeDetected = Boolean(subscription?.unsubscribe_detected_at);
  const billingIssueDetected = Boolean(subscription?.billing_issues_detected_at);

  await ctx.runMutation(internal.subscriptions.applyVerification, {
    customerId: clerkUserId,
    active,
    trial,
    productId,
    periodType: subscription?.period_type,
    expirationAt: expirationAt !== undefined && !Number.isNaN(expirationAt) ? expirationAt : undefined,
    // Only asserted when the store told us the subscription was cancelled.
    willRenew: active ? !unsubscribeDetected : false,
    unsubscribeDetected,
    billingIssueDetected,
  });

  return {
    active,
    trial,
    expirationAt: expirationAt !== undefined && !Number.isNaN(expirationAt) ? expirationAt : undefined,
    productId,
    willRenew: active ? !unsubscribeDetected : false,
  };
}

/** Internal entry point used by `ai.analyzeMeal` when the mirror is stale. */
export const verifyForCurrentUser = internalAction({
  args: {},
  handler: async (ctx): Promise<EntitlementResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");
    return await verify(ctx, identity.subject);
  },
});

/** Client-callable refresh, rate limited per identity. */
export const verifyEntitlement = action({
  args: {},
  handler: async (ctx): Promise<EntitlementResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");
    await ctx.runMutation(internal.subscriptionsDb.consumeVerificationBudget, {
      subject: identity.subject,
    });
    return await verify(ctx, identity.subject);
  },
});

export const reconcileCustomer = internalAction({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args): Promise<EntitlementResult> => await verify(ctx, args.clerkUserId),
});
