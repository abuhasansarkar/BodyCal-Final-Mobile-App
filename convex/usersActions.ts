"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
/** Safety stop so a bug can never spin the deletion loop forever. */
const MAX_DELETE_BATCHES = 500;

export const buildExport = internalAction({
  args: { jobId: v.id("exportJobs"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const data = await ctx.runQuery(internal.usersDb.collectExport, { userId: args.userId });
      if (!data) throw new Error("missing_user");

      const storageId = await ctx.storage.store(
        new Blob([data], { type: "application/json" }),
      );
      await ctx.runMutation(internal.usersDb.completeExport, {
        jobId: args.jobId,
        storageId,
        expiresAt: Date.now() + EXPORT_TTL_MS,
      });
    } catch {
      await ctx.runMutation(internal.usersDb.failExport, {
        jobId: args.jobId,
        errorCategory: "export_failed",
      });
    }
    return null;
  },
});

/**
 * Deletes a BodyCal account.
 *
 * Order matters: all user data goes first, the Clerk identity last. If any step
 * fails, the account is reactivated so the user can still sign in and retry —
 * the previous implementation deleted the Clerk user first and left people
 * locked out of data that was never removed.
 *
 * Every step is idempotent, so re-running the job after a partial failure
 * continues rather than restarting.
 */
export const executeDeletion = internalAction({
  args: { jobId: v.id("deletionJobs"), userId: v.id("users"), clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    let batches = 0;
    try {
      for (;;) {
        const result = await ctx.runMutation(internal.usersDb.clearUserDataBatch, {
          userId: args.userId,
          clerkUserId: args.clerkUserId,
        });
        if (result.done) break;
        batches += 1;
        if (batches > MAX_DELETE_BATCHES) throw new Error("deletion_batch_limit");
      }
      await ctx.runMutation(internal.usersDb.markDataCleared, {
        jobId: args.jobId,
        clearedTableCount: batches,
      });

      await deleteClerkUser(args.clerkUserId);

      await ctx.runMutation(internal.usersDb.finalizeDeletion, {
        jobId: args.jobId,
        userId: args.userId,
      });
    } catch (cause) {
      const category = cause instanceof Error ? cause.message : "deletion_failed";
      await ctx.runMutation(internal.usersDb.failDeletion, {
        jobId: args.jobId,
        errorCategory: category.slice(0, 64),
      });
      await ctx.runMutation(internal.usersDb.reactivateUser, { userId: args.userId });
    }
    return null;
  },
});

async function deleteClerkUser(clerkUserId: string) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("missing_clerk_secret");

  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
  });

  // 404 means the identity is already gone, which is success for our purposes.
  if (!response.ok && response.status !== 404) throw new Error("clerk_delete_failed");
}
