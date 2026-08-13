import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { assertLocalDate, boundedLimit } from "./lib/validation";
import { mealTypeValidator } from "./schema";

const MAX_STREAK_DAYS = 365;

const recentUpload = v.object({
  _id: v.id("foodLogs"),
  foodName: v.string(),
  mealType: mealTypeValidator,
  localDate: v.string(),
  createdAt: v.number(),
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
  imageUrl: v.union(v.string(), v.null()),
});

function shiftLocalDate(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export const getRecentUploads = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(recentUpload),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limit = boundedLimit(args.limit, 3, 10);

    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return await Promise.all(
      logs.map(async (log) => {
        let storageId = log.imageStorageId;
        if (!storageId && log.aiScanId) {
          const scan = await ctx.db.get(log.aiScanId);
          if (scan && scan.userId === user._id && !scan.imageDeletedAt) {
            storageId = scan.imageStorageId;
          }
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
      }),
    );
  },
});

/**
 * Consecutive days with at least one food log, ending today or yesterday.
 *
 * Reads the recent window once and walks it in memory. The previous version
 * issued one indexed query per day — up to 366 sequential round trips on every
 * dashboard render.
 */
export const getLoggingStreak = query({
  args: { todayLocalDate: v.string() },
  returns: v.number(),
  handler: async (ctx, { todayLocalDate }) => {
    const user = await requireCurrentUser(ctx);
    assertLocalDate(todayLocalDate, "todayLocalDate");

    const earliest = shiftLocalDate(todayLocalDate, -MAX_STREAK_DAYS);
    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("localDate", earliest).lte("localDate", todayLocalDate),
      )
      .collect();

    const loggedDates = new Set(logs.map((log) => log.localDate));
    if (loggedDates.size === 0) return 0;

    // A streak may end today or yesterday; missing today does not break it yet.
    let cursor = loggedDates.has(todayLocalDate)
      ? todayLocalDate
      : shiftLocalDate(todayLocalDate, -1);
    if (!loggedDates.has(cursor)) return 0;

    let streak = 0;
    while (streak < MAX_STREAK_DAYS && loggedDates.has(cursor)) {
      streak += 1;
      cursor = shiftLocalDate(cursor, -1);
    }
    return streak;
  },
});

/** Per-day calorie totals for the progress chart, in one indexed range read. */
export const getDailyCalorieSeries = query({
  args: { fromDate: v.string(), toDate: v.string() },
  returns: v.array(v.object({ localDate: v.string(), calories: v.number(), entryCount: v.number() })),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertLocalDate(args.fromDate, "fromDate");
    assertLocalDate(args.toDate, "toDate");

    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("localDate", args.fromDate).lte("localDate", args.toDate),
      )
      .collect();

    const byDate = new Map<string, { calories: number; entryCount: number }>();
    for (const log of logs) {
      const bucket = byDate.get(log.localDate) ?? { calories: 0, entryCount: 0 };
      bucket.calories += log.calories;
      bucket.entryCount += 1;
      byDate.set(log.localDate, bucket);
    }

    return [...byDate.entries()]
      .map(([localDate, value]) => ({ localDate, ...value }))
      .sort((a, b) => a.localDate.localeCompare(b.localDate));
  },
});
