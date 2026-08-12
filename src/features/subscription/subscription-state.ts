import type { CustomerInfo } from "react-native-purchases";

import type { SubscriptionState } from "@/types/domain";

export function deriveSubscriptionState(customerInfo: CustomerInfo): SubscriptionState {
  const entitlement = customerInfo.entitlements.active.pro;
  if (!entitlement?.isActive) return "free";
  if (entitlement.periodType === "TRIAL") return "trial";
  if (entitlement.billingIssueDetectedAt) return "billingIssueActive";
  if (!entitlement.willRenew || entitlement.unsubscribeDetectedAt) return "cancelledActive";
  return "active";
}
