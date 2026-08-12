import { ConvexError, v } from "convex/values";
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";

import { requireCurrentUser } from "./lib/auth";

const mealType = v.union(v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack"));
const source = v.union(v.literal("ai"), v.literal("manual"), v.literal("catalog"));
const createArgs = {
  localDate: v.string(), timezone: v.string(), mealType, source, foodName: v.string(), serving: v.string(), servingUnit: v.string(), quantity: v.number(),
  calories: v.number(), proteinGrams: v.number(), carbsGrams: v.number(), fatGrams: v.number(), imageStorageId: v.optional(v.id("_storage")), aiScanId: v.optional(v.id("aiScans")), clientRequestId: v.string(),
};

function assertNutrition(args: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; quantity: number }) {
  if (args.quantity <= 0 || args.quantity > 100) throw new ConvexError("Invalid quantity");
  for (const value of [args.calories, args.proteinGrams, args.carbsGrams, args.fatGrams]) if (!Number.isFinite(value) || value < 0) throw new ConvexError("Invalid nutrition value");
}

export const getDay = query({ args: { localDate: v.string() }, handler: async (ctx, { localDate }) => { const user = await requireCurrentUser(ctx); return ctx.db.query("foodLogs").withIndex("by_user_date", (q) => q.eq("userId", user._id)).filter((q) => q.eq(q.field("localDate"), localDate)).collect(); } });

export const getDaySummary = query({ args: { localDate: v.string() }, handler: async (ctx, { localDate }) => {
  const user = await requireCurrentUser(ctx); const logs = await ctx.db.query("foodLogs").withIndex("by_user_date", (q) => q.eq("userId", user._id)).filter((q) => q.eq(q.field("localDate"), localDate)).collect();
  return logs.reduce((sum, item) => ({ calories: sum.calories + item.calories, proteinGrams: sum.proteinGrams + item.proteinGrams, carbsGrams: sum.carbsGrams + item.carbsGrams, fatGrams: sum.fatGrams + item.fatGrams }), { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 });
} });

export const getById = query({ args: { id: v.id("foodLogs") }, handler: async (ctx, { id }) => { const user = await requireCurrentUser(ctx); const log = await ctx.db.get(id); if (!log || log.userId !== user._id) return null; return log; } });

export const getHistory = query({ args: { fromDate: v.string(), toDate: v.string(), limit: v.optional(v.number()) }, handler: async (ctx, args) => { const user = await requireCurrentUser(ctx); const limit = Math.min(args.limit ?? 200, 500); const records = await ctx.db.query("foodLogs").withIndex("by_user_date", (q) => q.eq("userId", user._id)).filter((q) => q.and(q.gte(q.field("localDate"), args.fromDate), q.lte(q.field("localDate"), args.toDate))).order("desc").take(limit); return records; } });

export const create = mutation({ args: createArgs, handler: async (ctx, args) => { const user = await requireCurrentUser(ctx); assertNutrition(args); const existing = await ctx.db.query("foodLogs").withIndex("by_user_request", (q) => q.eq("userId", user._id)).filter((q) => q.eq(q.field("clientRequestId"), args.clientRequestId)).unique(); if (existing) return existing._id; if (args.aiScanId) { const scan = await ctx.db.get(args.aiScanId); if (!scan || scan.userId !== user._id || scan.status !== "completed") throw new ConvexError("Scan not found"); await ctx.db.patch(scan._id, { retentionUntil: Date.now() + 30 * 86_400_000, updatedAt: Date.now() }); } const now = Date.now(); return ctx.db.insert("foodLogs", { userId: user._id, ...args, createdAt: now, updatedAt: now }); } });

export const update = mutation({ args: { id: v.id("foodLogs"), ...createArgs }, handler: async (ctx, args) => { const user = await requireCurrentUser(ctx); const record = await ctx.db.get(args.id); if (!record || record.userId !== user._id) throw new ConvexError("Food log not found"); assertNutrition(args); const { id, ...value } = args; await ctx.db.patch(id, { ...value, updatedAt: Date.now() }); } });

export const remove = mutation({ args: { id: v.id("foodLogs") }, handler: async (ctx, { id }) => { const user = await requireCurrentUser(ctx); const record = await ctx.db.get(id); if (!record || record.userId !== user._id) throw new ConvexError("Food log not found"); await ctx.db.delete(id); } });
