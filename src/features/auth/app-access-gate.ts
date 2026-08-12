export const appAccessDestinations = {
  app: "app",
  loading: "loading",
  onboarding: "/(onboarding)/ai-introduction",
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
