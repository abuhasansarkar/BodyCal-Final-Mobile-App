import { z } from "zod";

/**
 * Public runtime configuration.
 *
 * Only `EXPO_PUBLIC_*` values belong here — everything in this file is compiled
 * into the shipped bundle. Server secrets (Clerk secret key, RevenueCat secret
 * key, webhook secret, AI provider key) live exclusively in the Convex deployment
 * environment and must never be referenced from `src/`.
 */

const optionalUrl = z.string().url().optional().or(z.literal(""));

const publicEnvSchema = z.object({
  clerkPublishableKey: z.string().optional(),
  convexUrl: optionalUrl,
  revenueCatIosKey: z.string().optional(),
  revenueCatAndroidKey: z.string().optional(),
  sentryDsn: optionalUrl,
  analyticsKey: z.string().optional(),
  analyticsHost: optionalUrl,
  termsUrl: optionalUrl,
  privacyUrl: optionalUrl,
});

export const publicEnv = publicEnvSchema.parse({
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY,
  analyticsHost: process.env.EXPO_PUBLIC_ANALYTICS_HOST,
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL,
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL,
});

/** Variables without which the app cannot authenticate or reach its backend. */
const REQUIRED_IN_PRODUCTION = {
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publicEnv.clerkPublishableKey,
  EXPO_PUBLIC_CONVEX_URL: publicEnv.convexUrl,
} as const;

export const missingRequiredEnv = Object.entries(REQUIRED_IN_PRODUCTION)
  .filter(([, value]) => !value)
  .map(([name]) => name);

/**
 * Configuration the app runs happily without, but neither store will accept.
 *
 * Apple requires a reachable privacy policy and EULA from the subscription
 * purchase screen; Play requires a privacy policy URL. Shipping without them is
 * a guaranteed rejection, so a release build fails here rather than in review.
 * Kept apart from `REQUIRED_IN_PRODUCTION` on purpose: these say nothing about
 * whether the backend is reachable, so they must not feed
 * `hasBackendConfiguration` and send a developer into the setup fallback.
 */
const REQUIRED_FOR_RELEASE = {
  EXPO_PUBLIC_TERMS_URL: publicEnv.termsUrl,
  EXPO_PUBLIC_PRIVACY_URL: publicEnv.privacyUrl,
} as const;

export const missingReleaseEnv = Object.entries(REQUIRED_FOR_RELEASE)
  .filter(([, value]) => !value)
  .map(([name]) => name);

/**
 * RevenueCat's Test Store keys are prefixed `test_`, and both platform keys
 * carry the same one because the Test Store is platform-independent. Real keys
 * are `appl_` (Apple) and `goog_` (Google).
 *
 * Purchases made against a Test Store key are simulated: they never reach the
 * App Store or Play, they renew every few minutes and expire after five
 * renewals, and RevenueCat's own documentation says never to submit an app
 * configured with one. Nothing else in this file would have stopped it — a
 * `test_` key is a non-empty string, so every existing check passes and a
 * release could ship billing that takes no money.
 */
const TEST_STORE_KEY_PREFIX = "test_";

export const usesTestStoreBilling = [publicEnv.revenueCatIosKey, publicEnv.revenueCatAndroidKey]
  .filter((value): value is string => Boolean(value))
  .some((value) => value.startsWith(TEST_STORE_KEY_PREFIX));

/**
 * Production builds must not start in an unconfigured state.
 *
 * When configuration is missing the app previously fell back to an ungated
 * `AppStack` with mock data — a release build shipped without these variables
 * would have rendered every authenticated screen to anybody. In development the
 * fallback is still useful, so it only throws for release builds.
 */
if (!__DEV__) {
  const missing = [...missingRequiredEnv, ...missingReleaseEnv];
  if (missing.length > 0) {
    throw new Error(
      `BodyCal is missing required public configuration: ${missing.join(", ")}. ` +
        "Set these in the EAS build profile before releasing.",
    );
  }
  if (usesTestStoreBilling) {
    throw new Error(
      "BodyCal is configured with a RevenueCat Test Store key (test_…). Test Store purchases " +
        "are simulated and must never ship. Set the platform keys (appl_… / goog_…) in the EAS " +
        "build profile before releasing.",
    );
  }
}

export const hasBackendConfiguration = missingRequiredEnv.length === 0;

/** Published legal documents, or null while they are still an open blocker. */
export const legalUrls = {
  privacy: publicEnv.privacyUrl || null,
  terms: publicEnv.termsUrl || null,
} as const;
