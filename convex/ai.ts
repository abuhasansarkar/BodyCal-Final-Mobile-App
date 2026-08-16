"use node";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { logProviderMisconfiguration, readProviderConfig } from "./lib/aiProvider";
import { detectImageMimeType } from "./lib/validation";

/** Text bounds, applied after parsing rather than on the wire. See `estimateSchema`. */
const TEXT_LIMITS = { component: 100, mealName: 120, warning: 240 } as const;

/**
 * Structured estimate contract. Bounds are plausibility limits, not precision
 * claims — a value outside them means the provider produced something unusable.
 *
 * String lengths are deliberately absent here. OpenAI's strict Structured
 * Outputs mode permits `minimum`/`maximum` on numbers and `minItems`/`maxItems`
 * on arrays, but **not** `minLength`/`maxLength` on strings, and it rejects the
 * entire request when it sees one — before the model ever looks at the photo.
 * Declaring them with Zod put them straight into the emitted JSON Schema, so
 * every scan failed with a provider error that surfaced as "the analysis did not
 * finish". `normalizeEstimate` enforces the same bounds on the way out instead.
 *
 * https://developers.openai.com/api/docs/guides/structured-outputs
 */
/** Per-item nutrition. The same four values the day total is built from. */
const componentNutritionSchema = z.object({
  calories: z.number().min(0).max(10_000),
  proteinGrams: z.number().min(0).max(1_000),
  carbsGrams: z.number().min(0).max(2_000),
  fatGrams: z.number().min(0).max(1_000),
});

