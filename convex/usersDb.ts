import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { EXPORTED_TABLES, USER_SCOPED_TABLES } from "./lib/userTables";

/** Rows cleared per transaction. Deletion resumes until every table is empty. */
const DELETE_BATCH = 200;

export const collectExport = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const records: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      user: { email: user.email, name: user.name, createdAt: user.createdAt },
    };

    for (const table of EXPORTED_TABLES) {
      records[table] = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    return records;
  },
});

export const completeExport = internalMutation({
  args: { jobId: v.id("exportJobs"), storageId: v.id("_storage"), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    await ctx.db.patch(args.jobId, {
      status: "complete",
      storageId: args.storageId,
      expiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
  },
});

export const failExport = internalMutation({
  args: { jobId: v.id("exportJobs"), errorCategory: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorCategory: args.errorCategory,
      updatedAt: Date.now(),
    });
  },
});

async function deleteStoredImage(ctx: MutationCtx, storageId: Id<"_storage"> | undefined) {
  if (!storageId) return;
  try {
    await ctx.storage.delete(storageId);
  } catch {
    // Already gone, or never persisted. Deletion must not stall on storage.
  }
}

/**
 * Clears one batch of user data and reports whether more remains.
 *
 * Resumable and idempotent by construction: it always attacks the first
 * non-empty table, so a retry after any failure continues from the same point
 * instead of restarting. The caller loops until `done` is true. The `users` row
 * and the job row are removed only on the final pass.
 */
export const clearUserDataBatch = internalMutation({
  args: { userId: v.id("users") },
  returns: v.object({ done: v.boolean(), deleted: v.number(), table: v.optional(v.string()) }),
  handler: async (ctx, { userId }) => {
    for (const table of USER_SCOPED_TABLES) {
      const records = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(DELETE_BATCH);

      if (records.length === 0) continue;

      for (const record of records) {
        if ("imageStorageId" in record) await deleteStoredImage(ctx, record.imageStorageId);
        if ("storageId" in record) await deleteStoredImage(ctx, record.storageId);
        await ctx.db.delete(record._id);
      }

      return { done: false, deleted: records.length, table };
    }

    const exportJobs = await ctx.db
      .query("exportJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH);
    if (exportJobs.length > 0) {
      for (const job of exportJobs) {
        await deleteStoredImage(ctx, job.storageId);
        await ctx.db.delete(job._id);
      }
      return { done: false, deleted: exportJobs.length, table: "exportJobs" };
    }

    return { done: true, deleted: 0 };
  },
});

/**
 * Final step: removes the deletion job and the user row. Runs only after the
 * Clerk identity has been deleted, so a partial failure always leaves the user
 * able to sign in and retry.
 */
export const finalizeDeletion = internalMutation({
  args: { jobId: v.id("deletionJobs"), userId: v.id("users") },
  handler: async (ctx, { jobId, userId }) => {
    const remaining = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (remaining) throw new Error("user_data_not_cleared");

    const job = await ctx.db.get(jobId);
    if (job) await ctx.db.delete(jobId);
    const user = await ctx.db.get(userId);
    if (user) await ctx.db.delete(userId);
  },
});

export const markDataCleared = internalMutation({
  args: { jobId: v.id("deletionJobs"), clearedTableCount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "dataCleared",
      clearedTableCount: args.clearedTableCount,
      updatedAt: Date.now(),
    });
  },
});

export const failDeletion = internalMutation({
  args: { jobId: v.id("deletionJobs"), errorCategory: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorCategory: args.errorCategory,
      updatedAt: Date.now(),
    });
  },
});

/** Restores app access when deletion failed, so the user is never locked out. */
export const reactivateUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (user && user.lifecycleState !== "active") {
      await ctx.db.patch(userId, { lifecycleState: "active", updatedAt: Date.now() });
    }
  },
});
