import { describe, expect, it } from "@jest/globals";

import { isNonFatalRevenueCatUiConfigMessage } from "@/features/subscription/revenuecat-logging";

describe("RevenueCat logging", () => {
  it.each([
    "Could not resolve remote config blob(s) for 4 of 4 requested item(s) in topic 'ui_config'. Returning null.",
    "Failed to ready ui_config before getOfferings; proceeding without it. Throwable: Required value was null.",
    "Unable to merge remote config blob data for topic 'ui_config': unavailable item keys: app, custom_variables, localizations, variable_config.",
    "Failed to assemble ui_config: one or more parts are unavailable.",
  ])("recognizes the non-fatal ui_config fallback: %s", (message) => {
    expect(isNonFatalRevenueCatUiConfigMessage(message)).toBe(true);
  });

  it.each([
    "There is an issue with your configuration.",
    "Failed to load offerings.",
    "Could not resolve remote config blob(s) in topic 'workflows'.",
    "Unable to merge remote config blob data for topic 'offerings'.",
    "Failed to assemble offerings: one or more parts are unavailable.",
  ])("does not hide a genuine RevenueCat error: %s", (message) => {
    expect(isNonFatalRevenueCatUiConfigMessage(message)).toBe(false);
  });
});
