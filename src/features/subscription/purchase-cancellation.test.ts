import { describe, expect, it } from "@jest/globals";

import { isPurchaseCancellation } from "@/features/subscription/purchase-cancellation";

describe("purchase cancellation", () => {
  it.each([
    { userCancelled: true },
    { code: "1", userCancelled: null },
    { code: 1 },
    { code: "PURCHASE_CANCELLED_ERROR" },
  ])("stays silent for a store cancellation: %p", (cause) => {
    expect(isPurchaseCancellation(cause)).toBe(true);
  });

  /**
   * Each of these was previously read as a cancellation because of a substring
   * in its message, so the paywall reset with no banner and no log line while
   * the purchase had genuinely failed.
   */
  it.each([
    { code: "10", message: "The network connection was lost." },
    { code: "10", message: "Connection closed by the server." },
    { code: "2", message: "The store could not be reached; the session was closed." },
    { code: "23", message: "Cancelled subscriptions cannot be changed." },
    new Error("The payment is pending."),
    { name: "ProEntitlementMissingError", message: "…not attached to the entitlement \"pro\"." },
  ])("reports a real failure: %p", (cause) => {
    expect(isPurchaseCancellation(cause)).toBe(false);
  });

  it.each([null, undefined, "PURCHASE_CANCELLED_ERROR", 1])(
    "does not treat a non-error value as a cancellation: %p",
    (cause) => {
      expect(isPurchaseCancellation(cause)).toBe(false);
    },
  );
});
