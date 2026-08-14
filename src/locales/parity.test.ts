import { describe, expect, it } from "@jest/globals";

import { i18n, languageOptions } from "@/locales/i18n";
import { screenTranslations } from "@/locales/screens";

/**
 * Guards against the failure mode that let French and Italian drift 76 keys behind
 * English: a missing key falls back silently at runtime, so it has to fail here.
 */
function flatten(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flatten(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation key parity", () => {
  const bundles = Object.fromEntries(
    languageOptions.map((option) => [option.code, i18n.getResourceBundle(option.code, "translation")]),
  );
  const englishKeys = new Set(flatten(bundles.en));

  it("has a non-trivial English bundle", () => {
    expect(englishKeys.size).toBeGreaterThan(400);
  });

  /**
   * `buildBundle` copies namespaces across one by one, so a namespace added to
   * the screen files but never listed there reaches no language at all — and the
   * cross-language check above still passes, because every language is equally
   * missing it. That shipped `nutritionBreakdown.*` as raw keys on screen once.
   */
  it("wires every screen namespace into the bundle", () => {
    // Merged into an existing namespace by `buildBundle` rather than exposed
    // under its own name, so its absence from the top level is deliberate.
    const mergedElsewhere = new Set(["postPurchaseReview"]);
    const unwired = Object.keys(screenTranslations.en).filter(
      (namespace) => !mergedElsewhere.has(namespace) && !(namespace in bundles.en),
    );
    expect(unwired).toEqual([]);
  });

  it.each(languageOptions.filter((option) => option.code !== "en").map((option) => option.code))(
    "%s defines every English key",
    (code) => {
      const keys = new Set(flatten(bundles[code]));
      const missing = [...englishKeys].filter((key) => !keys.has(key));
      expect(missing).toEqual([]);
    },
  );

  it.each(languageOptions.map((option) => option.code))("%s resolves representative keys", (code) => {
    for (const key of [
      "notificationSettings.title",
      "privacySettings.exportTitle",
      "deleteAccount.confirmAction",
      "scan.analyzingTitle",
      "weight.addTitle",
      "history.title",
      "foodHeadline.lose",
      "authFlow.forgotTitle",
      "progress.title",
      "goalSettings.title",
      "nutritionBreakdown.ofDailyGoal",
      "foodLogEdit.source.ai",
      "foodDetail.nutritionIn",
    ]) {
      expect(i18n.t(key, { lng: code })).not.toBe(key);
    }
  });
});
