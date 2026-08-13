/**
 * Where authentication hands control back to.
 *
 * `onboarding` is the *resume* target, not the start of the flow. Sign-in is
 * offered at the result screen (step 10 of 12), after the questions have already
 * been answered into the local draft, so returning to `/(onboarding)/goal` would
 * throw that answered draft back at the user from step 1.
 */
export const authDestinations = {
  app: "/(app)/(tabs)/today",
  onboarding: "/(onboarding)/ai-introduction",
  paywall: "/(app)/paywall",
} as const;

export type AuthDestinationKey = keyof typeof authDestinations;
export type AuthDestination = (typeof authDestinations)[AuthDestinationKey];

export function resolveAuthDestination(value: string | string[] | undefined): AuthDestination {
  const key = Array.isArray(value) ? value[0] : value;
  return key === "onboarding" || key === "paywall" ? authDestinations[key] : authDestinations.app;
}

export function getAuthDestinationKey(destination: AuthDestination): AuthDestinationKey {
  if (destination === authDestinations.onboarding) return "onboarding";
  if (destination === authDestinations.paywall) return "paywall";
  return "app";
}

export function getAuthDismissRoute(destination: AuthDestination) {
  return destination === authDestinations.app ? "/(public)/welcome" as const : "/(onboarding)/result" as const;
}

/**
 * Where a freshly created account lands.
 *
 * A guest who reached sign-up from the result screen carries a completed draft,
 * so the caller's resume destination stands. Anyone signing up from a public
 * entry point has no draft yet and has to answer the questions first.
 */
export function getPostSignUpRoute(destination: AuthDestination) {
  return destination === authDestinations.app ? "/(onboarding)/goal" as const : destination;
}
