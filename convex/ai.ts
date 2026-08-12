"use node";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  actionGeneric as action,
  makeFunctionReference,
} from "convex/server";
import { ConvexError, v } from "convex/values";

const estimateSchema = z.object({
  mealName: z.string().min(1).max(120),
  components: z.array(z.object({ name: z.string().min(1).max(100), portion: z.string().min(1).max(100) })).min(1).max(25),
  nutrition: z.object({ calories: z.number().min(1).max(10_000), proteinGrams: z.number().min(0).max(1_000), carbsGrams: z.number().min(0).max(2_000), fatGrams: z.number().min(0).max(1_000) }),
  confidence: z.enum(["low", "medium", "high"]),
  warnings: z.array(z.string().max(240)).max(10),
});

const beginRef = makeFunctionReference<"mutation">("aiDb:_begin");
const completeRef = makeFunctionReference<"mutation">("aiDb:_complete");
const failRef = makeFunctionReference<"mutation">("aiDb:_fail");
const verifyEntitlementRef = makeFunctionReference<"action">("subscriptionsActions:verifyEntitlement");

export const analyzeMeal = action({
  args: { storageId: v.id("_storage"), locale: v.string(), requestId: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.AI_API_KEY; const model = process.env.AI_MODEL ?? "gpt-4o-mini";
    if (!apiKey) throw new ConvexError("AI provider is not configured");
    const entitlement = await ctx.runAction(verifyEntitlementRef, {}) as { active: boolean };
    if (!entitlement.active) throw new ConvexError("Pro entitlement required");
    const startedAt = Date.now();
    const start = await ctx.runMutation(beginRef, { ...args, provider: "openai", model }) as { scanId: string; duplicate: boolean; estimate?: unknown };
    if (start.duplicate && start.estimate) return { ...(start.estimate as object), scanId: start.scanId };
    try {
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) throw new Error("Image is unavailable");
      const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
      const response = await client.responses.parse({
        model,
        input: [{ role: "user", content: [
          { type: "input_text", text: `Estimate the visible meal's components, portions, calories, protein, carbohydrates, and fat. Reply in ${args.locale}. Be conservative, never claim precision, and include warnings for low confidence.` },
          { type: "input_image", image_url: imageUrl, detail: "low" },
        ] }],
        text: { format: zodTextFormat(estimateSchema, "nutrition_estimate") },
      });
      if (!response.output_parsed) throw new Error("The provider returned no structured estimate");
      await ctx.runMutation(completeRef, { scanId: start.scanId, estimate: response.output_parsed, latencyMs: Date.now() - startedAt, inputTokens: response.usage?.input_tokens, outputTokens: response.usage?.output_tokens });
      return { ...response.output_parsed, scanId: start.scanId };
    } catch (cause) {
      const category = cause instanceof OpenAI.APIConnectionTimeoutError ? "timeout" : cause instanceof OpenAI.APIError ? "provider" : "validation";
      await ctx.runMutation(failRef, { scanId: start.scanId, failureCategory: category, latencyMs: Date.now() - startedAt });
      throw new ConvexError(category === "timeout" ? "Meal analysis timed out" : "Meal analysis failed");
    }
  },
});
