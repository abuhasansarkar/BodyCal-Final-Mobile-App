import { describe, expect, it } from "@jest/globals";

import { isNonFatalRevenueCatUiConfigMessage } from "@/features/subscription/revenuecat-logging";

describe("RevenueCat logging", () => {
  it.each([
    "Could not resolve remote config blob(s) for 4 of 4 requested item(s) in topic 'ui_config'. Returning null.",
    "Failed to ready ui_config before getOfferings; proceeding without it. Throwable: Required value was null.",
  ])("recognizes the non-fatal ui_config fallback: %s", (message) => {
    expect(isNonFatalRevenueCatUiConfigMessage(message)).toBe(true);
  });

  it.each([
    "There is an issue with your configuration.",
    "Failed to load offerings.",
    "Could not resolve remote config blob(s) in topic 'workflows'.",
  ])("does not hide a genuine RevenueCat error: %s", (message) => {
    expect(isNonFatalRevenueCatUiConfigMessage(message)).toBe(false);
  });
});
