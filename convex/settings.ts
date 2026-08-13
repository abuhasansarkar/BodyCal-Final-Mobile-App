import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { assertLocale } from "./lib/validation";

/**
 * User-facing app preferences, mirrored server-side so they survive reinstalls and
 * follow the account across devices. Previously the `userSettings` table had no
 * writer at all and every one of these choices was device-local.
 */

const settings = v.object({
  languageMode: v.union(v.literal("system"), v.literal("manual")),
  language: v.optional(v.string()),
  units: v.union(v.literal("metric"), v.literal("imperial")),
  appearance: v.union(v.literal("system"), v.literal("light"), v.literal("dark")),
  analyticsConsent: v.optional(v.boolean()),
  updatedAt: v.number(),
});

export const get = query({
  args: {},
  returns: v.union(settings, v.null()),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const record = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!record) return null;
    return {
      languageMode: record.languageMode,
      language: record.language,
      units: record.units,
      appearance: record.appearance,
      analyticsConsent: record.analyticsConsent,
      updatedAt: record.updatedAt,
    };
  },
});

export const update = mutation({
  args: {
    languageMode: v.optional(v.union(v.literal("system"), v.literal("manual"))),
    language: v.optional(v.string()),
    units: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
    appearance: v.optional(v.union(v.literal("system"), v.literal("light"), v.literal("dark"))),
    analyticsConsent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const language = args.language === undefined ? undefined : assertLocale(args.language);
    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        languageMode: args.languageMode ?? "system",
        language,
        units: args.units ?? "metric",
        appearance: args.appearance ?? "system",
        analyticsConsent: args.analyticsConsent,
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.patch(existing._id, {
      languageMode: args.languageMode ?? existing.languageMode,
      language: args.language === undefined ? existing.language : language,
      units: args.units ?? existing.units,
      appearance: args.appearance ?? existing.appearance,
      analyticsConsent:
        args.analyticsConsent === undefined ? existing.analyticsConsent : args.analyticsConsent,
      updatedAt: now,
    });
    return null;
  },
});
