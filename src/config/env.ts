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
});

export const publicEnv = publicEnvSchema.parse({
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY,
  analyticsHost: process.env.EXPO_PUBLIC_ANALYTICS_HOST,
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
 * Production builds must not start in an unconfigured state.
 *
 * When configuration is missing the app previously fell back to an ungated
 * `AppStack` with mock data — a release build shipped without these variables
 * would have rendered every authenticated screen to anybody. In development the
 * fallback is still useful, so it only throws for release builds.
 */
if (!__DEV__ && missingRequiredEnv.length > 0) {
  throw new Error(
    `BodyCal is missing required public configuration: ${missingRequiredEnv.join(", ")}. ` +
      "Set these in the EAS build profile before releasing.",
  );
}

export const hasBackendConfiguration = missingRequiredEnv.length === 0;
