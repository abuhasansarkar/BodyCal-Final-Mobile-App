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
  /**
   * The entitlement identifiers RevenueCat actually returned for the purchase.
   *
   * Without them the failure is undiagnosable: "not attached to `pro`" reads
   * identically whether the dashboard granted nothing at all (no product on the
   * entitlement) or granted something under another name (`Pro`, `premium`, a
   * leftover test tier). Those need opposite fixes, and the console line this
   * feeds was the only signal a developer got.
   *
   * Entitlement identifiers are dashboard configuration, not subscriber data —
   * no receipt, price, store account or user id is carried here, so this stays
   * inside the privacy rule that keeps subscriber detail out of logs.
   */
  readonly grantedEntitlements: readonly string[];

  constructor(grantedEntitlements: readonly string[] = []) {
    super(
      'The store purchase completed, but it is not attached to the RevenueCat entitlement "pro".' +
        (grantedEntitlements.length > 0
          ? ` RevenueCat granted: ${grantedEntitlements.join(", ")}.`
          : " RevenueCat granted no entitlement for it."),
    );
    this.name = "ProEntitlementMissingError";
    this.grantedEntitlements = grantedEntitlements;
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

/** The entitlements the store did grant, for the diagnostic log line only. */
export function grantedEntitlementsOf(cause: unknown): readonly string[] {
  if (!isProEntitlementMissing(cause)) return [];
  const granted = (cause as { grantedEntitlements?: unknown }).grantedEntitlements;
  return Array.isArray(granted) ? granted.filter((value): value is string => typeof value === "string") : [];
}
