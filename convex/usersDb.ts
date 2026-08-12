import { internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery } from "convex/server";
import { v } from "convex/values";

const userTables = ["userProfiles", "nutritionGoals", "foodLogs", "weightLogs", "aiScans", "customFoods", "favorites", "notificationPreferences", "pushDevices", "userSettings", "subscriptionMirror"] as const;

export const collectExport = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const records: Record<string, unknown> = { user };
    for (const table of userTables) {
      records[table] = await ctx.db.query(table).withIndex("by_user", (q: any) => q.eq("userId", userId)).collect();
    }
    return records;
  },
});

export const completeExport = internalMutation({
  args: { jobId: v.id("exportJobs"), storageId: v.id("_storage"), expiresAt: v.number() },
  handler: (ctx, args) => ctx.db.patch(args.jobId, { status: "complete", storageId: args.storageId, expiresAt: args.expiresAt, updatedAt: Date.now() }),
});

export const failExport = internalMutation({
  args: { jobId: v.id("exportJobs"), errorCategory: v.string() },
  handler: (ctx, args) => ctx.db.patch(args.jobId, { status: "failed", errorCategory: args.errorCategory, updatedAt: Date.now() }),
});

export const executeDeletion = internalMutation({
  args: { jobId: v.id("deletionJobs"), userId: v.id("users") },
  handler: async (ctx, { jobId, userId }) => {
    for (const table of userTables) {
      const records = await ctx.db.query(table).withIndex("by_user", (q: any) => q.eq("userId", userId)).collect();
      for (const record of records) {
        if ("imageStorageId" in record && record.imageStorageId) await ctx.storage.delete(record.imageStorageId as any).catch(() => undefined);
        await ctx.db.delete(record._id);
      }
    }
    const exports = await ctx.db.query("exportJobs").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const job of exports) {
      if (job.storageId) await ctx.storage.delete(job.storageId).catch(() => undefined);
      await ctx.db.delete(job._id);
    }
    await ctx.db.delete(jobId);
    await ctx.db.delete(userId);
  },
});

export const failDeletion = internalMutation({
  args: { jobId: v.id("deletionJobs"), errorCategory: v.string() },
  handler: (ctx, args) => ctx.db.patch(args.jobId, { status: "failed", errorCategory: args.errorCategory, updatedAt: Date.now() }),
});
