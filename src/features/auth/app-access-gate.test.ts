import { describe, expect, it } from "@jest/globals";

import { appAccessDestinations, resolveAppAccess } from "@/features/auth/app-access-gate";

describe("app access gate", () => {
  it("sends signed-out users to sign in", () => {
    expect(resolveAppAccess({
      currentUser: undefined,
      isAuthLoaded: true,
      isConvexAuthenticated: false,
      isConvexLoading: false,
      isSignedIn: false,
    })).toBe(appAccessDestinations.signIn);
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
