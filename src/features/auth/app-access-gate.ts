/**
 * `onboarding` starts at the first question on purpose.
 *
 * This gate catches a signed-in account whose onboarding never completed — an
 * account created before answering anything. Resuming at a later step would walk
 * it into the completion mutation carrying the provider's placeholder draft
 * (30 years, 165 cm, 70 kg), persisting numbers the user never entered.
 *
 * `signedOut` is the public entry, not `/(auth)/sign-in`, and that is load-bearing.
 *
 * This decision is consumed by `<Redirect>`, which replaces the current root
 * route rather than stacking onto it. Redirecting straight at `/(auth)/sign-in`
 * therefore left `(auth)` as the *only* root-stack route, and the root layout
 * declares that group with `presentation: "formSheet"`. react-native-screens
 * places the bottom-most screen of a stack as a pushed controller, so the sheet
 * was never presented modally: UIKit vends no `sheetPresentationController` for
 * a controller that neither is nor descends from a modal presentation, and every
 * layout pass of the sign-in content wrapper raised
 * "[RNScreens] sheetPresentationController is null when attempting to set
 * allowed detents". It also stranded the sheet's close button, which calls
 * `router.dismissTo("/(public)/welcome")` — a route that was no longer beneath it.
 *
 * Welcome is the same destination `index` already sends signed-out users to, and
 * the one `getAuthDismissRoute` assumes sits behind the auth sheet. From there
 * "Sign in" pushes `(auth)`, so the group is always presented over a base route.
 */
export const appAccessDestinations = {
  app: "app",
  loading: "loading",
  onboarding: "/(onboarding)/goal",
  signedOut: "/(public)/welcome",
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
  if (!isSignedIn) return appAccessDestinations.signedOut;
  if (isConvexLoading || !isConvexAuthenticated || currentUser == null) return appAccessDestinations.loading;
  return currentUser.onboardingCompleted ? appAccessDestinations.app : appAccessDestinations.onboarding;
}
