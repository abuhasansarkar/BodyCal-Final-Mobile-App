import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { requireHistoryAccess } from "./lib/entitlements";
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
 * Walks backwards from today and stops at the first missing day, reading one
 * page of the date index at a time. The streak is by definition an unbroken run
 * ending now, so everything before the first gap is irrelevant — the previous
 * version collected up to a year of logs to answer a question that usually needs
 * the last few days, on a reactive home-screen query that re-runs on every write.
 * A 300-day streak still costs a few pages; a typical one costs a single page.
 */
export const getLoggingStreak = query({
  args: { todayLocalDate: v.string() },
  returns: v.number(),
  handler: async (ctx, { todayLocalDate }) => {
    const user = await requireCurrentUser(ctx);
    assertLocalDate(todayLocalDate, "todayLocalDate");

    /*
      Read a month at a time and stop at the first gap. A user with a three-day
      streak — the overwhelming majority — costs exactly one bounded range read;
      only someone approaching a full year pays for more than a couple.
    */
    const CHUNK_DAYS = 30;
    let streak = 0;
    let cursor = todayLocalDate;

    for (let day = 0; day < MAX_STREAK_DAYS; ) {
      const chunkFrom = shiftLocalDate(cursor, -(CHUNK_DAYS - 1));
      const rows = await ctx.db
        .query("foodLogs")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", user._id).gte("localDate", chunkFrom).lte("localDate", cursor),
        )
        .collect();
      const logged = new Set(rows.map((log) => log.localDate));

      for (let step = 0; step < CHUNK_DAYS && day < MAX_STREAK_DAYS; step += 1, day += 1) {
        if (logged.has(cursor)) streak += 1;
        // Today not being logged yet does not break a streak; any earlier gap does.
        else if (cursor !== todayLocalDate) return streak;
        cursor = shiftLocalDate(cursor, -1);
      }
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
    const fromDate = await requireHistoryAccess(ctx, user._id, args.fromDate, args.toDate);

    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("localDate", fromDate).lte("localDate", args.toDate),
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
