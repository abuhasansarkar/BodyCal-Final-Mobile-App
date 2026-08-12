import type { CustomerInfo, PurchasesEntitlementInfo } from "react-native-purchases";
import { describe, expect, it } from "@jest/globals";

import { deriveSubscriptionState } from "@/features/subscription/subscription-state";

function customerInfo(entitlement?: Partial<PurchasesEntitlementInfo>): CustomerInfo {
  const pro = entitlement ? { isActive: true, willRenew: true, periodType: "NORMAL", billingIssueDetectedAt: null, unsubscribeDetectedAt: null, ...entitlement } as PurchasesEntitlementInfo : undefined;
  return { entitlements: { active: pro ? { pro } : {}, all: pro ? { pro } : {} } } as CustomerInfo;
}

describe("subscription state", () => {
  it("treats no active entitlement as free", () => expect(deriveSubscriptionState(customerInfo())).toBe("free"));
  it("unlocks a trial", () => expect(deriveSubscriptionState(customerInfo({ periodType: "TRIAL" }))).toBe("trial"));
  it("keeps cancelled access active until entitlement expiration", () => expect(deriveSubscriptionState(customerInfo({ willRenew: false, unsubscribeDetectedAt: "2026-08-01" }))).toBe("cancelledActive"));
  it("surfaces active billing issues", () => expect(deriveSubscriptionState(customerInfo({ billingIssueDetectedAt: "2026-08-01" }))).toBe("billingIssueActive"));
});
