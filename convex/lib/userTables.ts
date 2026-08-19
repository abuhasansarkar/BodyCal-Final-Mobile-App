import type { TableNames } from "../_generated/dataModel";

/**
 * Every table that stores data belonging to one user, in the order deletion
 * processes them. Each entry MUST have a `by_user` index — see `schema.ts`.
 *
 * Adding a user-scoped table without adding it here silently leaves data behind
 * on account deletion, so keep this list and the schema in step.
 */
export const USER_SCOPED_TABLES = [
  "foodLogs",
  "weightLogs",
  "aiScans",
  "imageUploads",
  "customFoods",
  "favorites",
  "nutritionGoals",
  "notificationPreferences",
  "userSettings",
  "userFeedback",
  "subscriptionMirror",
  "userProfiles",
] as const satisfies readonly TableNames[];

export type UserScopedTable = (typeof USER_SCOPED_TABLES)[number];

/** Tables included in a data export. Mirrors deletion minus internal bookkeeping. */
export const EXPORTED_TABLES = USER_SCOPED_TABLES.filter(
  (table) => table !== "imageUploads",
) as readonly UserScopedTable[];
