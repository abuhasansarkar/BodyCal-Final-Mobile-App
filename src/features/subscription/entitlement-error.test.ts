import { describe, expect, it } from "@jest/globals";

import {
  grantedEntitlementsOf,
  isProEntitlementMissing,
  ProEntitlementMissingError,
} from "@/features/subscription/entitlement-error";

describe("pro entitlement misconfiguration", () => {
  it("recognizes its own error", () => {
    expect(isProEntitlementMissing(new ProEntitlementMissingError())).toBe(true);
  });

  it("recognizes it by name across a runtime that loses the prototype", () => {
    // Babel's `extends Error` does not preserve `instanceof` everywhere, so the
    // name is the identification that has to hold.
    expect(isProEntitlementMissing({ name: "ProEntitlementMissingError" })).toBe(true);
  });

  it.each([
    new Error("The payment is pending."),
    { code: "1", userCancelled: true },
    null,
    undefined,
    "ProEntitlementMissingError",
  ])("does not claim an unrelated failure: %p", (cause) => {
    expect(isProEntitlementMissing(cause)).toBe(false);
  });
});

/**
 * The console line this feeds was the only signal a developer got, and "not
 * attached to `pro`" reads identically whether the dashboard granted nothing or
 * granted something under another name. Those need opposite fixes.
 */
describe("pro entitlement diagnostics", () => {
  it("names what the store granted instead", () => {
    const error = new ProEntitlementMissingError(["premium", "lifetime"]);

    expect(error.message).toContain("premium, lifetime");
    expect(grantedEntitlementsOf(error)).toEqual(["premium", "lifetime"]);
  });

  it("distinguishes an entitlement granted under another name from none at all", () => {
    expect(new ProEntitlementMissingError([]).message).toContain("granted no entitlement");
    expect(new ProEntitlementMissingError().message).toContain("granted no entitlement");
  });

  it("reports nothing granted for an unrelated failure", () => {
    expect(grantedEntitlementsOf(new Error("The payment is pending."))).toEqual([]);
  });

  it("survives a runtime that loses the prototype", () => {
    expect(grantedEntitlementsOf({
      name: "ProEntitlementMissingError",
      grantedEntitlements: ["Pro", 7],
    })).toEqual(["Pro"]);
  });
});
