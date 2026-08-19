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
  it("enforces hard expiry when expirationDate has elapsed", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    expect(deriveSubscriptionState(customerInfo({ expirationDate: past }))).toBe("expired");
  });
  it("maintains active status when expirationDate is in the future", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    expect(deriveSubscriptionState(customerInfo({ expirationDate: future }))).toBe("active");
  });
  it("identifies expired subscriptions from historical entitlements", () => {
    const info = {
      entitlements: {
        active: {},
        all: {
          pro: {
            isActive: false,
            willRenew: false,
            periodType: "NORMAL",
            expirationDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          } as unknown as PurchasesEntitlementInfo,
        },
      },
    } as unknown as CustomerInfo;
    expect(deriveSubscriptionState(info)).toBe("expired");
  });
  /**
   * Both lookups used to fall back to the first entitlement in the object, so a
   * second entitlement on the RevenueCat project — a promo tier, a lifetime SKU,
   * anything added for a store test — unlocked the app on its own.
   */
  it("ignores an active entitlement that is not pro", () => {
    const info = {
      entitlements: {
        active: {
          legacy_promo: {
            isActive: true,
            willRenew: true,
            periodType: "NORMAL",
            billingIssueDetectedAt: null,
            unsubscribeDetectedAt: null,
          } as unknown as PurchasesEntitlementInfo,
        },
        all: {
          legacy_promo: { isActive: true } as unknown as PurchasesEntitlementInfo,
        },
      },
    } as unknown as CustomerInfo;
    expect(deriveSubscriptionState(info)).toBe("free");
  });

  it("still matches a pro entitlement declared with different casing", () => {
    const info = {
      entitlements: {
        active: {
          Pro: {
            isActive: true,
            willRenew: true,
            periodType: "NORMAL",
            billingIssueDetectedAt: null,
            unsubscribeDetectedAt: null,
          } as unknown as PurchasesEntitlementInfo,
        },
        all: {},
      },
    } as unknown as CustomerInfo;
    expect(deriveSubscriptionState(info)).toBe("active");
  });
});
