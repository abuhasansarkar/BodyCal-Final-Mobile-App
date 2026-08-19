import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

/**
 * Scheduled maintenance. Every reference goes through the generated `internal`
 * API so a rename is a typecheck failure rather than a silent runtime break.
 */
const crons = cronJobs();

crons.interval(
  "delete expired AI scan images",
  { hours: 1 },
  internal.maintenance.deleteExpiredScanImages,
  {},
);

crons.interval(
  "sweep unattached image uploads",
  { hours: 6 },
  internal.maintenance.sweepUnattachedUploads,
  {},
);

// Frequent by design: this is the only thing that frees a user from a scan
// spinner that would otherwise never resolve.
crons.interval("recover stalled AI scans", { minutes: 2 }, internal.maintenance.reapStalledScans, {});

crons.interval("delete expired export archives", { hours: 12 }, internal.maintenance.deleteExpiredExports, {});

crons.interval("prune rate-limit counters", { hours: 24 }, internal.maintenance.pruneRateLimits, {});

export default crons;
