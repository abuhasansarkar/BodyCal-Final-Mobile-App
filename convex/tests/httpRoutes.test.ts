import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import http from "../http";
import { setupTest } from "./setup";

const WEBHOOK_SECRET = "test-webhook-secret";

function webhookInit(entitlementIds: string[], eventId: string): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: {
        id: eventId,
        type: "INITIAL_PURCHASE",
        app_user_id: "user_webhook",
        entitlement_ids: entitlementIds,
        product_id: "bodycal_annual",
        period_type: "NORMAL",
        event_timestamp_ms: 1_000,
        expiration_at_ms: 2_000_000_000_000,
        will_renew: true,
      },
    }),
  };
}

describe("HTTP routes", () => {
  it("accepts both configured RevenueCat webhook paths", () => {
    const routes = http.getRoutes().map(([path, method]) => `${method} ${path}`);

    expect(routes).toContain("POST /revenuecat/webhook");
    expect(routes).toContain("POST /revenuecat-webhook");
  });
});

/**
 * The entitlement identifier is pinned in three places — `subscription-state.ts`,
 * `subscriptionsActions.ts` and here — and all three must agree on casing.
 * The webhook was the one that compared exactly, so a dashboard entitlement
 * named `Pro` granted access on the device and verified through REST while every
 * webhook for it was dropped, leaving the server gate that guards AI scanning
 * switched off for a paying subscriber.
 */
describe("RevenueCat webhook entitlement matching", () => {
  const originalSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.REVENUECAT_WEBHOOK_SECRET;
    else process.env.REVENUECAT_WEBHOOK_SECRET = originalSecret;
  });

  it.each(["pro", "Pro", "PRO"])("applies an event carrying %s", async (entitlementId) => {
    const t = setupTest();

    const response = await t.fetch(
      "/revenuecat/webhook",
      webhookInit([entitlementId], `evt-${entitlementId}`),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).not.toBe("ignored");
  });

  it("still ignores an event that grants only a different entitlement", async () => {
    const t = setupTest();

    const response = await t.fetch(
      "/revenuecat/webhook",
      webhookInit(["premium", "lifetime"], "evt-other"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ignored");
  });
});
