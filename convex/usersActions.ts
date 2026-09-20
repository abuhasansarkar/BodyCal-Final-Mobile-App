"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { EXPORT_TABLE_COUNT } from "./usersDb";

const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
/** Safety stop so a bug can never spin the deletion loop forever. */
const MAX_DELETE_BATCHES = 500;

/**
 * Pages read per table before the walk gives up.
 *
 * A safety stop, not a product limit: at `EXPORT_PAGE_SIZE` rows a page this is
 * two hundred thousand rows in a single table, well past anything a real account
 * accumulates. Hitting it means a cursor stopped advancing, and failing loudly
 * beats writing a silently short archive and calling it the user's data.
 */
const MAX_EXPORT_PAGES_PER_TABLE = 400;

export const buildExport = internalAction({
  args: { jobId: v.id("exportJobs"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const header = await ctx.runQuery(internal.usersDb.collectExportHeader, {
        userId: args.userId,
      });
      if (!header) throw new Error("missing_user");

      const records: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        user: header,
      };

      for (let tableIndex = 0; tableIndex < EXPORT_TABLE_COUNT; tableIndex += 1) {
        const rows: unknown[] = [];
        let cursor: string | null = null;
        let pages = 0;

        for (;;) {
          // Annotated because `cursor` feeds back into the call that produces it,
          // which TypeScript cannot resolve on its own.
          const page: { table: string; rows: unknown[]; continueCursor: string | null } =
            await ctx.runQuery(internal.usersDb.collectExportPage, {
              userId: args.userId,
              tableIndex,
              cursor,
            });
          rows.push(...page.rows);
          records[page.table] = rows;

          cursor = page.continueCursor;
          if (cursor === null) break;

          pages += 1;
          if (pages > MAX_EXPORT_PAGES_PER_TABLE) throw new Error("export_page_limit");
        }
      }

      const data = JSON.stringify(records, null, 2);
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
