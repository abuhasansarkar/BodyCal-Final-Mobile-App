import { describe, expect, it } from "@jest/globals";
import { ConvexError } from "convex/values";

import { describeStartFailure, retryDelaySeconds } from "@/features/scan/start-failure";

/**
 * The rate-limit branch is the reason this module exists.
 *
 * `consumeRateLimit` is the only server error that throws *object* data. The
 * previous inline version read `cause.data` only when it was a string, so the
 * object fell through to `cause.message`, matched nothing, and told the user the
 * analysis had failed when in fact they had simply scanned too fast.
 */
describe("describeStartFailure", () => {
  it("recognises a rate limit and reports when to try again", () => {
    const failure = describeStartFailure(
      new ConvexError({
        code: "rate_limited",
        message: "Too many requests. Please try again shortly.",
        retryAfterMs: 12_000,
      }),
    );

    expect(failure).toEqual({
      messageKey: "scan.errorRateLimitedSeconds",
      messageParams: { seconds: 12 },
      showUpgrade: false,
      canRetry: true,
    });
  });

  it("still recognises a rate limit when the server sent no retry hint", () => {
    const failure = describeStartFailure(new ConvexError({ code: "rate_limited" }));

    expect(failure.messageKey).toBe("scan.errorRateLimited");
    expect(failure.canRetry).toBe(true);
  });

  /**
   * The limiter's own message contains "requests", not "limit" — but a future
   * wording that did contain it must not be reported as an exhausted daily
   * allowance, which is a different thing the user cannot retry out of.
   */
  it("does not mistake a rate limit for the daily quota", () => {
    const failure = describeStartFailure(
      new ConvexError({ code: "rate_limited", message: "scan limit reached", retryAfterMs: 1_000 }),
    );

    expect(failure.messageKey).not.toBe("scan.errorQuota");
    expect(failure.canRetry).toBe(true);
  });

  it("maps the entitlement refusal to an upgrade prompt", () => {
    const failure = describeStartFailure(new ConvexError("Pro entitlement required"));

    expect(failure).toEqual({
      messageKey: "scan.errorEntitlement",
      showUpgrade: true,
      canRetry: false,
    });
  });

  it("maps the fair-use ceiling to the quota message, which cannot be retried", () => {
    const failure = describeStartFailure(new ConvexError("AI scan fair-use limit reached"));

    expect(failure.messageKey).toBe("scan.errorQuota");
    expect(failure.canRetry).toBe(false);
  });

  it("falls back to the generic message for anything unrecognised", () => {
    expect(describeStartFailure(new Error("something odd")).messageKey).toBe("scan.errorGeneric");
    expect(describeStartFailure(undefined).messageKey).toBe("scan.errorGeneric");
  });
});

describe("retryDelaySeconds", () => {
  it("rounds up so a sub-second wait is never advertised as no wait", () => {
    expect(retryDelaySeconds(1)).toBe(1);
    expect(retryDelaySeconds(1_400)).toBe(2);
  });

  it("rejects anything that is not a usable number", () => {
    expect(retryDelaySeconds(undefined)).toBeNull();
    expect(retryDelaySeconds("12000")).toBeNull();
    expect(retryDelaySeconds(Number.NaN)).toBeNull();
  });
});
