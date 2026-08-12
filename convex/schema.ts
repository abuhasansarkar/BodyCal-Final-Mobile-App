import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const nutrition = {
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
};

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(), email: v.string(), name: v.optional(v.string()), avatarUrl: v.optional(v.string()),
    onboardingCompleted: v.boolean(), lifecycleState: v.union(v.literal("active"), v.literal("deletionPending")), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),
  userProfiles: defineTable({
    userId: v.id("users"), dateOfBirth: v.string(), calculationBasis: v.union(v.literal("female"), v.literal("male")),
    heightCm: v.number(), currentWeightKg: v.number(), goalWeightKg: v.number(),
    weightUnit: v.union(v.literal("kg"), v.literal("lb")), heightUnit: v.union(v.literal("cm"), v.literal("imperial")),
    activityLevel: v.union(v.literal("sedentary"), v.literal("light"), v.literal("active"), v.literal("veryActive")),
    goalType: v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain")), goalPace: v.union(v.literal("slow"), v.literal("recommended"), v.literal("faster")),
    locale: v.string(), timezone: v.string(), updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  nutritionGoals: defineTable({
    userId: v.id("users"), ...nutrition, effectiveFrom: v.string(), formulaVersion: v.string(),
    calculationMetadata: v.any(), isManualOverride: v.boolean(), createdAt: v.number(),
  }).index("by_user_effective", ["userId", "effectiveFrom"]),
  foodCatalog: defineTable({
    slug: v.string(), titles: v.record(v.string(), v.string()), descriptions: v.record(v.string(), v.string()),
    goalTypes: v.array(v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain"))),
    mealTypes: v.array(v.union(v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack"))),
    serving: v.string(), ...nutrition, ingredients: v.array(v.string()), imageStorageId: v.optional(v.id("_storage")), active: v.boolean(), version: v.number(),
  }).index("by_active", ["active"]).index("by_slug", ["slug"]),
  foodLogs: defineTable({
    userId: v.id("users"), localDate: v.string(), timezone: v.string(),
    mealType: v.union(v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack")),
    source: v.union(v.literal("ai"), v.literal("manual"), v.literal("catalog")), foodName: v.string(),
    serving: v.string(), servingUnit: v.string(), quantity: v.number(), ...nutrition,
    imageStorageId: v.optional(v.id("_storage")), aiScanId: v.optional(v.id("aiScans")), clientRequestId: v.string(), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_user_date", ["userId", "localDate"]).index("by_user_meal_date", ["userId", "mealType", "localDate"]).index("by_user_request", ["userId", "clientRequestId"]).index("by_user_created", ["userId", "createdAt"]),
  weightLogs: defineTable({
    userId: v.id("users"), normalizedKg: v.number(), displayValue: v.number(), displayUnit: v.union(v.literal("kg"), v.literal("lb")),
    localDate: v.string(), timezone: v.string(), note: v.optional(v.string()), clientRequestId: v.string(), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_user_date", ["userId", "localDate"]).index("by_user_request", ["userId", "clientRequestId"]),
  aiScans: defineTable({
    userId: v.id("users"), requestId: v.string(), imageStorageId: v.id("_storage"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    provider: v.string(), model: v.string(), locale: v.string(), estimate: v.optional(v.any()), correctedEstimate: v.optional(v.any()),
    confidence: v.optional(v.string()), latencyMs: v.optional(v.number()), inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()), estimatedCostUsd: v.optional(v.number()),
    failureCategory: v.optional(v.string()), retentionUntil: v.number(), imageDeletedAt: v.optional(v.number()), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_user_request", ["userId", "requestId"]).index("by_user_created", ["userId", "createdAt"]).index("by_retention", ["retentionUntil"]),
  customFoods: defineTable({ userId: v.id("users"), name: v.string(), serving: v.string(), servingUnit: v.string(), ...nutrition, favorite: v.boolean(), createdAt: v.number(), updatedAt: v.number() }).index("by_user", ["userId"]),
  favorites: defineTable({ userId: v.id("users"), referenceType: v.union(v.literal("catalog"), v.literal("custom")), referenceId: v.string(), createdAt: v.number() }).index("by_user", ["userId"]).index("by_user_reference", ["userId", "referenceId"]),
  notificationPreferences: defineTable({
    userId: v.id("users"), enabled: v.boolean(), categories: v.record(v.string(), v.boolean()), times: v.record(v.string(), v.string()), timezone: v.string(), permissionStatus: v.string(), updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  pushDevices: defineTable({ userId: v.id("users"), installationId: v.string(), expoPushToken: v.string(), platform: v.string(), locale: v.string(), timezone: v.string(), lastSeenAt: v.number(), invalidatedAt: v.optional(v.number()) }).index("by_user", ["userId"]).index("by_token", ["expoPushToken"]).index("by_installation", ["installationId"]),
  userSettings: defineTable({ userId: v.id("users"), languageMode: v.union(v.literal("system"), v.literal("manual")), language: v.optional(v.string()), units: v.union(v.literal("metric"), v.literal("imperial")), appearance: v.union(v.literal("system"), v.literal("light"), v.literal("dark")), analyticsConsent: v.optional(v.boolean()), updatedAt: v.number() }).index("by_user", ["userId"]),
  subscriptionMirror: defineTable({
    userId: v.id("users"), revenueCatCustomerId: v.string(), state: v.union(v.literal("trial"), v.literal("active"), v.literal("cancelledActive"), v.literal("billingIssueActive"), v.literal("expired")),
    productId: v.optional(v.string()), periodType: v.optional(v.string()), expirationAt: v.optional(v.number()), willRenew: v.optional(v.boolean()), trial: v.boolean(), eventId: v.optional(v.string()), verifiedAt: v.number(), updatedAt: v.number(),
  }).index("by_user", ["userId"]).index("by_customer", ["revenueCatCustomerId"]).index("by_event", ["eventId"]),
  exportJobs: defineTable({
    userId: v.id("users"), status: v.union(v.literal("pending"), v.literal("complete"), v.literal("failed")),
    storageId: v.optional(v.id("_storage")), errorCategory: v.optional(v.string()), expiresAt: v.optional(v.number()), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  deletionJobs: defineTable({
    userId: v.id("users"), clerkUserId: v.string(), status: v.union(v.literal("pending"), v.literal("failed")),
    errorCategory: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  userFeedback: defineTable({
    userId: v.id("users"), rating: v.number(), feedback: v.optional(v.string()), locale: v.string(),
    source: v.literal("post_purchase"), createdAt: v.number(),
  }).index("by_user_and_created_at", ["userId", "createdAt"]),
});
