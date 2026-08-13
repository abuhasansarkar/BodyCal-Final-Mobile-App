import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

/**
 * Length-independent comparison so a wrong secret cannot be discovered by
 * timing the response. Both sides are hashed to a fixed width first.
 */
async function secretsMatch(provided: string, expected: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

const http = httpRouter();

http.route({
  path: "/revenuecat/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expected) return new Response("Not configured", { status: 503 });

    const authorization = request.headers.get("authorization") ?? "";
    if (!(await secretsMatch(authorization, `Bearer ${expected}`))) {
      return new Response("Unauthorized", { status: 401 });
    }

    let event: Record<string, unknown> | undefined;
    try {
      const payload = (await request.json()) as { event?: Record<string, unknown> };
      event = payload.event;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      !event ||
      typeof event.id !== "string" ||
      typeof event.app_user_id !== "string" ||
      typeof event.type !== "string"
    ) {
      return new Response("Invalid payload", { status: 400 });
    }

    // Store event ordering. Falls back to receipt time when absent so a missing
    // timestamp cannot make an event look infinitely old.
    const eventAt =
      typeof event.event_timestamp_ms === "number"
        ? event.event_timestamp_ms
        : typeof event.purchased_at_ms === "number"
          ? event.purchased_at_ms
          : Date.now();

    const result = await ctx.runMutation(internal.subscriptions.applyWebhook, {
      eventId: event.id.slice(0, 128),
      customerId: event.app_user_id.slice(0, 128),
      eventType: event.type.slice(0, 64),
      eventAt,
      payload: {
        productId: typeof event.product_id === "string" ? event.product_id.slice(0, 128) : undefined,
        periodType: typeof event.period_type === "string" ? event.period_type.slice(0, 32) : undefined,
        expirationAt:
          typeof event.expiration_at_ms === "number" ? event.expiration_at_ms : undefined,
        willRenew: typeof event.will_renew === "boolean" ? event.will_renew : undefined,
      },
    });

    // 200 for every accepted outcome — duplicate, stale and pending are all
    // successful receipts as far as RevenueCat's retry policy is concerned.
    return new Response(result.status, { status: 200 });
  }),
});

export default http;
