"use node";

import { internalActionGeneric as internalAction, makeFunctionReference } from "convex/server";
import { v } from "convex/values";

const collectExport = makeFunctionReference<"query">("usersDb:collectExport");
const completeExport = makeFunctionReference<"mutation">("usersDb:completeExport");
const failExport = makeFunctionReference<"mutation">("usersDb:failExport");
const deleteData = makeFunctionReference<"mutation">("usersDb:executeDeletion");
const failDeletion = makeFunctionReference<"mutation">("usersDb:failDeletion");

export const buildExport = internalAction({
  args: { jobId: v.id("exportJobs"), userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const data = await ctx.runQuery(collectExport, { userId: args.userId });
      if (!data) throw new Error("missing_user");
      const storageId = await ctx.storage.store(new Blob([JSON.stringify(data)], { type: "application/json" }));
      await ctx.runMutation(completeExport, { jobId: args.jobId, storageId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1_000 });
    } catch {
      await ctx.runMutation(failExport, { jobId: args.jobId, errorCategory: "export_failed" });
    }
  },
});

export const executeDeletion = internalAction({
  args: { jobId: v.id("deletionJobs"), userId: v.id("users"), clerkUserId: v.string() },
  handler: async (ctx, args) => {
    try {
      const secret = process.env.CLERK_SECRET_KEY;
      if (!secret) throw new Error("missing_clerk_secret");
      const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(args.clerkUserId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!response.ok && response.status !== 404) throw new Error("clerk_delete_failed");
      await ctx.runMutation(deleteData, { jobId: args.jobId, userId: args.userId });
    } catch {
      await ctx.runMutation(failDeletion, { jobId: args.jobId, errorCategory: "deletion_failed" });
    }
  },
});
