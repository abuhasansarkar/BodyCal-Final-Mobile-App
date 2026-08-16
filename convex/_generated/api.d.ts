/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiDb from "../aiDb.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as feedback from "../feedback.js";
import type * as foodLogs from "../foodLogs.js";
import type * as foods from "../foods.js";
import type * as http from "../http.js";
import type * as lib_aiProvider from "../lib/aiProvider.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_entitlements from "../lib/entitlements.js";
import type * as lib_estimate from "../lib/estimate.js";
import type * as lib_nutrition from "../lib/nutrition.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_userTables from "../lib/userTables.js";
import type * as lib_validation from "../lib/validation.js";
import type * as maintenance from "../maintenance.js";
import type * as notifications from "../notifications.js";
import type * as nutritionGoals from "../nutritionGoals.js";
import type * as onboarding from "../onboarding.js";
import type * as planGeneration from "../planGeneration.js";
import type * as planGenerationDb from "../planGenerationDb.js";
import type * as profiles from "../profiles.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as subscriptions from "../subscriptions.js";
import type * as subscriptionsActions from "../subscriptionsActions.js";
import type * as subscriptionsDb from "../subscriptionsDb.js";
import type * as tests_setup from "../tests/setup.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";
import type * as usersActions from "../usersActions.js";
import type * as usersDb from "../usersDb.js";
import type * as weights from "../weights.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiDb: typeof aiDb;
  crons: typeof crons;
  dashboard: typeof dashboard;
  feedback: typeof feedback;
  foodLogs: typeof foodLogs;
  foods: typeof foods;
  http: typeof http;
  "lib/aiProvider": typeof lib_aiProvider;
  "lib/auth": typeof lib_auth;
  "lib/entitlements": typeof lib_entitlements;
  "lib/estimate": typeof lib_estimate;
  "lib/nutrition": typeof lib_nutrition;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/userTables": typeof lib_userTables;
  "lib/validation": typeof lib_validation;
  maintenance: typeof maintenance;
  notifications: typeof notifications;
  nutritionGoals: typeof nutritionGoals;
  onboarding: typeof onboarding;
  planGeneration: typeof planGeneration;
  planGenerationDb: typeof planGenerationDb;
  profiles: typeof profiles;
  seed: typeof seed;
  settings: typeof settings;
  subscriptions: typeof subscriptions;
  subscriptionsActions: typeof subscriptionsActions;
  subscriptionsDb: typeof subscriptionsDb;
  "tests/setup": typeof tests_setup;
  uploads: typeof uploads;
  users: typeof users;
  usersActions: typeof usersActions;
  usersDb: typeof usersDb;
  weights: typeof weights;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
