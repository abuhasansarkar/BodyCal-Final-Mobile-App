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
function loadModule(relPath: string) {
  const m = require(relPath);
  return Promise.resolve({ ...m, default: m });
}

export const modules = {
  // convex-test locates the module root through the "_generated" entries.
  "_generated/api.js": () => loadModule("../_generated/api"),
  "_generated/server.js": () => loadModule("../_generated/server"),
  "ai.ts": () => loadModule("../ai"),
  "ai.js": () => loadModule("../ai"),
  "ai": () => loadModule("../ai"),
  "aiDb.ts": () => loadModule("../aiDb"),
  "aiDb.js": () => loadModule("../aiDb"),
  "aiDb": () => loadModule("../aiDb"),
  "dashboard.ts": () => loadModule("../dashboard"),
  "dashboard.js": () => loadModule("../dashboard"),
  "dashboard": () => loadModule("../dashboard"),
  "feedback.ts": () => loadModule("../feedback"),
  "feedback.js": () => loadModule("../feedback"),
  "feedback": () => loadModule("../feedback"),
  "foodLogs.ts": () => loadModule("../foodLogs"),
  "foodLogs.js": () => loadModule("../foodLogs"),
  "foodLogs": () => loadModule("../foodLogs"),
  "foods.ts": () => loadModule("../foods"),
  "foods.js": () => loadModule("../foods"),
  "foods": () => loadModule("../foods"),
  "http.ts": () => loadModule("../http"),
  "http.js": () => loadModule("../http"),
  "http": () => loadModule("../http"),
  "maintenance.ts": () => loadModule("../maintenance"),
  "maintenance.js": () => loadModule("../maintenance"),
  "maintenance": () => loadModule("../maintenance"),
  "notifications.ts": () => loadModule("../notifications"),
  "notifications.js": () => loadModule("../notifications"),
  "notifications": () => loadModule("../notifications"),
  "nutritionGoals.ts": () => loadModule("../nutritionGoals"),
  "nutritionGoals.js": () => loadModule("../nutritionGoals"),
  "nutritionGoals": () => loadModule("../nutritionGoals"),
  "onboarding.ts": () => loadModule("../onboarding"),
  "onboarding.js": () => loadModule("../onboarding"),
  "onboarding": () => loadModule("../onboarding"),
  "planGeneration.ts": () => loadModule("../planGeneration"),
  "planGeneration.js": () => loadModule("../planGeneration"),
  "planGeneration": () => loadModule("../planGeneration"),
  "planGenerationDb.ts": () => loadModule("../planGenerationDb"),
  "planGenerationDb.js": () => loadModule("../planGenerationDb"),
  "planGenerationDb": () => loadModule("../planGenerationDb"),
  "profiles.ts": () => loadModule("../profiles"),
  "profiles.js": () => loadModule("../profiles"),
  "profiles": () => loadModule("../profiles"),
  "seed.ts": () => loadModule("../seed"),
  "seed.js": () => loadModule("../seed"),
  "seed": () => loadModule("../seed"),
  "settings.ts": () => loadModule("../settings"),
  "settings.js": () => loadModule("../settings"),
  "settings": () => loadModule("../settings"),
  "subscriptions.ts": () => loadModule("../subscriptions"),
  "subscriptions.js": () => loadModule("../subscriptions"),
  "subscriptions": () => loadModule("../subscriptions"),
  "subscriptionsActions.ts": () => loadModule("../subscriptionsActions"),
  "subscriptionsActions.js": () => loadModule("../subscriptionsActions"),
  "subscriptionsActions": () => loadModule("../subscriptionsActions"),
  "subscriptionsDb.ts": () => loadModule("../subscriptionsDb"),
  "subscriptionsDb.js": () => loadModule("../subscriptionsDb"),
  "subscriptionsDb": () => loadModule("../subscriptionsDb"),
  "uploads.ts": () => loadModule("../uploads"),
  "uploads.js": () => loadModule("../uploads"),
  "uploads": () => loadModule("../uploads"),
  "users.ts": () => loadModule("../users"),
  "users.js": () => loadModule("../users"),
  "users": () => loadModule("../users"),
  "usersActions.ts": () => loadModule("../usersActions"),
  "usersActions.js": () => loadModule("../usersActions"),
  "usersActions": () => loadModule("../usersActions"),
  "usersDb.ts": () => loadModule("../usersDb"),
  "usersDb.js": () => loadModule("../usersDb"),
  "usersDb": () => loadModule("../usersDb"),
  "weights.ts": () => loadModule("../weights"),
  "weights.js": () => loadModule("../weights"),
  "weights": () => loadModule("../weights"),
};

const activeInstances = new Set<TestConvex>();

export function setupTest() {
  const t = convexTest(schema, modules);
  activeInstances.add(t);
  return t;
}

declare const afterEach: any;

if (typeof afterEach === "function") {
  afterEach(async () => {
    for (const t of activeInstances) {
      try {
        await t.finishInProgressScheduledFunctions();
      } catch {
        // Ignore errors during teardown cleanup
      }
    }
    activeInstances.clear();
  });
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
