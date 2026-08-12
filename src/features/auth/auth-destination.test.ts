import { describe, expect, it } from "@jest/globals";

import {
  authDestinations,
  getAuthDestinationKey,
  getAuthDismissRoute,
  resolveAuthDestination,
} from "@/features/auth/auth-destination";

describe("authentication destinations", () => {
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
