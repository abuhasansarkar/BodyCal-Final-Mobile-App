export const startupDestinations = {
  app: "/(app)/(tabs)/today",
  welcome: "/(public)/welcome",
} as const;

export function resolveStartupDestination(onboardingCompleted: boolean) {
  return onboardingCompleted ? startupDestinations.app : startupDestinations.welcome;
}
