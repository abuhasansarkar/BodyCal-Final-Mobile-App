import { describe, expect, it } from "@jest/globals";

import {
  authDestinations,
  getAuthDestinationKey,
  getAuthDismissRoute,
  getPostSignUpRoute,
  resolveAuthDestination,
} from "@/features/auth/auth-destination";

describe("authentication destinations", () => {
  it("resumes onboarding authentication at the remaining onboarding steps", () => {
    expect(resolveAuthDestination("onboarding")).toBe(authDestinations.onboarding);
    expect(getAuthDestinationKey(authDestinations.onboarding)).toBe("onboarding");
    expect(getAuthDismissRoute(authDestinations.onboarding)).toBe("/(onboarding)/result");
  });

  it("never sends a resuming guest back to the first onboarding question", () => {
    // The draft is already answered by the time sign-in is offered.
    expect(authDestinations.onboarding).not.toBe("/(onboarding)/goal");
    expect(getPostSignUpRoute(authDestinations.onboarding)).toBe(authDestinations.onboarding);
  });

  it("starts a public sign-up at the first onboarding question", () => {
    expect(getPostSignUpRoute(authDestinations.app)).toBe("/(onboarding)/goal");
  });

  it("resolves paywall authentication without falling back to Today", () => {
    expect(resolveAuthDestination("paywall")).toBe(authDestinations.paywall);
    expect(getAuthDestinationKey(authDestinations.paywall)).toBe("paywall");
    expect(getAuthDismissRoute(authDestinations.paywall)).toBe("/(onboarding)/result");
  });

  it("keeps public sign-in on the default app destination", () => {
    expect(resolveAuthDestination(undefined)).toBe(authDestinations.app);
    expect(getAuthDismissRoute(authDestinations.app)).toBe("/(public)/welcome");
  });
});
