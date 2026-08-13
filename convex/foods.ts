import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import {
  assertBoundedString,
  assertEntryNutrition,
  assertLocale,
  boundedLimit,
  LIMITS,
} from "./lib/validation";
import { goalTypeValidator, mealTypeValidator } from "./schema";

const catalogItem = v.object({
  _id: v.id("foodCatalog"),
  slug: v.string(),
  title: v.string(),
  description: v.string(),
  serving: v.string(),
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
  goalTypes: v.array(goalTypeValidator),
  mealTypes: v.array(mealTypeValidator),
  ingredients: v.array(v.string()),
  imageUrl: v.union(v.string(), v.null()),
  isFavorite: v.boolean(),
});

const customFood = v.object({
  _id: v.id("customFoods"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  serving: v.string(),
  servingUnit: v.string(),
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
  favorite: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Picks the requested language, then English, then any available string. */
function localized(values: Record<string, string>, locale: string) {
  return values[locale] ?? values[locale.split("-")[0]] ?? values.en ?? Object.values(values)[0] ?? "";
}

async function present(
  ctx: QueryCtx,
  food: Doc<"foodCatalog">,
  locale: string,
  favoriteIds: Set<string>,
) {
  return {
    _id: food._id,
    slug: food.slug,
    title: localized(food.titles, locale),
    description: localized(food.descriptions, locale),
    serving: food.serving,
    calories: food.calories,
    proteinGrams: food.proteinGrams,
    carbsGrams: food.carbsGrams,
    fatGrams: food.fatGrams,
    goalTypes: food.goalTypes,
    mealTypes: food.mealTypes,
    ingredients: food.ingredients,
    imageUrl: food.imageStorageId ? await ctx.storage.getUrl(food.imageStorageId) : null,
    isFavorite: favoriteIds.has(food._id),
  };
}

/**
 * Full-text catalog search backed by a Convex search index.
 *
 * The previous implementation read the first 100 rows and filtered them in
 * JavaScript, so nothing past row 100 was findable at all.
 */
export const searchCatalog = query({
  args: {
    query: v.string(),
    locale: v.string(),
    mealType: v.optional(mealTypeValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(catalogItem),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const locale = assertLocale(args.locale);
    const term = args.query.trim().slice(0, LIMITS.searchQuery);
    const limit = boundedLimit(args.limit, 30, 50);

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const favoriteIds = new Set(favorites.map((item) => item.referenceId));

    const foods = term
      ? await ctx.db
          .query("foodCatalog")
          .withSearchIndex("search_title", (q) => q.search("searchText", term).eq("active", true))
          .take(limit)
      : await ctx.db
          .query("foodCatalog")
          .withIndex("by_active", (q) => q.eq("active", true))
          .take(limit);

    const filtered = args.mealType
      ? foods.filter((food) => food.mealTypes.includes(args.mealType!))
      : foods;

    return await Promise.all(filtered.map((food) => present(ctx, food, locale, favoriteIds)));
  },
});

export const getRecommendations = query({
  args: { goalType: goalTypeValidator, locale: v.string(), limit: v.optional(v.number()) },
  returns: v.array(catalogItem),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const locale = assertLocale(args.locale);
    const limit = boundedLimit(args.limit, 24, 50);

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const favoriteIds = new Set(favorites.map((item) => item.referenceId));

    const foods = await ctx.db
      .query("foodCatalog")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(200);

    const matching = foods.filter((food) => food.goalTypes.includes(args.goalType)).slice(0, limit);
    return await Promise.all(matching.map((food) => present(ctx, food, locale, favoriteIds)));
  },
});

export const getById = query({
  args: { id: v.id("foodCatalog"), locale: v.string() },
  returns: v.union(catalogItem, v.null()),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const locale = assertLocale(args.locale);
    const food = await ctx.db.get(args.id);
    if (!food || !food.active) return null;

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_reference", (q) => q.eq("userId", user._id).eq("referenceId", args.id))
      .unique();
    return await present(ctx, food, locale, new Set(favorite ? [args.id] : []));
  },
});

export const getFavorites = query({
  args: { locale: v.string() },
  returns: v.array(catalogItem),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const locale = assertLocale(args.locale);

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100);
    const catalogRefs = favorites.filter((item) => item.referenceType === "catalog");
    const favoriteIds = new Set(favorites.map((item) => item.referenceId));

    const foods = await Promise.all(
      catalogRefs.map((item) => ctx.db.get(item.referenceId as Doc<"foodCatalog">["_id"])),
    );
    const present$ = foods
      .filter((food): food is Doc<"foodCatalog"> => food !== null && food.active)
      .map((food) => present(ctx, food, locale, favoriteIds));
    return await Promise.all(present$);
  },
});

