import { z } from "zod";

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

export const hasBackendConfiguration = Boolean(publicEnv.clerkPublishableKey && publicEnv.convexUrl);
