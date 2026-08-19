import { Redirect } from "expo-router";
import React from "react";

import { hasBackendConfiguration } from "@/config/env";
import { useProAccess } from "@/features/subscription/server-pro-access";
import { PaywallScreen } from "@/screens/paywall-screen";
import { StartupScreen } from "@/screens/startup-screen";

/**
 * Keeps an existing subscriber out of the purchase flow.
 *
 * The paywall disabled its own buy button for a Pro account, but every route
 * into it still landed there — a deep link, the back stack, or one of the
 * upgrade prompts reached before the entitlement had loaded — so a paying user
 * could sit on a screen selling them what they already own. They are sent to
 * subscription settings instead, which is where a plan is actually managed.
 *
 * The decision is latched on entry rather than tracked live, and that is the
 * whole point: a purchase made *on this screen* flips the account to Pro
 * mid-flow, and a live guard would unmount the paywall underneath its own
 * success handler before it could hand over to the benefits screen.
 */
function GuardedPaywall() {
  const { isPro, isResolved } = useProAccess();
  const [enteredAsPro, setEnteredAsPro] = React.useState<boolean | null>(null);

  // Latched during render, not in an effect: React re-renders immediately with
  // the adjusted state and never commits the discarded pass, so the paywall
  // cannot flash for a subscriber on the way to being redirected away from it.
  if (enteredAsPro === null && isResolved) setEnteredAsPro(isPro);

  // Neither source has answered yet. Showing the paywall here and pulling it
  // away a frame later is worse than a moment of the launch screen.
  if (enteredAsPro === null) return <StartupScreen />;
  if (enteredAsPro) return <Redirect href="/(app)/settings/subscription" />;
  return <PaywallScreen />;
}

export default function PaywallRoute() {
  // No Convex in the unconfigured dev fallback, so there is no mirror to ask.
  return hasBackendConfiguration ? <GuardedPaywall /> : <PaywallScreen />;
}
