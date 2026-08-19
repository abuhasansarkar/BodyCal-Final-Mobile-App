import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { MAX_SCAN_ATTEMPTS } from "./aiDb";

/** Rows handled per transaction. The job reschedules itself while work remains. */
const BATCH = 100;
/** Upload claims with nothing attached to them are swept after this long. */
const UNATTACHED_UPLOAD_TTL_MS = 24 * 60 * 60 * 1_000;
/**
 * How long a scan may sit in `processing` before it is treated as abandoned.
 *
 * One attempt is an image read plus a provider call capped at 60 seconds, so
 * anything past five minutes is not slow — it is a run that will never report
 * back. Retries schedule fresh actions rather than extending this window.
 */
const SCAN_STALL_MS = 5 * 60 * 1_000;

/**
 * Deletes AI scan images whose retention window has closed.
 *
 * Reschedules itself when a batch is full, so the documented 24-hour abandoned
 * and 30-day attached retention windows hold at any volume. The previous version
 * processed a single batch of 100 every six hours, which silently capped deletion
 * at 400 images a day.
 */
export const deleteExpiredScanImages = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number(), rescheduled: v.boolean() }),
  handler: async (ctx) => {
    const now = Date.now();
    const scans = await ctx.db
      .query("aiScans")
      .withIndex("by_retention", (q) => q.lt("retentionUntil", now))
      .take(BATCH);

    let deleted = 0;
    for (const scan of scans) {
      if (!scan.imageDeletedAt) {
        await ctx.storage.delete(scan.imageStorageId).catch(() => undefined);
        const upload = await ctx.db
          .query("imageUploads")
          .withIndex("by_storage", (q) => q.eq("storageId", scan.imageStorageId))
          .unique();
        if (upload) await ctx.db.delete(upload._id);
        deleted += 1;
      }
      // Push retentionUntil past `now` so a processed scan leaves the index window.
      await ctx.db.patch(scan._id, {
        imageDeletedAt: scan.imageDeletedAt ?? now,
        retentionUntil: now + 365 * 24 * 60 * 60 * 1_000,
        updatedAt: now,
      });
    }

    const rescheduled = scans.length === BATCH;
    if (rescheduled) {
      await ctx.scheduler.runAfter(0, internal.maintenance.deleteExpiredScanImages, {});
    }
    return { deleted, rescheduled };
  },
});

/**
 * Removes upload claims for blobs that were never attached to a scan or a log, so
 * an abandoned camera session cannot retain a meal photo indefinitely.
 *
 * Attachment is recorded on the claim itself, so this is a bounded index range
 * scan rather than a cross-check against every scan and log the user owns.
 */
export const sweepUnattachedUploads = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number(), rescheduled: v.boolean() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - UNATTACHED_UPLOAD_TTL_MS;
    const stale = await ctx.db
      .query("imageUploads")
      .withIndex("by_unattached", (q) => q.eq("attachedAt", undefined).lt("createdAt", cutoff))
      .take(BATCH);

    for (const upload of stale) {
      await ctx.storage.delete(upload.storageId).catch(() => undefined);
      await ctx.db.delete(upload._id);
    }

    const rescheduled = stale.length === BATCH;
    if (rescheduled) {
      await ctx.scheduler.runAfter(0, internal.maintenance.sweepUnattachedUploads, {});
    }
    return { deleted: stale.length, rescheduled };
  },
});

/**
 * Recovers scans abandoned mid-analysis.
 *
 * `claimForAnalysis` moves a scan to `processing`, and only the action's own
 * catch block moves it out again. When that action dies outright the row is
 * stranded: no schedule points at it, no retry is queued, and the scan screen
 * subscribes to a status that will never change. This is the only thing that
 * can free it.
 *
 * A scan with attempts left is re-queued rather than failed — the user already
 * spent quota on it, and the fault was ours, not the photo's.
 */
export const reapStalledScans = internalMutation({
  args: {},
  returns: v.object({ requeued: v.number(), failed: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const stalled = await ctx.db
      .query("aiScans")
      .withIndex("by_status_updated", (q) =>
        q.eq("status", "processing").lt("updatedAt", now - SCAN_STALL_MS),
      )
      .take(BATCH);

    let requeued = 0;
    let failed = 0;
    for (const scan of stalled) {
      const canRetry = (scan.attempts ?? 0) < MAX_SCAN_ATTEMPTS && !scan.imageDeletedAt;
      if (canRetry) {
        await ctx.db.patch(scan._id, { status: "pending", updatedAt: now });
        await ctx.scheduler.runAfter(0, internal.ai.runScanAnalysis, { scanId: scan._id });
        requeued += 1;
      } else {
        await ctx.db.patch(scan._id, {
          status: "failed",
          failureCategory: "stalled",
          updatedAt: now,
        });
        failed += 1;
      }
    }

    if (requeued + failed > 0) {
      console.warn("[food-analysis] reaped stalled scans", { requeued, failed });
    }
    return { requeued, failed };
  },
});

/** Drops export archives whose download window has closed. */
export const deleteExpiredExports = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const jobs = await ctx.db.query("exportJobs").take(BATCH);

    let deleted = 0;
    for (const job of jobs) {
      if (job.expiresAt === undefined || job.expiresAt > now) continue;
      if (job.storageId) await ctx.storage.delete(job.storageId).catch(() => undefined);
      await ctx.db.delete(job._id);
      deleted += 1;
    }
    return { deleted };
  },
});

/** Clears rate-limit counters whose window has long passed. */
export const pruneRateLimits = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1_000;
    const rows = await ctx.db.query("rateLimits").take(BATCH * 5);
    let deleted = 0;
    for (const row of rows) {
      if (row.windowStart >= cutoff) continue;
      await ctx.db.delete(row._id);
      deleted += 1;
    }
    return { deleted };
  },
});
