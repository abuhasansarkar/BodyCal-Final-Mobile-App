import { useQuery } from "convex/react";

import { isProState, useSubscription } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";

const ACTIVE_STATES = new Set(["trial", "active", "cancelledActive", "billingIssueActive"]);

type Mirror = { state: string; expirationAt?: number } | null | undefined;

/**
 * Whether the Convex mirror currently grants Pro.
 *
 * `expirationAt` is evaluated against the clock at the moment the mirror is
 * read, not at mount. It used to be frozen in `useState` on first render, so a
 * subscription that lapsed while a screen stayed open kept its access until the
 * screen remounted. The mirror is the reactive input here: when RevenueCat moves
 * the account on, the row changes, this re-runs, and the comparison is fresh.
 */
function mirrorGrantsPro(mirror: Mirror) {
  return Boolean(
    mirror &&
      ACTIVE_STATES.has(mirror.state) &&
      (mirror.expirationAt === undefined || mirror.expirationAt > Date.now()),
  );
}

/** Premium backend features follow the RevenueCat mirror used by Convex authorization. */
export function useServerProAccess() {
  return mirrorGrantsPro(useQuery(api.subscriptions.getMirror, {}));
}

/**
 * Does this account have Pro right now, according to either source that knows?
 *
 * The two disagree constantly, and each is right at a different moment:
 *
 * - The **RevenueCat SDK state** updates the instant a purchase completes, but
 *   only on the device that made it, and only once the SDK has fetched.
 * - The **Convex mirror** is written by the store webhook and by server
 *   verification, so it survives a reinstall and follows the account to another
 *   device — but it lags a fresh purchase by however long the webhook takes.
 *
 * Reading only one is what left the profile badge saying "Free plan" to somebody
 * who had just paid. Either source claiming Pro is enough to *show* Pro; neither
 * is trusted to grant anything, because every gated read is re-checked against
 * the mirror on the server regardless of what the client believes.
 */
export function useProAccess() {
  const { state } = useSubscription();
  const mirror = useQuery(api.subscriptions.getMirror, {});

  return {
    isPro: isProState(state) || mirrorGrantsPro(mirror),
    /**
     * Both sources have answered. Until they have, "not Pro" is an absence of
     * data rather than a verdict — which matters anywhere the answer decides
     * navigation instead of decoration.
     */
    isResolved: state !== "loading" && mirror !== undefined,
  };
}
