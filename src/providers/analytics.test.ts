import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "@jest/globals";

import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry";
import { ANALYTICS_CONSENT_KEY, readAnalyticsConsent } from "@/providers/analytics-provider";

describe("privacy and analytics controls", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("reads default unknown consent when unset", async () => {
    const consent = await readAnalyticsConsent();
    expect(consent).toBe("unknown");
  });

  it("reads granted consent from storage", async () => {
    await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    const consent = await readAnalyticsConsent();
    expect(consent).toBe("granted");
  });

  it("reads denied consent from storage", async () => {
    await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, "denied");
    const consent = await readAnalyticsConsent();
    expect(consent).toBe("denied");
  });

  describe("Sentry PII scrubbing", () => {
    it("strips request payloads and response contexts", () => {
      const rawEvent = {
        request: { url: "https://api.example.com", headers: { Authorization: "Bearer secret" } },
        contexts: { response: { status: 200, data: "sensitive" } },
        extra: { mealName: "Private Steak", calories: 850, weightKg: 75 },
        user: { id: "user_123", email: "private@example.com", username: "user" },
      };

      const scrubbed = scrubEvent(rawEvent);
      expect(scrubbed.request).toBeUndefined();
      expect(scrubbed.extra).toBeUndefined();
      expect(scrubbed.contexts?.response).toBeUndefined();
      expect(scrubbed.user).toEqual({ id: "user_123" });
    });

    it("drops console, xhr, and fetch breadcrumbs", () => {
      expect(scrubBreadcrumb({ category: "console", message: "User log" })).toBeNull();
      expect(scrubBreadcrumb({ category: "xhr", data: { url: "https://api.convex.dev" } })).toBeNull();
      expect(scrubBreadcrumb({ category: "fetch", data: { url: "https://api.revenuecat.com" } })).toBeNull();
    });

    it("strips data payloads from permitted breadcrumbs", () => {
      const breadcrumb = { category: "navigation", message: "Screen change", data: { screen: "Today" } };
      const scrubbed = scrubBreadcrumb(breadcrumb);
      expect(scrubbed).not.toBeNull();
      expect(scrubbed?.data).toBeUndefined();
    });
  });
});
