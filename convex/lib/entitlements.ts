import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const PRO_STATES = new Set(["trial", "active", "cancelledActive", "billingIssueActive"]);

/**
 * How much history a free account can read, in days, counting today.
 *
 * One number for every surface. It used to be passed per call site, and the
 * call sites disagreed — 7 for food logs, 30 for the calorie chart and weight
 * history — so a free user saw a month of calorie bars above a week of the meals
 * that produced them. Change this and every gated read moves together.
 */
export const FREE_HISTORY_DAYS = 7;

export function localDateInTimezone(timezone: string, timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function shiftLocalDate(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function freeHistoryBoundary(
  ctx: QueryCtx,
  userId: Id<"users">,
  freeDays: number = FREE_HISTORY_DAYS,
): Promise<string | null> {
  const mirror = await ctx.db
    .query("subscriptionMirror")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const hasPro =
    Boolean(mirror && PRO_STATES.has(mirror.state)) &&
    (mirror?.expirationAt === undefined || mirror.expirationAt > Date.now());
  if (hasPro) return null;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  let today: string;
  try {
    today = localDateInTimezone(profile?.timezone ?? "UTC");
  } catch {
    today = localDateInTimezone("UTC");
  }
  return shiftLocalDate(today, -(freeDays - 1));
}

export async function requireHistoryAccess(
  ctx: QueryCtx,
  userId: Id<"users">,
  requestedFromDate: string,
  requestedToDate: string,
  freeDays: number = FREE_HISTORY_DAYS,
): Promise<string> {
  if (requestedFromDate < shiftLocalDate(requestedToDate, -3_659)) {
    throw new ConvexError("History ranges are limited to ten years.");
  }
  const earliest = await freeHistoryBoundary(ctx, userId, freeDays);
  if (earliest === null) return requestedFromDate;
  // Clamp rather than throw: the entitlement remains enforced, while a stale
  // client timezone or an older app build cannot crash a reactive screen.
  return requestedFromDate < earliest ? earliest : requestedFromDate;
}
