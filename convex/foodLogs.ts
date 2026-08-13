import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { attachOwnedUpload, loadOwned, requireCurrentUser, requireOwned } from "./lib/auth";
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

export const getById = query({
  args: { id: v.id("foodLogs") },
  returns: v.union(foodLog, v.null()),
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    return await loadOwned(ctx, id, user._id);
  },
});

/** Date range expressed as an index range rather than an in-memory filter. */
export const getHistory = query({
  args: { fromDate: v.string(), toDate: v.string(), limit: v.optional(v.number()) },
  returns: v.array(foodLog),
  handler: async (ctx, args) => {
    const { fromDate, toDate } = assertLocalDateRange(args.fromDate, args.toDate);
    const user = await requireCurrentUser(ctx);
    const limit = boundedLimit(args.limit, 200, 500);

    return await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("localDate", fromDate).lte("localDate", toDate),
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
