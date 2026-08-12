import { internalMutationGeneric as internalMutation } from "convex/server";

export const deleteExpiredScanImages = internalMutation({ args: {}, handler: async (ctx) => {
  const now = Date.now();
  const scans = await ctx.db.query("aiScans").withIndex("by_retention", (q) => q.lt("retentionUntil", now)).filter((q) => q.eq(q.field("imageDeletedAt"), undefined)).take(100);
  for (const scan of scans) { await ctx.storage.delete(scan.imageStorageId); await ctx.db.patch(scan._id, { imageDeletedAt: now, updatedAt: now }); }
  return scans.length;
} });
