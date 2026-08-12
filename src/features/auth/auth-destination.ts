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
