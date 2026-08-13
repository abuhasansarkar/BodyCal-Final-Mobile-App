"use node";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

/**
 * Structured estimate contract. Bounds are plausibility limits, not precision
 * claims — a value outside them means the provider produced something unusable.
 */
const estimateSchema = z.object({
  mealName: z.string().min(1).max(120),
  components: z
    .array(z.object({ name: z.string().min(1).max(100), portion: z.string().min(1).max(100) }))
    .min(1)
    .max(25),
  nutrition: z.object({
    calories: z.number().min(1).max(10_000),
    proteinGrams: z.number().min(0).max(1_000),
    carbsGrams: z.number().min(0).max(2_000),
    fatGrams: z.number().min(0).max(1_000),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  warnings: z.array(z.string().max(240)).max(10),
});

/** Locale is echoed into the prompt, so only known launch languages are accepted. */
const SUPPORTED_LOCALES = new Set(["en", "es", "de", "fr", "pt-BR", "it", "ja", "ko"]);

/** How long a mirrored entitlement is trusted before re-verifying with RevenueCat. */
const ENTITLEMENT_FRESHNESS_MS = 15 * 60 * 1_000;

export type MealEstimate = z.infer<typeof estimateSchema>;
export type MealEstimateResult = MealEstimate & { scanId: Id<"aiScans"> };

export const analyzeMeal = action({
  args: {
    storageId: v.id("_storage"),
    locale: v.string(),
    requestId: v.string(),
  },
  // Explicit return type: this action calls into `internal`, which includes this
  // module, so inference would otherwise be circular.
  handler: async (ctx, args): Promise<MealEstimateResult> => {
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL ?? "gpt-4o-mini";
    if (!apiKey) throw new ConvexError("AI provider is not configured");

    const locale = SUPPORTED_LOCALES.has(args.locale) ? args.locale : "en";
    if (args.requestId.length === 0 || args.requestId.length > 64) {
      throw new ConvexError("Invalid request id");
    }

    // Re-verify with RevenueCat only when the mirror is stale or missing, rather
    // than adding a provider round-trip to every single scan.
    const fresh = await ctx.runQuery(internal.aiDb.isEntitlementFresh, {
      maxAgeMs: ENTITLEMENT_FRESHNESS_MS,
    });
    if (!fresh) {
      const entitlement = await ctx.runAction(internal.subscriptionsActions.verifyForCurrentUser, {});
      if (!entitlement.active) throw new ConvexError("Pro entitlement required");
    }

    const startedAt = Date.now();
    const start = await ctx.runMutation(internal.aiDb.begin, {
      storageId: args.storageId,
      requestId: args.requestId,
      locale,
      provider: "openai",
      model,
    });
    if (start.duplicate && start.estimate) {
      return { ...(start.estimate as MealEstimate), scanId: start.scanId };
    }

    try {
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) throw new Error("Image is unavailable");

      const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
      const response = await client.responses.parse({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Estimate the visible meal's components, portions, calories, protein, carbohydrates, and fat.",
                  `Write all text in the "${locale}" language.`,
                  "Be conservative, never claim precision, and include warnings for low confidence.",
                ].join(" "),
              },
              { type: "input_image", image_url: imageUrl, detail: "low" },
            ],
          },
        ],
        text: { format: zodTextFormat(estimateSchema, "nutrition_estimate") },
      });

      if (!response.output_parsed) throw new Error("The provider returned no structured estimate");
      const estimate = estimateSchema.parse(response.output_parsed);

      await ctx.runMutation(internal.aiDb.complete, {
        scanId: start.scanId,
        estimate,
        confidence: estimate.confidence,
        latencyMs: Date.now() - startedAt,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      });
      return { ...estimate, scanId: start.scanId };
    } catch (cause) {
      const category =
        cause instanceof OpenAI.APIConnectionTimeoutError
          ? "timeout"
          : cause instanceof OpenAI.APIError
            ? "provider"
            : "validation";
      await ctx.runMutation(internal.aiDb.fail, {
        scanId: start.scanId,
        failureCategory: category,
        latencyMs: Date.now() - startedAt,
      });
      throw new ConvexError(
        category === "timeout" ? "Meal analysis timed out" : "Meal analysis failed",
      );
    }
  },
});
