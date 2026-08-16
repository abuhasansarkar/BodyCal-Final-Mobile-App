import type { CustomerInfo } from "react-native-purchases";

import type { SubscriptionState } from "@/types/domain";

export function deriveSubscriptionState(customerInfo: CustomerInfo, now = Date.now()): SubscriptionState {
  const activeEntitlement = customerInfo.entitlements.active.pro;
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

  // Check if a previously active entitlement has expired
  const allPro = customerInfo.entitlements.all?.pro;
  if (allPro && !allPro.isActive) {
    return "expired";
  }

  return "free";
}
