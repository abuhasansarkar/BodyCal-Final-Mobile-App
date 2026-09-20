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

/** The single entitlement that grants BodyCal Pro. Matched case-insensitively. */
const PRO_ENTITLEMENT_ID = "pro";

export type EntitlementResult = {
  active: boolean;
  trial: boolean;
  expirationAt?: number;
  productId?: string;
  willRenew?: boolean;
};

const entitlementResultValidator = v.object({
  active: v.boolean(),
  trial: v.boolean(),
  expirationAt: v.optional(v.number()),
  productId: v.optional(v.string()),
  willRenew: v.optional(v.boolean()),
});

async function verify(ctx: ActionCtx, clerkUserId: string): Promise<EntitlementResult> {
  const secret = process.env.REVENUECAT_SECRET_KEY;
  if (!secret) throw new ConvexError("RevenueCat verification is not configured");

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(clerkUserId)}`,
    { headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" } },
  );
  if (!response.ok) throw new ConvexError("Unable to verify subscription");

  const payload = (await response.json()) as SubscriberResponse;
  const entitlements = payload.subscriber?.entitlements ?? {};
  /*
    Only the `pro` entitlement grants access, and its absence is not-entitled.

    This used to fall back to `Object.keys(entitlements)[0]`, so the first
    entitlement RevenueCat happened to return — a promo tier, a lifetime SKU, an
    entitlement added for a test — verified as Pro and wrote an active mirror
    that gates AI scanning. The webhook path in `http.ts` has always required
    `entitlement_ids` to contain `pro`; this is the same rule, applied to the
    path that actually writes the server gate.
  */
  const entitlementKey = Object.keys(entitlements).find((key) => key.toLowerCase() === PRO_ENTITLEMENT_ID);
  const entitlement = entitlementKey ? entitlements[entitlementKey] : undefined;
  const expiresRaw = entitlement?.expires_date;
  const parsedExpiration = expiresRaw ? Date.parse(expiresRaw) : undefined;
  /*
    A date RevenueCat sent but we could not read is not the same as no date at
    all. `expires_date: null` legitimately means a non-expiring entitlement, and
    that must keep granting access; an unparseable string means the response is
    malformed, and this used to treat it as the non-expiring case — `active` went
    true and the stored `expirationAt` was normalized to `undefined`, which every
    gate reads as "no expiry". One malformed field bought open-ended Pro until a
    webhook happened to correct it. It is now refused, and the webhook remains
    the authority that can grant it back.
  */
  const expirationUnreadable = parsedExpiration !== undefined && Number.isNaN(parsedExpiration);
  const expirationAt = expirationUnreadable ? undefined : parsedExpiration;
  if (expirationUnreadable) {
    console.error("[subscription] RevenueCat returned an unreadable expires_date; refusing to grant");
  }
  const active =
    Boolean(entitlement) &&
    !expirationUnreadable &&
    (expirationAt === undefined || expirationAt > Date.now());

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
    expirationAt,
    // Only asserted when the store told us the subscription was cancelled.
    willRenew: active ? !unsubscribeDetected : false,
    unsubscribeDetected,
    billingIssueDetected,
  });

  return {
    active,
    trial,
    expirationAt,
    productId,
    willRenew: active ? !unsubscribeDetected : false,
  };
}

/**
 * Internal entry point used by `ai.startScan` when the mirror is stale.
 *
 * Rate limited on the same per-identity budget as the client-callable refresh,
 * and deliberately so. `startScan`'s own `aiScan` limit lives inside
 * `aiDb.begin`, which runs *after* this — and `isEntitlementFresh` returns false
 * for every account with no mirror row at all, which is every free user. So each
 * `startScan` call made an unmetered outbound request to `api.revenuecat.com`
 * before any limiter could refuse it, and the call that eventually threw "Pro
 * entitlement required" had already spent the request. Sharing the budget puts a
 * ceiling on what one identity can drive at RevenueCat regardless of which entry
 * point it comes through.
 */
export const verifyForCurrentUser = internalAction({
  args: {},
  returns: entitlementResultValidator,
  handler: async (ctx): Promise<EntitlementResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");
    await ctx.runMutation(internal.subscriptionsDb.consumeVerificationBudget, {
      subject: identity.subject,
    });
    return await verify(ctx, identity.subject);
  },
});

/** Client-callable refresh, rate limited per identity. */
export const verifyEntitlement = action({
  args: {},
  returns: entitlementResultValidator,
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
  returns: entitlementResultValidator,
  handler: async (ctx, args): Promise<EntitlementResult> => await verify(ctx, args.clerkUserId),
});
