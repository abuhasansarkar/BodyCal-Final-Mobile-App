import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

const MAX_UPLOAD_BYTES = 4_000_000;
/** Uploads that are never claimed or attached are swept by the retention cron. */
const UNCLAIMED_UPLOAD_CAP = 20;

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);

    // Bound how many unattached uploads one account can accumulate.
    const outstanding = await ctx.db
      .query("imageUploads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(UNCLAIMED_UPLOAD_CAP + 1);
    if (outstanding.length > UNCLAIMED_UPLOAD_CAP) {
      throw new ConvexError("Too many pending uploads. Please try again shortly.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Records who uploaded a blob.
 *
 * Convex hands the storage id to the client, so the client must claim it before
 * it can be used. First claim wins: a second account cannot take over a blob
 * somebody else already claimed. Every path that later reads or attaches an
 * image checks this table via `assertOwnsUpload`.
 */
export const claim = mutation({
  args: {
    storageId: v.id("_storage"),
    purpose: v.union(v.literal("mealScan"), v.literal("mealPhoto")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const existing = await ctx.db
      .query("imageUploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (existing) {
      if (existing.userId !== user._id) throw new ConvexError("Image is not available");
      return null;
    }

    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) throw new ConvexError("Image is not available");
    if (metadata.size > MAX_UPLOAD_BYTES) {
      await ctx.storage.delete(args.storageId).catch(() => undefined);
      throw new ConvexError("Image must be 4 MB or smaller");
    }
    // Advisory only: Convex derives contentType from a client-supplied header, so
    // it is rejected when it is present and wrong, never required to be present.
    // The real bound on an abusive upload is MAX_UPLOAD_BYTES plus the unattached
    // upload sweep in `maintenance.sweepUnattachedUploads`.
    if (metadata.contentType && !metadata.contentType.startsWith("image/")) {
      await ctx.storage.delete(args.storageId).catch(() => undefined);
      throw new ConvexError("Only image uploads are supported");
    }

    await ctx.db.insert("imageUploads", {
      userId: user._id,
      storageId: args.storageId,
      purpose: args.purpose,
      createdAt: Date.now(),
    });
    return null;
  },
});
