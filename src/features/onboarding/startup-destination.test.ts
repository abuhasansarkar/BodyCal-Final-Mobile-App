import { describe, expect, it } from "@jest/globals";

import {
  resolveStartupDestination,
  startupDestinations,
} from "@/features/onboarding/startup-destination";

describe("startup destination", () => {
  it("opens Welcome instead of the goal screen when onboarding is incomplete", () => {
    expect(resolveStartupDestination(false)).toBe(startupDestinations.welcome);
  });

  it("opens Today when onboarding is complete", () => {
    expect(resolveStartupDestination(true)).toBe(startupDestinations.app);
  });
});
