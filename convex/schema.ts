import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const nutrition = {
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
};

export const mealTypeValidator = v.union(
  v.literal("breakfast"),
  v.literal("lunch"),
  v.literal("dinner"),
  v.literal("snack"),
);
export const goalTypeValidator = v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain"));
export const goalPaceValidator = v.union(v.literal("slow"), v.literal("recommended"), v.literal("faster"));
export const activityLevelValidator = v.union(
  v.literal("sedentary"),
  v.literal("light"),
  v.literal("active"),
  v.literal("veryActive"),
);
export const calculationBasisValidator = v.union(v.literal("female"), v.literal("male"));
export const weightUnitValidator = v.union(v.literal("kg"), v.literal("lb"));
export const heightUnitValidator = v.union(v.literal("cm"), v.literal("imperial"));
export const foodSourceValidator = v.union(v.literal("ai"), v.literal("manual"), v.literal("catalog"));

/**
 * Every user-scoped table carries a plain `by_user` index so account export and
 * deletion can iterate them generically. Additional composite indexes exist for
 * the read paths that need them; they never replace `by_user`.
 */
export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    lifecycleState: v.union(v.literal("active"), v.literal("deletionPending")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    dateOfBirth: v.string(),
    /** Precision actually collected from the user. "year" means the month/day are derived, not supplied. */
    dateOfBirthPrecision: v.optional(v.union(v.literal("day"), v.literal("year"))),
    calculationBasis: calculationBasisValidator,
    heightCm: v.number(),
    currentWeightKg: v.number(),
    goalWeightKg: v.number(),
    weightUnit: weightUnitValidator,
    heightUnit: heightUnitValidator,
    activityLevel: activityLevelValidator,
    goalType: goalTypeValidator,
    goalPace: goalPaceValidator,
    locale: v.string(),
    timezone: v.string(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  nutritionGoals: defineTable({
    userId: v.id("users"),
    ...nutrition,
    effectiveFrom: v.string(),
    formulaVersion: v.string(),
    calculationMetadata: v.object({
      bmr: v.optional(v.number()),
      tdee: v.optional(v.number()),
      requestedAdjustment: v.optional(v.number()),
      appliedAdjustment: v.optional(v.number()),
      paceWasCapped: v.optional(v.boolean()),
      aiGenerated: v.optional(v.boolean()),
      activityLevel: v.optional(v.string()),
      age: v.optional(v.number()),
      calculationBasis: v.optional(v.string()),
      currentWeightKg: v.optional(v.number()),
      formulaVersion: v.optional(v.string()),
      goal: v.optional(v.string()),
      goalWeightKg: v.optional(v.number()),
      heightCm: v.optional(v.number()),
      heightUnit: v.optional(v.string()),
      pace: v.optional(v.string()),
      weightUnit: v.optional(v.string()),
      aiPlan: v.optional(v.any()),
      inputs: v.optional(
        v.object({
          age: v.optional(v.number()),
          calculationBasis: v.optional(calculationBasisValidator),
          heightCm: v.optional(v.number()),
          currentWeightKg: v.optional(v.number()),
          goalWeightKg: v.optional(v.number()),
          activityLevel: v.optional(activityLevelValidator),
          goalType: v.optional(goalTypeValidator),
          goalPace: v.optional(goalPaceValidator),
          advice: v.optional(v.string()),
          formulaVersion: v.optional(v.string()),
          goal: v.optional(v.string()),
          pace: v.optional(v.string()),
          tdee: v.optional(v.number()),
          bmr: v.optional(v.number()),
          weightUnit: v.optional(v.string()),
          heightUnit: v.optional(v.string()),
        }),
      ),
    }),
    isManualOverride: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_effective", ["userId", "effectiveFrom"]),

  foodCatalog: defineTable({
    slug: v.string(),
    titles: v.record(v.string(), v.string()),
    descriptions: v.record(v.string(), v.string()),
    goalTypes: v.array(goalTypeValidator),
    mealTypes: v.array(mealTypeValidator),
    serving: v.string(),
    ...nutrition,
    ingredients: v.array(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    /** All localized titles and ingredients joined, so one search index covers every launch language. */
    searchText: v.optional(v.string()),
    active: v.boolean(),
    version: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_slug", ["slug"])
    .searchIndex("search_title", { searchField: "searchText", filterFields: ["active"] }),

  foodLogs: defineTable({
    userId: v.id("users"),
    localDate: v.string(),
    timezone: v.string(),
    mealType: mealTypeValidator,
    source: foodSourceValidator,
    foodName: v.string(),
    serving: v.string(),
    servingUnit: v.string(),
    quantity: v.number(),
    ...nutrition,
    imageStorageId: v.optional(v.id("_storage")),
    aiScanId: v.optional(v.id("aiScans")),
    clientRequestId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "localDate"])
    .index("by_user_meal_date", ["userId", "mealType", "localDate"])
    .index("by_user_request", ["userId", "clientRequestId"])
    .index("by_user_created", ["userId", "createdAt"]),

  weightLogs: defineTable({
    userId: v.id("users"),
    normalizedKg: v.number(),
    displayValue: v.number(),
    displayUnit: weightUnitValidator,
    localDate: v.string(),
    timezone: v.string(),
    note: v.optional(v.string()),
    clientRequestId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "localDate"])
    .index("by_user_request", ["userId", "clientRequestId"]),

  aiScans: defineTable({
    userId: v.id("users"),
    requestId: v.string(),
    imageStorageId: v.id("_storage"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    provider: v.string(),
    model: v.string(),
    locale: v.string(),
    /**
     * The provider's structured estimate, validated against `estimateSchema` in
     * `ai.ts` before it is written. `v.any()` is deliberate: the estimate shape is
     * owned by the AI provider contract, not the database, and pinning it here
     * would mean a schema migration every time that contract gains a field.
     */
    estimate: v.optional(v.any()),
    correctedEstimate: v.optional(v.any()),
    confidence: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    failureCategory: v.optional(v.string()),
    /**
     * Provider attempts spent on this scan. Retries reuse the same row, so a
     * transient provider error never mints a second scan — and never a second
     * charge beyond the retry itself. Absent on rows written before retries.
     */
    attempts: v.optional(v.number()),
    retentionUntil: v.number(),
    imageDeletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_request", ["userId", "requestId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_retention", ["retentionUntil"]),

  /**
   * Ownership record for every client upload. Written when the client claims the
   * storage id it just received, so the server can prove who uploaded a blob
   * before attaching it to a log or sending it to the AI provider.
   */
  imageUploads: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    purpose: v.union(v.literal("mealScan"), v.literal("mealPhoto")),
    /** Set once the blob is referenced by a scan or a food log. Unset means sweepable. */
    attachedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_storage", ["storageId"])
    .index("by_unattached", ["attachedAt", "createdAt"]),

  customFoods: defineTable({
    userId: v.id("users"),
    name: v.string(),
    serving: v.string(),
    servingUnit: v.string(),
    ...nutrition,
    favorite: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  favorites: defineTable({
    userId: v.id("users"),
    referenceType: v.union(v.literal("catalog"), v.literal("custom")),
    referenceId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_reference", ["userId", "referenceId"]),

  notificationPreferences: defineTable({
    userId: v.id("users"),
    enabled: v.boolean(),
    categories: v.object({
      daily: v.boolean(),
      meal: v.boolean(),
      hydration: v.boolean(),
      progress: v.boolean(),
      motivation: v.boolean(),
    }),
    times: v.object({
      daily: v.string(),
      meal: v.string(),
      hydration: v.string(),
      progress: v.string(),
      motivation: v.string(),
    }),
    quietHoursStart: v.optional(v.string()),
    quietHoursEnd: v.optional(v.string()),
    timezone: v.string(),
    permissionStatus: v.union(
      v.literal("granted"),
      v.literal("denied"),
      v.literal("undetermined"),
      v.literal("not_requested"),
    ),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  pushDevices: defineTable({
    userId: v.id("users"),
    installationId: v.string(),
    expoPushToken: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    locale: v.string(),
    timezone: v.string(),
    lastSeenAt: v.number(),
    invalidatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["expoPushToken"])
    .index("by_installation", ["installationId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    languageMode: v.union(v.literal("system"), v.literal("manual")),
    language: v.optional(v.string()),
    units: v.union(v.literal("metric"), v.literal("imperial")),
    appearance: v.union(v.literal("system"), v.literal("light"), v.literal("dark")),
    analyticsConsent: v.optional(v.boolean()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  subscriptionMirror: defineTable({
    userId: v.id("users"),
    revenueCatCustomerId: v.string(),
    state: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("cancelledActive"),
      v.literal("billingIssueActive"),
      v.literal("expired"),
    ),
    productId: v.optional(v.string()),
    periodType: v.optional(v.string()),
    expirationAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    trial: v.boolean(),
    /** Store event timestamp of the newest applied webhook. Guards out-of-order delivery. */
    lastEventAt: v.optional(v.number()),
    eventId: v.optional(v.string()),
    verifiedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_customer", ["revenueCatCustomerId"]),

  /**
   * Append-only log of applied RevenueCat events. Replay protection lives here
   * rather than on the mirror, which is overwritten on every state change.
   */
  subscriptionEvents: defineTable({
    eventId: v.string(),
    customerId: v.string(),
    eventType: v.string(),
    eventAt: v.number(),
    applied: v.boolean(),
    /** Set when the event arrived before the Convex user existed, so it can be replayed. */
    pendingReason: v.optional(v.string()),
    payload: v.object({
      productId: v.optional(v.string()),
      periodType: v.optional(v.string()),
      expirationAt: v.optional(v.number()),
      willRenew: v.optional(v.boolean()),
    }),
    receivedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_customer", ["customerId"])
    .index("by_pending", ["applied", "customerId"]),

  exportJobs: defineTable({
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("complete"), v.literal("failed")),
    storageId: v.optional(v.id("_storage")),
    errorCategory: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  deletionJobs: defineTable({
    userId: v.id("users"),
    clerkUserId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("dataCleared"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    /** Index into the deletion table order, so a resumed job continues where it stopped. */
    clearedTableCount: v.optional(v.number()),
    errorCategory: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  userFeedback: defineTable({
    userId: v.id("users"),
    rating: v.number(),
    feedback: v.optional(v.string()),
    locale: v.string(),
    source: v.literal("post_purchase"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_created_at", ["userId", "createdAt"]),

  /** Fixed-window counters backing per-identity rate limits on expensive actions. */
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});
