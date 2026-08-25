/**
 * Whether a failed store action was the user backing out.
 *
 * A cancellation is the one purchase failure that must stay silent, so it is
 * decided only from the fields the SDK actually sets, never from the wording of
 * a message. `PURCHASE_CANCELLED_ERROR` is `"1"` in RevenueCat's
 * `PURCHASES_ERROR_CODE`; the numeric form is accepted too because the bridge
 * has shipped both, and `userCancelled` remains the signal the SDK documents
 * even though it is marked deprecated in favour of the code.
 *
 * The rule used to also match any message containing "cancel", "dismiss" or
 * "closed". That silently swallowed genuine failures — "The network connection
 * was lost", anything phrased around a *cancelled subscription* — so the button
 * reset with no banner and nothing written to the log. Whether a user is told
 * their payment failed cannot hinge on substring-matching an unlocalized vendor
 * string that changes with locale and SDK version.
 *
 * Like `entitlement-error.ts`, this module deliberately imports nothing from
 * `react-native-purchases`, so the rule is testable without loading the store SDK.
 */
const PURCHASE_CANCELLED_ERROR = "1";

export function isPurchaseCancellation(cause: unknown) {
  if (typeof cause !== "object" || cause === null) return false;
  const error = cause as { userCancelled?: unknown; code?: unknown };
  if (error.userCancelled === true) return true;
  return (
    error.code === PURCHASE_CANCELLED_ERROR ||
    error.code === 1 ||
    error.code === "PURCHASE_CANCELLED_ERROR"
  );
}
