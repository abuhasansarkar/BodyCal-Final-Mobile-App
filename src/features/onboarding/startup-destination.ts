export const startupDestinations = {
  app: "/(app)/(tabs)/today",
  onboarding: "/(onboarding)/goal",
} as const;

/**
 * Cold-start destination for an account that is already signed in.
 *
 * Only reached once Clerk reports a session, so an incomplete account belongs in
 * the onboarding flow rather than back on the public welcome screen — that screen
 * offers "Get started" and "Sign in", neither of which fits somebody already
 * holding a session.
 */
export function resolveStartupDestination(onboardingCompleted: boolean) {
  return onboardingCompleted ? startupDestinations.app : startupDestinations.onboarding;
}
