import { describe, expect, it } from "@jest/globals";

import { isProEntitlementMissing, ProEntitlementMissingError } from "@/features/subscription/entitlement-error";

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
