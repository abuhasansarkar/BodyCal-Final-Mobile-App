# BodyCal

BodyCal is an Expo SDK 57 nutrition-tracking application for iOS and Android. The repository contains the native route shell, calculation engine, authentication flows, Convex backend, manual and AI-assisted logging, weight tracking, RevenueCat paywall state, notifications, offline retries, localization bootstrap, observability, and account lifecycle jobs.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and provide the public client values.
3. Link or create a Convex deployment, configure the server-only variables from `.env.example`, and run `npx convex dev`.
4. Configure Clerk JWT integration for Convex, Apple/Google credentials, and the app scheme.
5. Configure the RevenueCat `default` offering, `pro` entitlement, and monthly/annual products.
6. Start a development build with `npm run start:dev-client`.

Expo Go is not sufficient for native social authentication, RevenueCat, or Android remote notifications. Use EAS development builds on physical devices for those flows.

## Verification

```text
npm run lint
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform android --output-dir .expo/build-check
```

## Backend contracts

- Convex trusts the Clerk `subject`; public functions never accept another user's ID as authority.
- RevenueCat is authoritative for `pro`. The app uses Clerk IDs as RevenueCat customer IDs, and every AI request performs fresh server-side verification.
- AI model selection lives in `AI_MODEL`; UI and persisted domain code do not depend on a model name.
- Food and weight writes use client idempotency keys. Offline manual writes use an AsyncStorage outbox.
- Scan images expire after 24 hours unless attached to a log, when retention becomes 30 days.
- Account export jobs expire after seven days. Deletion is a reverified, idempotent server workflow.

## External completion gates

- Add real screenshots/source assets to `design/` before visual acceptance. No product-specific visual tokens were invented.
- Replace starter icon and splash assets after the design audit.
- Supply Clerk, Convex, RevenueCat, OpenAI, Sentry, analytics, Expo push, and EAS credentials.
- Supply final support, privacy, and terms URLs and approved localized legal copy.
- Import reviewed localized food-catalog content.
- Run the purchase lifecycle matrix, push-notification tests, accessibility/localization QA, and deletion checks on physical iOS and Android devices.
- Complete App Store Connect and Play Console metadata, privacy declarations, and reviewer access.

The current screen copy is an implementation baseline. Full eight-language copy coverage remains part of the design/content pass because the supplied `design/` directory has no assets or approved strings.
