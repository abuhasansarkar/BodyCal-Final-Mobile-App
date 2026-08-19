import type { CustomerInfo } from "react-native-purchases";

import type { SubscriptionState } from "@/types/domain";

/**
 * The single entitlement that grants BodyCal Pro.
 *
 * Matched case-insensitively, and never fallen back from. Both lookups below
 * used to end in `?? entries[0]`, so whichever entitlement RevenueCat listed
 * first decided access — a promo tier, a lifetime SKU or an entitlement added
 * for a store test would each have unlocked the app. `convex/http.ts` and
 * `convex/subscriptionsActions.ts` apply the same rule server-side.
 */
const PRO_ENTITLEMENT_ID = "pro";

function findPro<T>(entries: Record<string, T> | undefined) {
  const match = Object.entries(entries ?? {}).find(
    ([key]) => key.toLowerCase() === PRO_ENTITLEMENT_ID,
  );
  return match ? match[1] : undefined;
}

export function deriveSubscriptionState(customerInfo: CustomerInfo, now = Date.now()): SubscriptionState {
  const activeEntitlement = findPro(customerInfo.entitlements.active);

  if (activeEntitlement?.isActive) {
    // Hard expiry guard: even if marked active in a stale cache, an elapsed expiration date expires access.
    if (activeEntitlement.expirationDate) {
      const expirationMs = Date.parse(activeEntitlement.expirationDate);
      if (!Number.isNaN(expirationMs) && expirationMs <= now) {
        return "expired";
      }
    }
    if (activeEntitlement.periodType === "TRIAL") return "trial";
    if (activeEntitlement.billingIssueDetectedAt) return "billingIssueActive";
    if (!activeEntitlement.willRenew || activeEntitlement.unsubscribeDetectedAt) return "cancelledActive";
    return "active";
  }

  // A previously held Pro entitlement reads as expired rather than never-subscribed,
  // which is what lets the paywall offer a resubscribe instead of a first purchase.
  const historicalPro = findPro(customerInfo.entitlements.all);
  if (historicalPro && !historicalPro.isActive) {
    return "expired";
  }

  return "free";
}
