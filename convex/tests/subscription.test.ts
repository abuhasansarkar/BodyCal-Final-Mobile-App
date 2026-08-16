import { describe, expect, it } from "@jest/globals";

import { api, internal } from "../_generated/api";
import { createUser, setupTest} from "./setup";

const HOUR = 60 * 60 * 1_000;

function event(overrides: Partial<Parameters<typeof buildEvent>[0]> = {}) {
  return buildEvent({ ...overrides });
}

function buildEvent(input: {
  eventId?: string;
  customerId?: string;
  eventType?: string;
  eventAt?: number;
  productId?: string;
  periodType?: string;
  expirationAt?: number;
  willRenew?: boolean;
}) {
  return {
    eventId: input.eventId ?? "evt-1",
    customerId: input.customerId ?? "user_sub",
    eventType: input.eventType ?? "INITIAL_PURCHASE",
    eventAt: input.eventAt ?? 1_000,
    payload: {
      productId: input.productId ?? "bodycal_annual",
      periodType: input.periodType ?? "NORMAL",
      expirationAt: input.expirationAt,
      willRenew: input.willRenew,
    },
  };
}

/**
 * H-02: replay protection, out-of-order delivery, and the purchase-before-signup
 * race. RevenueCat stays the source of truth; this table is only a gating mirror.
 */
describe("subscription mirror", () => {
  it("applies a purchase event and unlocks pro", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(internal.subscriptions.applyWebhook, event({ willRenew: true }));

    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("active");
    expect(mirror?.willRenew).toBe(true);
  });

  it("ignores a replayed event even after the mirror has moved on", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(internal.subscriptions.applyWebhook, event({ eventId: "evt-1", eventAt: 1_000 }));
    await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ eventId: "evt-2", eventType: "RENEWAL", eventAt: 2_000 }),
    );

    // Replaying the first event must not resurrect the older state.
    const replay = await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ eventId: "evt-1", eventAt: 1_000 }),
    );
    expect(replay.status).toBe("duplicate");

    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("active");
  });

  it("does not let a late expiration event overwrite newer active state", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ eventId: "renewal", eventType: "RENEWAL", eventAt: 5_000, willRenew: true }),
    );

    const stale = await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ eventId: "old-expiry", eventType: "EXPIRATION", eventAt: 1_000 }),
    );

    expect(stale.status).toBe("stale_event");
    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("active");
  });

  it("applies a newer expiration event", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(internal.subscriptions.applyWebhook, event({ eventId: "buy", eventAt: 1_000 }));
    await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ eventId: "expire", eventType: "EXPIRATION", eventAt: 9_000 }),
    );

    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("expired");
  });

  /** The purchase-before-signup race that previously dropped the event entirely. */
  it("queues an event for an unknown customer and replays it after sign-up", async () => {
    const t = setupTest();

    const queued = await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ customerId: "user_late", eventId: "early-buy" }),
    );
    expect(queued.status).toBe("pending");

    // syncFromClerk schedules applyPendingEvents; call it directly here.
    const { asUser } = await createUser(t, "user_late");
    const replayed = await t.mutation(internal.subscriptions.applyPendingEvents, {
      customerId: "user_late",
    });

    expect(replayed.applied).toBe(1);
    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("active");
  });

  it("marks a trial as trial, not active", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(internal.subscriptions.applyWebhook, event({ periodType: "TRIAL" }));

    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("trial");
    expect(mirror?.trial).toBe(true);
  });

  it("keeps a cancelled subscription active until it expires", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ eventType: "CANCELLATION", willRenew: false, expirationAt: Date.now() + HOUR }),
    );

    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("cancelledActive");
    expect(mirror?.willRenew).toBe(false);
  });

  it("keeps a paused subscription active until RevenueCat sends expiration", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(
      internal.subscriptions.applyWebhook,
      event({ eventType: "SUBSCRIPTION_PAUSED", expirationAt: Date.now() + HOUR }),
    );

    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("cancelledActive");
  });

  /** Verification must never claim `willRenew` just because the sub is active. */
  it("reports willRenew false for an active but cancelled subscription", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_sub");

    await t.mutation(internal.subscriptions.applyVerification, {
      customerId: "user_sub",
      active: true,
      trial: false,
      productId: "bodycal_annual",
      willRenew: false,
      unsubscribeDetected: true,
    });

    const mirror = await asUser.query(api.subscriptions.getMirror, {});
    expect(mirror?.state).toBe("cancelledActive");
    expect(mirror?.willRenew).toBe(false);
  });

  it("does not expose another user's mirror", async () => {
    const t = setupTest();
    await createUser(t, "user_sub");
    const other = await createUser(t, "user_other");

    await t.mutation(internal.subscriptions.applyWebhook, event({ customerId: "user_sub" }));

    await expect(other.asUser.query(api.subscriptions.getMirror, {})).resolves.toBeNull();
  });
});

describe("AI scan gating", () => {
  it("refuses a scan without an entitlement", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_free");

    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob([new Uint8Array(32)], { type: "image/jpeg" })),
    );
    await asUser.mutation(api.uploads.claim, { storageId, purpose: "mealScan" });

    await expect(
      t.withIdentity({ subject: "user_free" }).mutation(internal.aiDb.begin, {
        storageId,
        requestId: "scan-1",
        locale: "en",
        provider: "openai",
        model: "gpt-4o-mini",
      }),
    ).rejects.toThrow(/entitlement/i);
  });

  it("reports quota without the client having to fail first", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_pro");

    const quota = await asUser.query(api.aiDb.getScanQuota, {});
    expect(quota.dailyUsed).toBe(0);
    expect(quota.dailyLimit).toBeGreaterThan(0);
  });
});
