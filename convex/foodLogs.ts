import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { attachOwnedUpload, loadOwned, requireCurrentUser, requireOwned } from "./lib/auth";
import { confidenceValidator, nullableNumber, readStoredEstimate } from "./lib/estimate";
import { requireHistoryAccess } from "./lib/entitlements";
import {
  assertBoundedString,
  assertEntryNutrition,
  assertLocalDate,
  assertLocalDateRange,
  assertTimezone,
  boundedLimit,
  LIMITS,
} from "./lib/validation";
import { foodSourceValidator, mealTypeValidator } from "./schema";

const ATTACHED_IMAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

const foodLog = v.object({
  _id: v.id("foodLogs"),
  _creationTime: v.number(),
  userId: v.id("users"),
  localDate: v.string(),
  timezone: v.string(),
  mealType: mealTypeValidator,
  source: foodSourceValidator,
  foodName: v.string(),
  serving: v.string(),
  servingUnit: v.string(),
  quantity: v.number(),
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
  imageStorageId: v.optional(v.id("_storage")),
  aiScanId: v.optional(v.id("aiScans")),
  clientRequestId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const entryArgs = {
  localDate: v.string(),
  timezone: v.string(),
  mealType: mealTypeValidator,
  source: foodSourceValidator,
  foodName: v.string(),
  serving: v.string(),
  servingUnit: v.string(),
  quantity: v.number(),
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
  imageStorageId: v.optional(v.id("_storage")),
  aiScanId: v.optional(v.id("aiScans")),
  clientRequestId: v.string(),
};

function normalizeEntry(args: {
  localDate: string;
  timezone: string;
  foodName: string;
  serving: string;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  clientRequestId: string;
}) {
  assertEntryNutrition(args);
  return {
    localDate: assertLocalDate(args.localDate, "localDate"),
    timezone: assertTimezone(args.timezone),
    foodName: assertBoundedString(args.foodName, LIMITS.foodName, "foodName"),
    serving: assertBoundedString(args.serving, LIMITS.serving, "serving"),
    servingUnit: assertBoundedString(args.servingUnit, LIMITS.servingUnit, "servingUnit"),
    clientRequestId: assertBoundedString(args.clientRequestId, 64, "clientRequestId"),
  };
}

/** Single day, resolved entirely through the composite index. */
export const getDay = query({
  args: { localDate: v.string() },
  returns: v.array(foodLog),
  handler: async (ctx, { localDate }) => {
    assertLocalDate(localDate, "localDate");
    const user = await requireCurrentUser(ctx);
    const fromDate = await requireHistoryAccess(ctx, user._id, localDate, localDate, 7);
    if (fromDate !== localDate) return [];
    return await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("localDate", localDate))
      .collect();
  },
});

export const getDaySummary = query({
  args: { localDate: v.string() },
  returns: v.object({
    calories: v.number(),
    proteinGrams: v.number(),
    carbsGrams: v.number(),
    fatGrams: v.number(),
    entryCount: v.number(),
  }),
  handler: async (ctx, { localDate }) => {
    assertLocalDate(localDate, "localDate");
    const user = await requireCurrentUser(ctx);
    const fromDate = await requireHistoryAccess(ctx, user._id, localDate, localDate, 7);
    if (fromDate !== localDate) {
      return { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, entryCount: 0 };
    }
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("localDate", localDate))
      .collect();

    return logs.reduce(
      (sum, item) => ({
        calories: sum.calories + item.calories,
        proteinGrams: sum.proteinGrams + item.proteinGrams,
        carbsGrams: sum.carbsGrams + item.carbsGrams,
        fatGrams: sum.fatGrams + item.fatGrams,
        entryCount: sum.entryCount + 1,
      }),
      { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, entryCount: 0 },
    );
  },
});

/**
 * One owned entry, with its photo resolved to a URL.
 *
 * The stored document only carries a storage id, so the edit screen had no way
 * to show the meal photo and always fell back to a placeholder. The lookup
 * mirrors `dashboard.getRecentUploads`: prefer the log's own image, otherwise the
 * linked scan's, and only when that scan belongs to the same user and its image
 * has not passed retention.
 */
export const getById = query({
  args: { id: v.id("foodLogs") },
  returns: v.union(foodLog.extend({ imageUrl: v.union(v.string(), v.null()) }), v.null()),
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const log = await loadOwned(ctx, id, user._id);
    if (!log) return null;

    let storageId = log.imageStorageId;
    if (!storageId && log.aiScanId) {
      const scan = await ctx.db.get(log.aiScanId);
      if (scan && scan.userId === user._id && !scan.imageDeletedAt) {
        storageId = scan.imageStorageId;
      }
    }

    return { ...log, imageUrl: storageId ? await ctx.storage.getUrl(storageId) : null };
  },
});

/**
 * The detail an AI scan produced beyond the four values that drive a day's
 * totals: what the model saw on the plate, the nutrition it could not fold into
 * those four, how sure it was, and what it warned about.
 *
 * `foodLogs` deliberately stores only the four macros — they are the numbers the
 * day is built from, and they stay editable. Everything else lives on the scan,
 * so this reads through `aiScanId` rather than duplicating it onto the log.
 *
 * Returns null for a log with no scan behind it, and for one whose scan image and
 * estimate have aged out. `estimate` is `v.any()` in the schema, so every field
 * is re-narrowed here rather than trusted: rows written before a field existed
 * simply have nothing to read.
 */
