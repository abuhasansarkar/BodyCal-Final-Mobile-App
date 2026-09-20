import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { EXPORTED_TABLES, USER_SCOPED_TABLES } from "./lib/userTables";

/** Rows cleared per transaction. Deletion resumes until every table is empty. */
const DELETE_BATCH = 200;

/** Rows read per export page. One query must stay well inside Convex's read limits. */
const EXPORT_PAGE_SIZE = 500;

/** How many tables an export walks. The action drives the loop; this bounds it. */
export const EXPORT_TABLE_COUNT = EXPORTED_TABLES.length;

export const collectExportHeader = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      email: v.string(),
      name: v.optional(v.string()),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { email: user.email, name: user.name, createdAt: user.createdAt };
  },
});

/**
 * One page of one exported table.
 *
 * This used to be a single query that `.collect()`ed every row of every
 * user-scoped table at once. A Convex query is bounded — a few thousand
 * documents, a few megabytes — so a heavy account did not get a large export,
 * it got no export: the query threw, `buildExport`'s catch wrote
 * `errorCategory: "export_failed"`, and the privacy screen reported a failure
 * with no way to tell "we could not read your data" from "you have too much of
 * it". Paginating means the account that most needs its data out is the one that
 * can still get it.
 *
 * Addressed by index rather than by name so the argument stays a plain number:
 * the caller walks `0 … EXPORT_TABLE_COUNT - 1`, and adding a table to
 * `EXPORTED_TABLES` extends the walk with no validator to keep in step.
 */
export const collectExportPage = internalQuery({
  args: {
    userId: v.id("users"),
    tableIndex: v.number(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    table: v.string(),
    // Heterogeneous across eleven tables, and re-serialized verbatim into the
    // archive. Narrowing it here would mean restating every table's shape.
    rows: v.array(v.any()),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const table = EXPORTED_TABLES[args.tableIndex];
    if (!table) throw new Error("unknown_export_table");

    const result = await ctx.db
      .query(table)
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .paginate({ cursor: args.cursor, numItems: EXPORT_PAGE_SIZE });

    return {
      table,
      rows: result.page,
      continueCursor: result.isDone ? null : result.continueCursor,
    };
  },
});

export const completeExport = internalMutation({
  args: { jobId: v.id("exportJobs"), storageId: v.id("_storage"), expiresAt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await ctx.db.patch(args.jobId, {
      status: "complete",
      storageId: args.storageId,
      expiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * A failed job is stamped with an expiry as well as a status.
 *
 * It holds no archive, but it does hold a user id, and it is what the privacy
 * screen reads to explain that an export did not finish. `expiresAt` is what
 * `maintenance.deleteExpiredExports` ranges over, so without one the row sat
 * outside every sweep and was never collected.
 */
const FAILED_EXPORT_TTL_MS = 24 * 60 * 60 * 1_000;

export const failExport = internalMutation({
  args: { jobId: v.id("exportJobs"), errorCategory: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorCategory: args.errorCategory,
      expiresAt: now + FAILED_EXPORT_TTL_MS,
      updatedAt: now,
    });
    return null;
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
  args: { userId: v.id("users"), clerkUserId: v.string() },
  returns: v.object({ done: v.boolean(), deleted: v.number(), table: v.optional(v.string()) }),
  handler: async (ctx, { userId, clerkUserId }) => {
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

    // RevenueCat's append-only event log and the fixed-window rate limiter do
    // not carry a userId, but both still contain stable account identifiers.
    const subscriptionEvents = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_customer", (q) => q.eq("customerId", clerkUserId))
      .take(DELETE_BATCH);
    if (subscriptionEvents.length > 0) {
      for (const event of subscriptionEvents) await ctx.db.delete(event._id);
      return {
        done: false,
        deleted: subscriptionEvents.length,
        table: "subscriptionEvents",
      };
    }

    const identities = [clerkUserId, String(userId)];
    const names = ["planGeneration", "entitlementVerification", "aiScan", "export"] as const;
    for (const identity of identities) {
      for (const name of names) {
        const rateLimit = await ctx.db
          .query("rateLimits")
          .withIndex("by_key", (q) => q.eq("key", `${name}:${identity}`))
          .unique();
        if (rateLimit) {
          await ctx.db.delete(rateLimit._id);
          return { done: false, deleted: 1, table: "rateLimits" };
        }
      }
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
  returns: v.null(),
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
    return null;
  },
});

export const markDataCleared = internalMutation({
  args: { jobId: v.id("deletionJobs"), clearedTableCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "dataCleared",
      clearedTableCount: args.clearedTableCount,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failDeletion = internalMutation({
  args: { jobId: v.id("deletionJobs"), errorCategory: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorCategory: args.errorCategory,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Restores app access when deletion failed, so the user is never locked out. */
export const reactivateUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (user && user.lifecycleState !== "active") {
      await ctx.db.patch(userId, { lifecycleState: "active", updatedAt: Date.now() });
    }
    return null;
  },
});
