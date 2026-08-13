import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireIdentity, requireUserRecord } from "./lib/auth";
import { consumeRateLimit } from "./lib/rateLimit";
import { assertOptionalBoundedString } from "./lib/validation";

const publicUser = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  email: v.string(),
  name: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  onboardingCompleted: v.boolean(),
  lifecycleState: v.union(v.literal("active"), v.literal("deletionPending")),
});

/** Returns null rather than throwing so the client can distinguish "no row yet" from an error. */
export const getCurrent = query({
  args: {},
  returns: v.union(publicUser, v.null()),
  handler: async (ctx) => {
    try {
      const user = await requireCurrentUser(ctx);
      return {
        _id: user._id,
        _creationTime: user._creationTime,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        onboardingCompleted: user.onboardingCompleted,
        lifecycleState: user.lifecycleState,
      };
    } catch {
      return null;
    }
  },
});

export const syncFromClerk = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = args.email.trim().slice(0, 320);
    const name = assertOptionalBoundedString(args.name, 120, "name");
    const avatarUrl = assertOptionalBoundedString(args.avatarUrl, 2_048, "avatarUrl");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { email, name, avatarUrl, updatedAt: now });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      email,
      name,
      avatarUrl,
      onboardingCompleted: false,
      lifecycleState: "active",
      createdAt: now,
      updatedAt: now,
    });

    // A purchase webhook can land before this row exists. Apply anything queued.
    await ctx.scheduler.runAfter(0, internal.subscriptions.applyPendingEvents, {
      customerId: identity.subject,
    });

    return userId;
  },
});

export const requestExport = mutation({
  args: {},
  returns: v.id("exportJobs"),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    await consumeRateLimit(ctx, "export", user._id);

    // Reuse a job that is still running instead of stacking duplicates.
    const jobs = await ctx.db
      .query("exportJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const pending = jobs.find((job) => job.status === "pending");
    if (pending) return pending._id;

    for (const job of jobs) {
      if (job.storageId) await ctx.storage.delete(job.storageId).catch(() => undefined);
      await ctx.db.delete(job._id);
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("exportJobs", {
      userId: user._id,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.usersActions.buildExport, { jobId, userId: user._id });
    return jobId;
  },
});

export const getExportStatus = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.union(v.literal("pending"), v.literal("complete"), v.literal("failed")),
      downloadUrl: v.union(v.string(), v.null()),
      errorCategory: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const job = await ctx.db
      .query("exportJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (!job) return null;

    const expired = job.expiresAt !== undefined && job.expiresAt <= Date.now();
    return {
      status: job.status,
      downloadUrl: job.storageId && !expired ? await ctx.storage.getUrl(job.storageId) : null,
      errorCategory: job.errorCategory,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
    };
  },
});

/**
 * Idempotent. Uses `requireUserRecord` rather than `requireCurrentUser` so a user
 * whose previous attempt failed — and is therefore already `deletionPending` —
 * can still retry.
 */
export const requestDeletion = mutation({
  args: {},
  returns: v.id("deletionJobs"),
  handler: async (ctx) => {
    const user = await requireUserRecord(ctx);
    const now = Date.now();

    if (user.lifecycleState !== "deletionPending") {
      await ctx.db.patch(user._id, { lifecycleState: "deletionPending", updatedAt: now });
    }

    const existing = await ctx.db
      .query("deletionJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      if (existing.status === "complete") return existing._id;
      await ctx.db.patch(existing._id, {
        status: "pending",
        errorCategory: undefined,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.usersActions.executeDeletion, {
        jobId: existing._id,
        userId: user._id,
        clerkUserId: user.clerkUserId,
      });
      return existing._id;
    }

    const jobId = await ctx.db.insert("deletionJobs", {
      userId: user._id,
      clerkUserId: user.clerkUserId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.usersActions.executeDeletion, {
      jobId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
    });
    return jobId;
  },
});

export const getDeletionStatus = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.union(
        v.literal("pending"),
        v.literal("dataCleared"),
        v.literal("complete"),
        v.literal("failed"),
      ),
      errorCategory: v.optional(v.string()),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await requireUserRecord(ctx);
    const job = await ctx.db
      .query("deletionJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!job) return null;
    return { status: job.status, errorCategory: job.errorCategory, updatedAt: job.updatedAt };
  },
});

/** Cancels a failed deletion so the account stays usable. */
export const cancelDeletion = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireUserRecord(ctx);
    const job = await ctx.db
      .query("deletionJobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (job && job.status !== "failed") {
      throw new ConvexError("Deletion is already in progress and cannot be cancelled");
    }
    if (job) await ctx.db.delete(job._id);
    await ctx.db.patch(user._id, { lifecycleState: "active", updatedAt: Date.now() });
    return null;
  },
});