export const getScanDetail = query({
  args: { id: v.id("foodLogs") },
  returns: v.union(
    v.object({
      components: v.array(v.object({ name: v.string(), portion: v.string() })),
      confidence: v.union(confidenceValidator, v.null()),
      saturatedFatGrams: nullableNumber,
      fiberGrams: nullableNumber,
      sugarGrams: nullableNumber,
      sodiumMilligrams: nullableNumber,
      warnings: v.array(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const log = await loadOwned(ctx, id, user._id);
    if (!log?.aiScanId) return null;

    const scan = await ctx.db.get(log.aiScanId);
    // The ownership check is repeated deliberately: `aiScanId` is a stored
    // reference, and a log must never be able to read another user's scan.
    if (!scan || scan.userId !== user._id) return null;

    // Narrowed by the shared reader, so a saved entry and a live scan result
    // describe the same estimate rather than two hand-rolled readings of it.
    const estimate = readStoredEstimate(scan.correctedEstimate ?? scan.estimate, scan.confidence);
    if (!estimate) return null;

    return {
      // Mapped down deliberately: this screen shows the plate as chips, so it
      // takes the two fields it renders rather than whatever the reader grows.
      components: estimate.components.map(({ name, portion }) => ({ name, portion })),
      confidence: estimate.confidence,
      saturatedFatGrams: estimate.nutrition.saturatedFatGrams,
      fiberGrams: estimate.nutrition.fiberGrams,
      sugarGrams: estimate.nutrition.sugarGrams,
      sodiumMilligrams: estimate.nutrition.sodiumMilligrams,
      warnings: estimate.warnings,
    };
  },
});

/** Date range expressed as an index range rather than an in-memory filter. */
export const getHistory = query({
  args: { fromDate: v.string(), toDate: v.string(), limit: v.optional(v.number()) },
  returns: v.array(foodLog),
  handler: async (ctx, args) => {
    const { fromDate, toDate } = assertLocalDateRange(args.fromDate, args.toDate);
    const user = await requireCurrentUser(ctx);
    const accessibleFromDate = await requireHistoryAccess(ctx, user._id, fromDate, toDate, 7);
    const limit = boundedLimit(args.limit, 200, 500);

    return await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("localDate", accessibleFromDate).lte("localDate", toDate),
      )
      .order("desc")
      .take(limit);
  },
});

export const create = mutation({
  args: entryArgs,
  returns: v.id("foodLogs"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const normalized = normalizeEntry(args);

    // Idempotency through the index, not a scan of the user's whole history.
    const existing = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_request", (q) =>
        q.eq("userId", user._id).eq("clientRequestId", normalized.clientRequestId),
      )
      .unique();
    if (existing) return existing._id;

    if (args.imageStorageId) await attachOwnedUpload(ctx, args.imageStorageId, user._id);

    if (args.aiScanId) {
      const scan = await loadOwned(ctx, args.aiScanId, user._id);
      if (!scan || scan.status !== "completed") throw new ConvexError("Scan not found");
      await ctx.db.patch(scan._id, {
        retentionUntil: Date.now() + ATTACHED_IMAGE_RETENTION_MS,
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();
    return await ctx.db.insert("foodLogs", {
      userId: user._id,
      mealType: args.mealType,
      source: args.source,
      quantity: args.quantity,
      calories: args.calories,
      proteinGrams: args.proteinGrams,
      carbsGrams: args.carbsGrams,
      fatGrams: args.fatGrams,
      imageStorageId: args.imageStorageId,
      aiScanId: args.aiScanId,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Edits an existing entry. `clientRequestId`, `source` and the attached scan are
 * immutable so an edit can never collide with another entry's idempotency key.
 */
export const update = mutation({
  args: {
    id: v.id("foodLogs"),
    mealType: mealTypeValidator,
    foodName: v.string(),
    serving: v.string(),
    servingUnit: v.string(),
    quantity: v.number(),
    calories: v.number(),
    proteinGrams: v.number(),
    carbsGrams: v.number(),
    fatGrams: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const record = await requireOwned(ctx, args.id, user._id, "Food log");

    assertEntryNutrition(args);
    await ctx.db.patch(record._id, {
      mealType: args.mealType,
      foodName: assertBoundedString(args.foodName, LIMITS.foodName, "foodName"),
      serving: assertBoundedString(args.serving, LIMITS.serving, "serving"),
      servingUnit: assertBoundedString(args.servingUnit, LIMITS.servingUnit, "servingUnit"),
      quantity: args.quantity,
      calories: args.calories,
      proteinGrams: args.proteinGrams,
      carbsGrams: args.carbsGrams,
      fatGrams: args.fatGrams,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Removes the entry and reclaims any image only that entry referenced. */
export const remove = mutation({
  args: { id: v.id("foodLogs") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const record = await requireOwned(ctx, id, user._id, "Food log");

    if (record.imageStorageId) {
      await ctx.storage.delete(record.imageStorageId).catch(() => undefined);
      const upload = await ctx.db
        .query("imageUploads")
        .withIndex("by_storage", (q) => q.eq("storageId", record.imageStorageId!))
        .unique();
      if (upload) await ctx.db.delete(upload._id);
    }

    // A scan-sourced photo reverts to the 24-hour abandoned-image window.
    if (record.aiScanId) {
      const scan = await loadOwned(ctx, record.aiScanId, user._id);
      if (scan && !scan.imageDeletedAt) {
        await ctx.db.patch(scan._id, {
          retentionUntil: Date.now() + 24 * 60 * 60 * 1_000,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(id);
    return null;
  },
});