export const estimateSchema = z.object({
  /*
    Whether the photo shows food at all. A keyboard is not a 0-calorie meal, and
    inventing one would be the single worst thing this feature could do, so the
    model is given an explicit way to say "no" and the server refuses to persist
    nutrition alongside it.
  */
  isFood: z.boolean(),
  mealName: z.string(),
  /** Preselects the meal on the review screen. "unknown" leaves it to the clock. */
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "drink", "unknown"]),
  summary: z.string(),
  components: z
    .array(
      z.object({
        name: z.string(),
        /** How it appears to have been cooked: grilled, fried, raw, breaded. */
        preparation: z.string(),
        portion: z.string(),
        estimatedWeightGrams: z.number().min(0).max(5_000).nullable(),
        nutrition: componentNutritionSchema,
        /** Per-item certainty, 0–1, as the prompt contract specifies. */
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(25),
  nutrition: z.object({
    calories: z.number().min(0).max(10_000),
    proteinGrams: z.number().min(0).max(1_000),
    carbsGrams: z.number().min(0).max(2_000),
    fatGrams: z.number().min(0).max(1_000),
    /*
      Detail beyond the four values a day total is built from. Nullable rather
      than optional: OpenAI structured outputs require every property to appear
      in `required`, so "the photo does not support this value" has to travel as
      an explicit null instead of an absent key. A null is displayed as
      not-estimated rather than as a zero — reading "0 g of sugar" off a photo
      the model could not judge would be a measurement claim, not an estimate.
    */
    saturatedFatGrams: z.number().min(0).max(1_000).nullable(),
    fiberGrams: z.number().min(0).max(500).nullable(),
    sugarGrams: z.number().min(0).max(1_000).nullable(),
    sodiumMilligrams: z.number().min(0).max(50_000).nullable(),
  }),
  /** The honest width of the estimate, which a single number cannot express. */
  calorieRange: z.object({
    minCalories: z.number().min(0).max(10_000),
    maxCalories: z.number().min(0).max(10_000),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  portionConfidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()).max(10),
  warnings: z.array(z.string()).max(10),
});

export type MealEstimateShape = z.infer<typeof estimateSchema>;

function bounded(value: string, max: number) {
  return value.trim().slice(0, max);
}

/**
 * How far the stated meal total may sit from the sum of its items.
 *
 * The model estimates each food and then totals them, and the two are allowed to
 * disagree a little — rounding, and shared items like a dressing counted once.
 * A wide disagreement means one of the two is not describing the photo, and
 * neither can be trusted enough to add to somebody's day.
 */
const TOTAL_TOLERANCE = { ratio: 0.25, floor: 60 } as const;

function totalsDisagree(total: number, sum: number, floor: number = TOTAL_TOLERANCE.floor) {
  return Math.abs(total - sum) > Math.max(floor, total * TOTAL_TOLERANCE.ratio);
}

/** Raised when the provider's own numbers contradict each other. */
class ImplausibleEstimateError extends Error {}

/** Raised when the photo contains nothing to estimate. Not a provider fault. */
export class NoFoodError extends Error {}

/**
 * Applies the length bounds the wire schema cannot carry, drops anything the
 * provider returned empty, and refuses an estimate that contradicts itself.
 *
 * Throws rather than persisting a half-usable estimate: a meal with no name, no
 * components, or a calorie total its own items do not support is not something
 * to show the user as a result — and silently rewriting it to zeroes would turn
 * a failed analysis into a confident wrong answer.
 */
export function normalizeEstimate(raw: MealEstimateShape) {
  if (!raw.isFood) throw new NoFoodError("The photo does not show food");

  const mealName = bounded(raw.mealName, TEXT_LIMITS.mealName);
  if (!mealName) throw new ImplausibleEstimateError("The estimate has no meal name");

  const components = raw.components
    .map((component) => ({
      name: bounded(component.name, TEXT_LIMITS.component),
      preparation: bounded(component.preparation, TEXT_LIMITS.component),
      portion: bounded(component.portion, TEXT_LIMITS.component),
      estimatedWeightGrams: component.estimatedWeightGrams,
      nutrition: component.nutrition,
      confidence: component.confidence,
    }))
    .filter((component) => component.name.length > 0 && component.portion.length > 0)
    .slice(0, 25);
  if (components.length === 0) {
    throw new ImplausibleEstimateError("The estimate has no usable components");
  }
  if (components.some((component) => component.estimatedWeightGrams === 0)) {
    throw new ImplausibleEstimateError("An estimated weight must be positive or unknown");
  }

  // Food was identified, so the meal has to carry energy. A zero here means the
  // model filled the shape in without reading the photo.
  if (raw.nutrition.calories <= 0) {
    throw new ImplausibleEstimateError("The estimate has no calories");
  }

  const summed = components.reduce((total, component) => total + component.nutrition.calories, 0);
  if (totalsDisagree(raw.nutrition.calories, summed)) {
    throw new ImplausibleEstimateError("The meal total does not match its items");
  }
  for (const key of ["proteinGrams", "carbsGrams", "fatGrams"] as const) {
    const componentTotal = components.reduce(
      (total, component) => total + component.nutrition[key],
      0,
    );
    if (totalsDisagree(raw.nutrition[key], componentTotal, 10)) {
      throw new ImplausibleEstimateError(`The meal ${key} total does not match its items`);
    }
  }

  // Clamped rather than rejected: a range that does not bracket its own midpoint
  // is a presentation problem, not evidence that the estimate is wrong.
  const rawMin = Number.isFinite(raw.calorieRange.minCalories) ? Math.max(0, raw.calorieRange.minCalories) : 0;
  const rawMax = Number.isFinite(raw.calorieRange.maxCalories) ? Math.max(0, raw.calorieRange.maxCalories) : raw.nutrition.calories;
  const minCalories = Math.min(rawMin, raw.nutrition.calories);
  const maxCalories = Math.max(rawMax, raw.nutrition.calories, minCalories);

  const boundedList = (values: string[], max: number) =>
    values
      .map((value) => bounded(value, TEXT_LIMITS.warning))
      .filter((value) => value.length > 0)
      .slice(0, max);

  return {
    ...raw,
    mealName,
    summary: bounded(raw.summary, TEXT_LIMITS.warning),
    components,
    calorieRange: { minCalories, maxCalories },
    assumptions: boundedList(raw.assumptions, 10),
    warnings: boundedList(raw.warnings, 10),
  };
}

/** Locale is echoed into the prompt, so only known launch languages are accepted. */
const SUPPORTED_LOCALES = new Set(["en", "es", "de", "fr", "pt-BR", "it", "ja", "ko"]);

/** How long a mirrored entitlement is trusted before re-verifying with RevenueCat. */
const ENTITLEMENT_FRESHNESS_MS = 15 * 60 * 1_000;

/**
 * Starts a scan and returns as soon as it is durable.
 *
 * This deliberately does **not** wait for the provider. The previous version
 * awaited the whole OpenAI round trip through the client's action call, which
 * made the result only as durable as the screen that asked for it: backgrounding
 * the app, locking the phone or switching networks lost the answer, while the
 * scan quietly completed server-side with nothing able to reach it. The work now
 * runs on the scheduler and the client follows `aiDb.getScan`.
 */
export const startScan = action({
  args: {
    storageId: v.id("_storage"),
    locale: v.string(),
    requestId: v.string(),
  },
  returns: v.object({ scanId: v.id("aiScans"), duplicate: v.boolean() }),
  // Explicit return type: this action calls into `internal`, which includes this
  // module, so inference would otherwise be circular.
  handler: async (ctx, args): Promise<{ scanId: Id<"aiScans">; duplicate: boolean }> => {
    const provider = readProviderConfig();
    if (!provider) {
      logProviderMisconfiguration("ai.startScan");
      throw new ConvexError("AI provider is not configured");
    }

    const locale = SUPPORTED_LOCALES.has(args.locale) ? args.locale : "en";
    if (args.requestId.length === 0 || args.requestId.length > 64) {
      throw new ConvexError("Invalid request id");
    }

    // Re-verify with RevenueCat only when the mirror is stale or missing, rather
    // than adding a provider round-trip to every single scan. This has to happen
    // here, in the authenticated call, because the scheduled action that follows
    // has no identity to verify with.
    const fresh = await ctx.runQuery(internal.aiDb.isEntitlementFresh, {
      maxAgeMs: ENTITLEMENT_FRESHNESS_MS,
    });
    if (!fresh) {
      const entitlement = await ctx.runAction(internal.subscriptionsActions.verifyForCurrentUser, {});
      if (!entitlement.active) throw new ConvexError("Pro entitlement required");
    }

    // `begin` is idempotent on (user, requestId): a resent request rejoins the
    // scan it already created instead of buying a second one.
    const start = await ctx.runMutation(internal.aiDb.begin, {
      storageId: args.storageId,
      requestId: args.requestId,
      locale,
      provider: "openai",
      model: provider.model,
    });

    if (!start.duplicate) {
      await ctx.scheduler.runAfter(0, internal.ai.runScanAnalysis, { scanId: start.scanId });
    }
    console.log("[food-analysis] scan started", { scanId: start.scanId, duplicate: start.duplicate });
    return { scanId: start.scanId, duplicate: start.duplicate };
  },
});

/**
 * MIME types the provider accepts.
 *
 * The stored content type comes from a client header and is never trusted. The
 * action detects the signature from the bytes and rejects anything it cannot
 * prove is one of these provider-supported formats.
 */
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Transient faults worth spending another attempt on. */
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

/** Backoff before attempt 2 and attempt 3. */
const RETRY_DELAYS_MS = [2_000, 8_000] as const;

type Failure = { category: string; retryInMs?: number };

/**
 * Classifies a provider failure into a category and whether another attempt is
 * worth buying.
 *
 * A rejected request schema and a rate limit are the same user-facing failure
 * but opposite decisions: one will never succeed, the other almost certainly
 * will. Retrying the first wastes money and keeps the user watching a spinner.
 */
function classifyFailure(cause: unknown, attempt: number): Failure {
  const delay = RETRY_DELAYS_MS[attempt - 1];
  const retry = delay === undefined ? {} : { retryInMs: delay };

  if (cause instanceof OpenAI.APIConnectionTimeoutError) return { category: "timeout", ...retry };
  if (cause instanceof OpenAI.APIConnectionError) return { category: "connection", ...retry };
  if (cause instanceof OpenAI.APIError) {
    const status = cause.status ?? 0;
    return {
      category: `provider:${status}`,
      ...(RETRYABLE_STATUS.has(status) ? retry : {}),
    };
  }
  if (cause instanceof ImageUnavailableError) return { category: "image_unavailable" };
  // The photo has no food in it. Retrying the same photo will reach the same
  // conclusion, and it is an answer rather than a fault.
  if (cause instanceof NoFoodError) return { category: "no_food" };
  // A structured response that did not survive validation. Worth exactly one
  // more attempt — the model is sampled, so the next one may well parse.
  return { category: "validation", ...retry };
}

class ImageUnavailableError extends Error {}

/**
 * Runs one analysis attempt for an already-queued scan.
 *
 * Internal and scheduled: it has no identity, takes no user input beyond a scan
 * id, and cannot be reached from a client. Whether it does any paid work at all
 * is decided by `aiDb.claimForAnalysis`, not by the caller.
 */
export const runScanAnalysis = internalAction({
  args: { scanId: v.id("aiScans") },
  returns: v.null(),
  handler: async (ctx, { scanId }): Promise<null> => {
    const provider = readProviderConfig();
    if (!provider) {
      logProviderMisconfiguration("ai.runScanAnalysis");
      await ctx.runMutation(internal.aiDb.fail, {
        scanId,
        failureCategory: "not_configured",
        latencyMs: 0,
      });
      return null;
    }

    // The claim is the duplicate-charge guard: it succeeds for exactly one
    // caller per queued scan, and returns null for a scan already running,
    // already finished, or already given up on.
    const claim = await ctx.runMutation(internal.aiDb.claimForAnalysis, { scanId });
    if (!claim) {
      console.log("[food-analysis] scan not claimable, skipping", { scanId });
      return null;
    }

    const startedAt = Date.now();
    try {
      const blob = await ctx.storage.get(claim.storageId);
      if (!blob) throw new ImageUnavailableError("Image is unavailable");

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      if (blob.size <= 0 || blob.size > 4_000_000) {
        throw new ImageUnavailableError("Image size is invalid");
      }
      const contentType = detectImageMimeType(bytes);
      if (!contentType || !SUPPORTED_IMAGE_TYPES.has(contentType)) {
        throw new ImageUnavailableError("Image bytes are not a supported format");
      }
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      // Sent inline rather than as a storage URL, so the analysis does not
      // depend on the provider's fetcher reaching a Convex URL, and no meal
      // photo URL is handed out at all.
      const imageDataUrl = `data:${contentType};base64,${base64}`;
      console.log("[food-analysis] image retrieved", {
        scanId,
        attempt: claim.attempt,
        bytes: blob.size,
        contentType,
      });

      const client = new OpenAI({ apiKey: provider.apiKey, timeout: 60_000, maxRetries: 0 });
      console.log("[food-analysis] calling provider", { scanId, model: claim.model });
      const response = await client.responses.parse({
        model: claim.model,
        // Meal photos are not left with the provider. BodyCal keeps the only
        // durable copy, in Convex storage, under its own retention rules.
        store: false,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "You are a food image nutrition analysis engine. Estimate the nutrition of the meal in this photo.",
                  "If the image contains no identifiable food or drink, set isFood to false and leave the components empty. Never invent a meal for a photo that does not show one.",
                  "Read the whole image, not just the main dish: include every plate, bowl, side, sauce, topping, drink and garnish that is visible, and list each one as its own component with its preparation method, its estimated portion, its estimated weight in grams, and its own calories, protein, carbohydrates and fat.",
                  "Judge portions from plate size, food volume, common serving sizes and the visible cooking method. Account for hidden energy that is visually reasonable — frying and cooking oil, butter, cheese, dressing, cream, sugar, breading — without inventing ingredients you cannot see.",
                  "If a nutrition label is clearly legible, prefer what the label states for that product.",
                  "Then give totals for the entire meal: calories, protein, carbohydrates, and fat. The totals must agree with the sum of the individual items.",
                  "Do not double-count shared sauces, oils, toppings, or ingredients: assign each visible item once, then sum those same items into the meal totals.",
                  "Also give saturated fat, fibre, sugar, and sodium for the meal. Use null for any of those four you cannot judge from the photo rather than guessing a number or returning zero.",
                  "Give a calorie range that honestly brackets your total, and a portionConfidence between 0 and 1. If portion size cannot be judged confidently, widen the range and lower the confidence rather than guessing precisely.",
                  "List the assumptions you relied on separately from the warnings.",
                  `Write all user-facing text in the "${claim.locale}" language.`,
                  "These are estimates read from a photograph, never measurements. Be conservative, never claim precision, never return negative or impossible values, and include warnings for low confidence, hidden ingredients such as cooking oil or dressing, and portions that are hard to judge without a size reference.",
                ].join(" "),
              },
              /*
                `high` detail, so the model receives the full 1,600px upload
                rather than a 512px thumbnail. Portion size, side dishes and
                garnishes are the first things to disappear at low detail, and
                they are exactly what the estimate depends on. It costs more
                image tokens per scan; the fair-use limits in `aiDb` bound that.
              */
              { type: "input_image", image_url: imageDataUrl, detail: "high" },
            ],
          },
        ],
        text: { format: zodTextFormat(estimateSchema, "nutrition_estimate") },
      });

      if (!response.output_parsed) throw new Error("The provider returned no structured estimate");
      console.log("[food-analysis] provider response received", { scanId });

      const estimate = normalizeEstimate(estimateSchema.parse(response.output_parsed));
      console.log("[food-analysis] structured response validated", { scanId });

      await ctx.runMutation(internal.aiDb.complete, {
        scanId,
        estimate,
        confidence: estimate.confidence,
        latencyMs: Date.now() - startedAt,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      });
      console.log("[food-analysis] scan completed", { scanId, attempt: claim.attempt });
      return null;
    } catch (cause) {
      const failure = classifyFailure(cause, claim.attempt);
      const apiError = cause instanceof OpenAI.APIError ? cause : null;

      /*
        The user-facing message stays deliberately vague — provider internals are
        not the user's problem — but something has to record *which* failure it
        was, or a rejected request schema is indistinguishable from a rate limit
        and every scan just reads "the analysis did not finish".

        Only an `APIError`'s own fields are logged. They describe our request (an
        HTTP status, an OpenAI error code, a schema complaint) and never the
        photo, the image bytes, the key, or the nutrition read off it. A
        validation failure can quote parsed values, so it contributes nothing
        beyond its category.
      */
      console.error("[food-analysis] failed", {
        scanId,
        attempt: claim.attempt,
        errorType: failure.category,
        statusCode: apiError?.status ?? null,
        code: apiError?.code ?? null,
        willRetry: failure.retryInMs !== undefined,
      });

      // Errors are recorded, never rethrown: a scheduled action that throws is
      // retried by nothing and observed by no one. The scan row is the channel
      // the user is actually watching.
      await ctx.runMutation(internal.aiDb.fail, {
        scanId,
        failureCategory: failure.category,
        latencyMs: Date.now() - startedAt,
        retryInMs: failure.retryInMs,
      });
      return null;
    }
  },
});
