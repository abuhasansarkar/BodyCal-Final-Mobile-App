import { httpActionGeneric as httpAction, httpRouter, makeFunctionReference } from "convex/server";

const http = httpRouter();
const applyWebhook = makeFunctionReference<"mutation">("subscriptions:_applyWebhook");

http.route({
  path: "/revenuecat/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return new Response("Unauthorized", { status: 401 });
    try {
      const payload = await request.json() as { event?: Record<string, unknown> };
      const event = payload.event;
      if (!event || typeof event.id !== "string" || typeof event.app_user_id !== "string" || typeof event.type !== "string") return new Response("Invalid payload", { status: 400 });
      await ctx.runMutation(applyWebhook, {
        eventId: event.id,
        customerId: event.app_user_id,
        eventType: event.type,
        productId: typeof event.product_id === "string" ? event.product_id : undefined,
        periodType: typeof event.period_type === "string" ? event.period_type : undefined,
        expirationAt: typeof event.expiration_at_ms === "number" ? event.expiration_at_ms : undefined,
        willRenew: typeof event.will_renew === "boolean" ? event.will_renew : undefined,
      });
      return new Response("OK", { status: 200 });
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
  }),
});

export default http;
