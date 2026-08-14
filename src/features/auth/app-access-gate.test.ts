import { describe, expect, it } from "@jest/globals";

import { appAccessDestinations, resolveAppAccess } from "@/features/auth/app-access-gate";

describe("app access gate", () => {
  it("sends signed-out users to the public entry", () => {
    expect(resolveAppAccess({
      currentUser: undefined,
      isAuthLoaded: true,
      isConvexAuthenticated: false,
      isConvexLoading: false,
      isSignedIn: false,
    })).toBe(appAccessDestinations.signedOut);
    // Never `/(auth)/*`: this decision is redirected to, which replaces the root
    // route, and the root layout presents `(auth)` as a form sheet. A form sheet
    // alone at the bottom of the stack is pushed rather than presented, which
    // leaves UIKit with no sheetPresentationController and strands the sheet's
    // close button (it dismisses back to this very route).
    expect(appAccessDestinations.signedOut).toBe("/(public)/welcome");
  });

  it("waits while the Convex user is still loading", () => {
    expect(resolveAppAccess({
      currentUser: undefined,
      isAuthLoaded: true,
      isConvexAuthenticated: true,
      isConvexLoading: false,
      isSignedIn: true,
    })).toBe(appAccessDestinations.loading);
  });

  it("sends incomplete users to the first onboarding question", () => {
    expect(resolveAppAccess({
      currentUser: { onboardingCompleted: false },
      isAuthLoaded: true,
      isConvexAuthenticated: true,
      isConvexLoading: false,
      isSignedIn: true,
    })).toBe(appAccessDestinations.onboarding);
    // Never a later step: the completion mutation would persist placeholder body metrics.
    expect(appAccessDestinations.onboarding).toBe("/(onboarding)/goal");
  });

  it("allows completed users into the app", () => {
    expect(resolveAppAccess({
      currentUser: { onboardingCompleted: true },
      isAuthLoaded: true,
      isConvexAuthenticated: true,
      isConvexLoading: false,
      isSignedIn: true,
    })).toBe(appAccessDestinations.app);
  });
});
