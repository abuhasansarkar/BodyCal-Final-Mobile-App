/**
 * The store took the purchase, and RevenueCat did not grant `pro` for it.
 *
 * A configuration fault, not a transient one: either no product is attached to
 * the `pro` entitlement, or the entitlement is identified differently in the
 * RevenueCat dashboard than the three places this app pins it — `convex/http.ts`,
 * `convex/subscriptionsActions.ts` and `subscription-state.ts`. Retrying cannot
 * help and the money has already moved, so it must never be reported to the user
 * as "please try again".
 *
 * It lives in its own module, free of the `react-native-purchases` import, so the
 * rule can be tested without loading the store SDK.
 */
export class ProEntitlementMissingError extends Error {
  constructor() {
    super('The store purchase completed, but it is not attached to the RevenueCat entitlement "pro".');
    this.name = "ProEntitlementMissingError";
  }
}

/**
 * Identified by `name` as well as `instanceof`: subclassing `Error` through
 * Babel does not preserve the prototype chain on every runtime.
 */
export function isProEntitlementMissing(cause: unknown) {
  if (cause instanceof ProEntitlementMissingError) return true;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { name?: unknown }).name === "ProEntitlementMissingError"
  );
}
