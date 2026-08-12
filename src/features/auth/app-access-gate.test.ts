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

  it("sends incomplete users back to onboarding completion", () => {
    expect(resolveAppAccess({
      currentUser: { onboardingCompleted: false },
      isAuthLoaded: true,
      isConvexAuthenticated: true,
      isConvexLoading: false,
      isSignedIn: true,
    })).toBe(appAccessDestinations.onboarding);
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
