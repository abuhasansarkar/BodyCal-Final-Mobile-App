import { describe, expect, it } from "@jest/globals";

import {
  resolveStartupDestination,
  startupDestinations,
} from "@/features/onboarding/startup-destination";

describe("startup destination", () => {
  it("opens onboarding when a signed-in account has not completed it", () => {
    expect(resolveStartupDestination(false)).toBe(startupDestinations.onboarding);
    expect(startupDestinations.onboarding).toBe("/(onboarding)/goal");
  });

  it("opens Today when onboarding is complete", () => {
    expect(resolveStartupDestination(true)).toBe(startupDestinations.app);
  });
});