/** Distinct recent entries, so re-logging a usual meal is one tap. */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      foodName: v.string(),
      serving: v.string(),
      servingUnit: v.string(),
      quantity: v.number(),
      calories: v.number(),
      proteinGrams: v.number(),
      carbsGrams: v.number(),
      fatGrams: v.number(),
      lastLoggedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limit = boundedLimit(args.limit, 20, 50);

    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit * 3);

    const seen = new Set<string>();
    const distinct: {
      foodName: string;
      serving: string;
      servingUnit: string;
      quantity: number;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
      lastLoggedAt: number;
    }[] = [];

    for (const log of logs) {
      const key = `${log.foodName}:${log.serving}:${log.servingUnit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      distinct.push({
        foodName: log.foodName,
        serving: log.serving,
        servingUnit: log.servingUnit,
        quantity: log.quantity,
        calories: log.calories,
        proteinGrams: log.proteinGrams,
        carbsGrams: log.carbsGrams,
        fatGrams: log.fatGrams,
        lastLoggedAt: log.createdAt,
      });
      if (distinct.length === limit) break;
    }

    return distinct;
  },
});

/**
 * Toggles a favorite. Verifies that the target exists and, for a custom food,
 * that the caller owns it — a raw string reference was previously accepted.
 */
export const toggleFavorite = mutation({
  args: {
    referenceType: v.union(v.literal("catalog"), v.literal("custom")),
    referenceId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const referenceId = assertBoundedString(args.referenceId, 64, "referenceId");

    if (args.referenceType === "catalog") {
      const food = await ctx.db.get(referenceId as Doc<"foodCatalog">["_id"]);
      if (!food || !("slug" in food)) throw new ConvexError("Food not found");
    } else {
      const food = await ctx.db.get(referenceId as Doc<"customFoods">["_id"]);
      if (!food || !("userId" in food) || food.userId !== user._id) {
        throw new ConvexError("Food not found");
      }
    }

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_reference", (q) => q.eq("userId", user._id).eq("referenceId", referenceId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("favorites", {
      userId: user._id,
      referenceType: args.referenceType,
      referenceId,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const listCustomFoods = query({
  args: {},
  returns: v.array(customFood),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("customFoods")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

/** Saves a reusable custom food. Distinct from logging it against a day. */
export const createCustomFood = mutation({
  args: {
    name: v.string(),
    serving: v.string(),
    servingUnit: v.string(),
    calories: v.number(),
    proteinGrams: v.number(),
    carbsGrams: v.number(),
    fatGrams: v.number(),
  },
  returns: v.id("customFoods"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertEntryNutrition({ ...args, quantity: 1 });

    const existing = await ctx.db
      .query("customFoods")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(200);
    if (existing.length >= 200) throw new ConvexError("Custom food limit reached");

    const now = Date.now();
    return await ctx.db.insert("customFoods", {
      userId: user._id,
      name: assertBoundedString(args.name, LIMITS.foodName, "name"),
      serving: assertBoundedString(args.serving, LIMITS.serving, "serving"),
      servingUnit: assertBoundedString(args.servingUnit, LIMITS.servingUnit, "servingUnit"),
      calories: args.calories,
      proteinGrams: args.proteinGrams,
      carbsGrams: args.carbsGrams,
      fatGrams: args.fatGrams,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removeCustomFood = mutation({
  args: { id: v.id("customFoods") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const record = await ctx.db.get(id);
    if (!record || record.userId !== user._id) throw new ConvexError("Food not found");

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_reference", (q) => q.eq("userId", user._id).eq("referenceId", id))
      .unique();
    if (favorite) await ctx.db.delete(favorite._id);

    await ctx.db.delete(id);
    return null;
  },
});
