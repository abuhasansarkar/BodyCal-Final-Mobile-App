import { describe, expect, it } from "@jest/globals";

import { i18n, languageOptions } from "@/locales/i18n";

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
    ]) {
      expect(i18n.t(key, { lng: code })).not.toBe(key);
    }
  });
});
