import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

const mealType = v.union(v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack"));
const recentUpload = v.object({
  _id: v.id("foodLogs"),
  foodName: v.string(),
  mealType,
  localDate: v.string(),
  createdAt: v.number(),
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
  imageUrl: v.union(v.string(), v.null()),
});

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_STREAK_DAYS = 365;

function shiftLocalDate(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export const getRecentUploads = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(recentUpload),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 3), 1), 10);
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return Promise.all(logs.map(async (log) => {
      let storageId = log.imageStorageId;
      if (!storageId && log.aiScanId) {
        const scan = await ctx.db.get(log.aiScanId);
        if (scan && scan.userId === user._id && !scan.imageDeletedAt) storageId = scan.imageStorageId;
      }

      return {
        _id: log._id,
        foodName: log.foodName,
        mealType: log.mealType,
        localDate: log.localDate,
        createdAt: log.createdAt,
        calories: log.calories,
        proteinGrams: log.proteinGrams,
        carbsGrams: log.carbsGrams,
        fatGrams: log.fatGrams,
        imageUrl: storageId ? await ctx.storage.getUrl(storageId) : null,
      };
    }));
  },
});

export const getLoggingStreak = query({
  args: { todayLocalDate: v.string() },
  returns: v.number(),
  handler: async (ctx, { todayLocalDate }) => {
    const user = await requireCurrentUser(ctx);
    if (!LOCAL_DATE_PATTERN.test(todayLocalDate) || shiftLocalDate(todayLocalDate, 0) !== todayLocalDate) return 0;

    const todayLog = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("localDate", todayLocalDate))
      .first();
    let streak = todayLog ? 1 : 0;
    const finalOffset = todayLog ? MAX_STREAK_DAYS : MAX_STREAK_DAYS + 1;
    for (let offset = 1; offset < finalOffset; offset += 1) {
      const localDate = shiftLocalDate(todayLocalDate, -offset);
      const log = await ctx.db
        .query("foodLogs")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("localDate", localDate))
        .first();
      if (!log) break;
      streak += 1;
    }
    return streak;
  },
});
