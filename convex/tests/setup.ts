/// <reference types="@edge-runtime/vm" />
import { convexTest } from "convex-test";

import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

/**
 * Shared harness for the Convex test suite.
 *
 * `convex-test` discovers function modules through `import.meta.glob` under Vitest.
 * Jest has no equivalent, so the map below lists them explicitly. Modules are
 * loaded with `require` rather than dynamic `import` because the test project
 * compiles to CommonJS.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const modules = {
  // convex-test locates the module root through the "_generated" entries.
  "_generated/api.js": () => Promise.resolve(require("../_generated/api")),
  "_generated/server.js": () => Promise.resolve(require("../_generated/server")),
  "ai.ts": () => Promise.resolve(require("../ai")),
  "aiDb.ts": () => Promise.resolve(require("../aiDb")),
  "dashboard.ts": () => Promise.resolve(require("../dashboard")),
  "feedback.ts": () => Promise.resolve(require("../feedback")),
  "foodLogs.ts": () => Promise.resolve(require("../foodLogs")),
  "foods.ts": () => Promise.resolve(require("../foods")),
  "http.ts": () => Promise.resolve(require("../http")),
  "maintenance.ts": () => Promise.resolve(require("../maintenance")),
  "notifications.ts": () => Promise.resolve(require("../notifications")),
  "nutritionGoals.ts": () => Promise.resolve(require("../nutritionGoals")),
  "onboarding.ts": () => Promise.resolve(require("../onboarding")),
  "planGeneration.ts": () => Promise.resolve(require("../planGeneration")),
  "planGenerationDb.ts": () => Promise.resolve(require("../planGenerationDb")),
  "profiles.ts": () => Promise.resolve(require("../profiles")),
  "seed.ts": () => Promise.resolve(require("../seed")),
  "settings.ts": () => Promise.resolve(require("../settings")),
  "subscriptions.ts": () => Promise.resolve(require("../subscriptions")),
  "subscriptionsActions.ts": () => Promise.resolve(require("../subscriptionsActions")),
  "subscriptionsDb.ts": () => Promise.resolve(require("../subscriptionsDb")),
  "uploads.ts": () => Promise.resolve(require("../uploads")),
  "users.ts": () => Promise.resolve(require("../users")),
  "usersActions.ts": () => Promise.resolve(require("../usersActions")),
  "usersDb.ts": () => Promise.resolve(require("../usersDb")),
  "weights.ts": () => Promise.resolve(require("../weights")),
};

export function setupTest() {
  return convexTest(schema, modules);
}

/**
 * Drains work queued with `ctx.scheduler` — `users.syncFromClerk` schedules the
 * pending-subscription replay — so nothing executes after Jest tears the
 * environment down.
 */
export async function settle(t: TestConvex) {
  await t.finishInProgressScheduledFunctions();
}

export type TestConvex = ReturnType<typeof setupTest>;

/** A handle bound to one identity, as returned by `withIdentity`. */
export type TestActor = ReturnType<TestConvex["withIdentity"]>;

/** An identity shaped like the Clerk subject the app actually receives. */
export function identity(subject: string) {
  return { subject, issuer: "https://example.clerk.accounts.dev", tokenIdentifier: `test|${subject}` };
}

/** Creates a signed-in, onboarded user and returns handles for acting as them. */
export async function createUser(
  t: TestConvex,
  subject = "user_primary",
  email = `${subject}@example.com`,
) {
  const asUser = t.withIdentity(identity(subject));
  const userId = await asUser.mutation(api.users.syncFromClerk, { email });
  // syncFromClerk schedules the pending-subscription replay; drain it here so no
  // scheduled work runs after Jest tears the environment down.
  await settle(t);
  return { asUser, userId, subject };
}

/** Grants the `pro` entitlement by writing the server-side gating mirror. */
export async function grantPro(t: TestConvex, subject: string, expirationAt?: number) {
  await t.mutation(internal.subscriptions.applyVerification, {
    customerId: subject,
    active: true,
    trial: false,
    productId: "bodycal_annual",
    expirationAt,
    willRenew: true,
  });
}

/** Stores a blob and claims it for the given user, mirroring the client upload flow. */
export async function claimUpload(
  t: TestConvex,
  asUser: TestActor,
  purpose: "mealScan" | "mealPhoto" = "mealScan",
): Promise<Id<"_storage">> {
  const storageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob([new Uint8Array(64)], { type: "image/jpeg" })),
  );
  await asUser.mutation(api.uploads.claim, { storageId, purpose });
  return storageId;
}

export const ONBOARDING_INPUT = {
  dateOfBirth: "1994-07-01",
  dateOfBirthPrecision: "year" as const,
  calculationBasis: "female" as const,
  heightCm: 165,
  currentWeightKg: 70,
  goalWeightKg: 65,
  weightUnit: "kg" as const,
  heightUnit: "cm" as const,
  activityLevel: "light" as const,
  goalType: "lose" as const,
  goalPace: "recommended" as const,
  locale: "en",
  timezone: "Europe/Berlin",
  effectiveFrom: "2026-08-13",
};

export const FOOD_ENTRY = {
  localDate: "2026-08-13",
  timezone: "Europe/Berlin",
  mealType: "lunch" as const,
  source: "manual" as const,
  foodName: "Chicken and rice",
  serving: "1 bowl",
  servingUnit: "portion",
  quantity: 1,
  calories: 640,
  proteinGrams: 45,
  carbsGrams: 70,
  fatGrams: 18,
  clientRequestId: "req-1",
};
