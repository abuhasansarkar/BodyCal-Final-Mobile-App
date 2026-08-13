/**
 * `onboarding` starts at the first question on purpose.
 *
 * This gate catches a signed-in account whose onboarding never completed — an
 * account created before answering anything. Resuming at a later step would walk
 * it into the completion mutation carrying the provider's placeholder draft
 * (30 years, 165 cm, 70 kg), persisting numbers the user never entered.
 */
export const appAccessDestinations = {
  app: "app",
  loading: "loading",
  onboarding: "/(onboarding)/goal",
  signIn: "/(auth)/sign-in",
} as const;

export type AppAccessDecision = (typeof appAccessDestinations)[keyof typeof appAccessDestinations];

type CurrentUserState = {
  onboardingCompleted: boolean;
} | null | undefined;

type ResolveAppAccessArgs = {
  currentUser: CurrentUserState;
  isAuthLoaded: boolean;
  isConvexAuthenticated: boolean;
  isConvexLoading: boolean;
  isSignedIn: boolean;
};

export function resolveAppAccess({
  currentUser,
  isAuthLoaded,
  isConvexAuthenticated,
  isConvexLoading,
  isSignedIn,
}: ResolveAppAccessArgs): AppAccessDecision {
  if (!isAuthLoaded) return appAccessDestinations.loading;
  if (!isSignedIn) return appAccessDestinations.signIn;
  if (isConvexLoading || !isConvexAuthenticated || currentUser == null) return appAccessDestinations.loading;
  return currentUser.onboardingCompleted ? appAccessDestinations.app : appAccessDestinations.onboarding;
}
