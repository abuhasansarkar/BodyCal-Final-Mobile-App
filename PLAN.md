# BodyCal Production Plan

Last updated: 2026-08-11

## 1. Purpose

BodyCal is an adult-only nutrition and calorie-tracking application for native iOS and Android. V1 helps users calculate a safe estimated calorie target, log food manually or from a curated catalog, estimate a photographed meal with AI, track weight and progress, receive reminders, and unlock premium capabilities through a subscription.

This file is the execution roadmap and acceptance checklist. It records both the intended product and the work still required. A route or backend function existing does not make a feature production-ready; production acceptance also requires integrations, error states, accessibility, localization, security tests, and physical-device validation.

### Status legend

- `[x]` Implemented and locally verified.
- `[~]` Baseline exists but production work or external validation remains.
- `[ ]` Not implemented or not accepted.
- `[!]` Blocked by an external asset, credential, account, policy decision, or store operation.

## 2. Product scope

### V1 audience and positioning

- Adults ages 18–80 only.
- Wellness guidance, not medical diagnosis or treatment.
- AI nutrition results are editable estimates, never measurements.
- Native iOS and Android are launch platforms; web is not a V1 release target.

### V1 capabilities

- Personalized calorie and macro calculation.
- Clerk authentication with email/password, verification, password recovery, Apple, and Google.
- Manual, curated, favorite, recent, and AI-assisted food logging.
- Daily calorie and macro summaries grouped by meal.
- Weight history and progress summaries.
- Local and push notification preferences.
- Free and Pro access levels.
- RevenueCat subscription lifecycle and restore.
- Eight launch languages and metric/imperial units.
- Privacy-conscious analytics, crash reporting, export, and account deletion.

### V1 non-goals

- Barcode scanning and external food databases.
- Meal plans, recipe marketplace, grocery or restaurant integrations.
- Exercise tracking, HealthKit, Health Connect, wearables.
- Social features, AI chat/coaching, or advanced gamification.

## 3. Technical architecture

### Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript 6.
- Expo Router with route groups and protected native stacks.
- NativeWind 5 preview with Tailwind CSS 4 and `react-native-css`.
- Clerk for authentication and account identity.
- Convex for database, reactive queries, mutations, actions, storage, HTTP webhooks, schedules, and cron jobs.
- RevenueCat for subscription products and authoritative `pro` entitlement state.
- OpenAI Responses API behind a server-side provider boundary for image analysis.
- Expo Notifications for local schedules and Expo push integration.
- i18next/react-i18next and Expo Localization.
- Sentry and consent-gated PostHog analytics.
- Jest, React Native Testing Library, Convex testing utilities, and Maestro.

### Source layout

```text
src/app/          Expo Router route files only
src/screens/      Screen composition
src/features/     Domain feature state and services
src/components/   Shared application UI
src/providers/    Root providers and lifecycle integration
src/domain/       Pure calculations and validation
src/lib/          Cross-feature helpers and clients
src/config/       Validated configuration
src/locales/      Translation resources and i18n setup
src/types/        Shared client/domain types
convex/           Schema and backend functions
design/           Supplied design sources and audit artifacts
```

### Provider order

1. Sentry initialization and root error boundary.
2. Localization.
3. Consent-aware analytics.
4. Notification response/deep-link handling.
5. Clerk with SecureStore token cache.
6. Authenticated Convex client.
7. RevenueCat subscription provider.
8. Offline outbox synchronization.
9. Expo Router stack.

## 4. Current implementation baseline

### Foundation

- [x] Expo SDK 57 dependency alignment.
- [x] NativeWind 5/`react-native-css` Metro and CSS foundation.
- [x] Semantic light/dark platform colors and CSS primitive wrappers.
- [x] Route-only `src/app` structure.
- [x] Development, preview, and production EAS profiles.
- [x] Public/server environment contract in `.env.example`.
- [x] ESLint, strict TypeScript, Jest, and Android Metro export verification.
- [~] Startup configuration validation provides a setup state; production build-time failure rules remain to be added.

### Navigation and screens

- [x] Public, authentication, onboarding, application, modal, form-sheet, scan, food, weight, and settings routes exist.
- [x] Authenticated bootstrap waits for Clerk and Convex before selecting a protected route.
- [x] Core screens have functional semantic UI.
- [ ] Final visual implementation and design mapping.
- [x] Complete loading, empty, stale, offline, failure, and retry states on every data-driven screen.

### Domain and persistence

- [x] Mifflin–St Jeor BMR and activity calculations.
- [x] Loss/gain adjustment caps and calorie safety boundaries.
- [x] Macro calculation and unit conversion helpers.
- [x] Secure persisted onboarding draft.
- [x] Convex schema for users, profiles, goals, catalog, food logs, weights, AI scans, favorites, settings, devices, subscriptions, exports, and deletion jobs.
- [x] Shared identity and ownership helpers.
- [x] Idempotent food and weight mutations.
- [x] AsyncStorage offline outbox and reconnect synchronization.
- [x] Convex-generated client API exists; remove the temporary untyped `anyApi` bridge from client code.

### Authentication and account lifecycle

- [x] Custom email/password sign-in and sign-up.
- [x] Email verification and password recovery.
- [~] Native Apple/Google flow code and config plugins exist; provider consoles and physical-device tests remain.
- [x] Clerk ID is reused as RevenueCat App User ID.
- [x] Backend export and reverified deletion job foundations.
- [x] Export status/download/share user experience.
- [ ] Cross-device deletion completion screen and retry/status UX.

### Tracking

- [x] Convex-backed Today totals and meal sections.
- [x] Manual food entry and weight entry.
- [x] Offline queue for manual food and weight records.
- [x] Free seven-day vs Pro extended food history query behavior.
- [x] Progress summary, weight chart with functional range selection, streak tracking, and goal progress analytics.
- [x] Full food-log editing/deletion UI.
- [x] Full weight history editing/deletion UI.
- [x] Serving/quantity editor and meal selector on all logging paths.

### AI scanning

- [x] Camera/gallery selection and permission handling.
- [x] Client image resize/compression and 4 MB limit.
- [x] Direct Convex storage upload.
- [x] Server-only OpenAI provider call with structured Zod output.
- [x] Fresh server-side RevenueCat verification before each AI request.
- [x] Daily/monthly quota enforcement and idempotent requests.
- [x] Editable estimate before saving.
- [x] 24-hour abandoned and 30-day attached image retention.
- [x] Explicit retry, retake, and manual-entry actions on every AI failure screen.
- [ ] Provider cost calculation, richer latency/cost buckets, and monitoring dashboards.
- [ ] Quality review workflow for user corrections.

### Subscriptions

- [x] `pro` state model including trial, active, cancelled-active, billing-issue-active, expired, loading, offline-unknown, and error.
- [x] RevenueCat initialization with Clerk identity.
- [x] Current offering/package discovery, purchase, restore, listeners, and foreground refresh.
- [x] Store-provided prices; no hard-coded paywall currency.
- [x] Trial language only when store metadata and eligibility agree.
- [x] Authenticated RevenueCat webhook endpoint and Convex subscription mirror.
- [~] Webhook coverage exists but all RevenueCat event variants and transfer/refund semantics need fixture tests.
- [ ] Offline cached-entitlement expiration behavior.
- [!] Product creation, pricing, trials, entitlement, offering, transfer policy, and sandbox lifecycle tests require store and RevenueCat accounts.

### Notifications

- [x] Education screen before OS permission request.
- [x] Android channels, response listener, and deep-link routing.
- [x] Daily local reminders and trial-reminder scheduling helpers.
- [x] Sign-out cleanup.
- [x] Convex preferences and push-device records exist.
- [ ] Expo push token registration, rotation, invalid receipt processing, and permission reconciliation.
- [ ] Server reminder scheduler, quiet hours, deduplication, and multi-device policy.
- [ ] Timezone/locale change rescheduling.
- [!] Remote push testing requires Expo credentials and physical Android/iOS devices.

### Localization, accessibility, and privacy

- [x] i18next initialization for English, Spanish, German, French, Brazilian Portuguese, Italian, Japanese, and Korean.
- [x] Welcome/tab baseline translations exist.
- [x] Move every user-facing string into translation resources across all screens.
- [x] Translate, review, and test all copy in all eight launch languages.
- [x] Complete metric/imperial input and display controls across all screens.
- [x] Shared controls use semantic roles and minimum target sizing.
- [ ] Full screen-reader, dynamic type, contrast, reduced-motion, and non-color state audit.
- [x] Sentry disables default PII and strips request payloads.
- [x] Analytics initialization is consent-gated and autocapture is disabled.
- [ ] Final analytics event taxonomy and sensitive-property denylist tests.
- [!] Privacy policy, terms, support URL, store privacy labels, and Data Safety declarations require approved legal content.

## 5. Design gate

The `design/` directory now contains original-resolution composite screen references and a written design system. Welcome, authentication, and onboarding screens 1–12 are mapped, and the onboarding visual baseline is implemented. Final visual acceptance remains incomplete until every remaining route and state is mapped and the onboarding flow is compared on physical iOS and Android devices for responsive layout, localization, accessibility, and reduced motion.

Required workflow:

1. Add all source files or screenshots at original resolution.
2. Inventory exact filenames.
3. Inspect every screen and state.
4. Extract colors, typography, spacing, radii, shadows, controls, icons, navigation, sheets, charts, camera, onboarding, and paywall patterns.
5. Create `design/MAPPING.md` mapping each route to actual design filenames.
6. Create `design/TOKENS.md` containing only observed tokens.
7. Record required native-platform, responsive, localization, accessibility, and reduced-motion deviations.
8. Implement shared components before applying final screen styling.
9. Capture iOS and Android comparison screenshots.
10. Obtain visual acceptance only after the mapping contains no invented filenames.

## 6. Detailed delivery phases

### Phase 0 — Repository and design intake

- [x] Preserve existing uncommitted work.
- [x] Remove obsolete starter routes/components without restoring deleted starter files.
- [x] Receive design assets.
- [!] Confirm production bundle/package identifiers are available.
- [!] Receive privacy, terms, and support URLs.
- Exit: design inventory and route mapping approved.

### Phase 1 — Foundation hardening

- [x] SDK, routing, styling, configuration, providers, and test harness.
- [ ] Add font loading and splash-screen hold/release behavior.
- [ ] Add a user-visible fatal configuration/error boundary.
- [ ] Make production builds reject missing required public variables.
- [ ] Add CI for install, lint, typecheck, tests, Expo Doctor, secret scanning, and dependency review.
- Exit: clean install and CI checks pass on Windows/macOS runners.

### Phase 2 — Calculation and onboarding acceptance

- [x] Calculation engine and primary tests.
- [x] Onboarding persistence and server migration.
- [ ] Add boundary/table tests for every activity, goal, pace, cap, minimum, and maximum.
- [ ] Replace approximate year-only birthday persistence with an explicitly approved age/date model.
- [ ] Add manual-target review when carbohydrates cannot remain at least 100 g.
- [ ] Add effective-dated recalculation UX after goal/profile changes.
- Exit: calculation fixtures approved by product and wellness/legal review.

### Phase 3 — Authentication and identity

- [x] Email account flows.
- [ ] Test Apple and Google on development builds.
- [~] Email-code client-trust/MFA continuation exists; add and test any other enabled factors.
- [ ] Add account-switch integration tests covering Convex cache and RevenueCat identity.
- [ ] Add destructive-action reauthentication tests.
- Exit: all auth flows pass new user, returning user, reinstall, second device, and account switch cases.

### Phase 4 — Convex core and authorization

- [x] Schema and function baseline.
- [x] Replace generic function builders and `anyApi` usage with generated typed APIs everywhere.
- [ ] Add Zod/Convex validators for all external webhook and action payload boundaries.
- [ ] Add `convex-test` coverage for happy paths, anonymous callers, wrong-user access, idempotency, and history limits.
- [ ] Run Convex reviewer and authorization audits before release.
- [ ] Add backup schedule and documented restore drill.
- Exit: zero known cross-user access paths and backend verification suite passes.

### Phase 5 — Food tracking and discovery

- [x] Manual logging and daily totals.
- [ ] Implement custom-food CRUD.
- [x] Implement search across curated, custom, recent, and favorites.
- [ ] Implement favorites UI and mutations.
- [x] Add editable portions, meal selection, dates, and quantities.
- [ ] Build reviewed food-catalog import/seed pipeline with localized content.
- [ ] Add food images and attribution/rights records where required.
- Exit: manual/catalog tracking works online, offline, and after retries without duplicate records.

### Phase 6 — AI estimation

- [x] Functional server-provider path and editable result.
- [x] Add full entitlement/quota/failure UX.
- [ ] Validate actual MIME signature in addition to storage metadata.
- [ ] Add no-food and implausible-combination policy fixtures.
- [ ] Add correction persistence and attached-log linkage tests.
- [ ] Add cost controls, alerts, and provider kill switch.
- Exit: camera, gallery, timeout, retry, quota, no-food, low-confidence, manual fallback, and retention cases pass.

### Phase 7 — Progress

- [x] Weight persistence and basic summary.
- [x] Build accessible weight chart.
- [x] Add Week, Month, 3 Months, and All ranges with entitlement rules.
- [x] Implement start/current/goal completion, streak, and calorie-consistency calculations.
- [ ] Add timezone-boundary and sparse-data tests.
- Exit: 30-day free view and complete Pro analytics match backend fixtures.

### Phase 8 — Commerce

- [x] Client and server integration baseline.
- [ ] Verify all webhook event mappings against signed fixtures.
- [ ] Add cached active-entitlement behavior for offline launch.
- [ ] Add cancellation, billing issue, refund, expiration, transfer, and resubscription tests.
- [ ] Add purchase-cancelled, pending, interrupted, unavailable, and restore-empty user states.
- [!] Configure App Store and Play products and RevenueCat dashboard.
- Exit: physical-device sandbox matrix passes for both stores.

### Phase 9 — Notifications

- [x] Local baseline.
- [ ] Implement installation identity and Expo token registration.
- [ ] Implement token refresh and invalid receipt cleanup.
- [ ] Add server-driven reminder selection, quiet hours, and deduplication.
- [ ] Reconcile schedules after timezone, locale, preference, and subscription changes.
- [ ] Add trial reminder server fallback.
- Exit: permission-granted, denied, revoked, timezone-change, multi-device, and sign-out cases pass.

### Phase 10 — Settings, privacy, and operations

- [x] Complete all settings routes rather than placeholder feature screens.
- [x] Implement language, units, appearance, nutrition target, and notification controls.
- [x] Complete export download/share workflow.
- [x] Account deletion backend exists; add status/retry UX and end-to-end evidence.
- [ ] Finalize Sentry source-map upload and environment tagging.
- [ ] Implement consent controls and analytics reset/deletion.
- [ ] Add operational dashboards and alert thresholds.
- Exit: privacy/export/deletion and observability runbooks are approved.

### Phase 11 — Release

- [ ] Replace starter icon, splash, and store assets.
- [ ] Configure EAS project ID, credentials, build numbers, and environment variables.
- [ ] Produce development builds and complete device smoke tests.
- [ ] Produce preview builds for stakeholder QA.
- [ ] Complete TestFlight and Play internal testing.
- [ ] Finish localized store metadata, screenshots, ratings, health declarations, privacy disclosures, and reviewer notes.
- [ ] Run phased rollout with crash/auth/AI/purchase/webhook/notification monitoring.
- Exit: production builds install, authenticate, purchase, restore, notify, export, and delete successfully.

## 7. Data and security requirements

- Clerk `subject` is the only external user identity authority.
- Public Convex functions derive the user from `ctx.auth`; they never trust a client-supplied user ID.
- Every document read/update/delete checks ownership or uses a user-scoped index.
- All mutations validate finite numeric ranges, enum values, lengths, and IDs.
- Retriable writes use a unique client request ID.
- RevenueCat is authoritative; client subscription state never authorizes server AI work.
- Webhooks require a secret and idempotent event handling.
- AI, Clerk, RevenueCat, notification, and Sentry secrets remain server-only.
- Analytics and crash payloads exclude photos, emails, free text, weights, meal names, calories, nutrition values, and tokens.
- Account deletion removes stored images, user tables, devices, exports, and Clerk identity through a retry-safe workflow.
- Historical food logs retain immutable nutrition snapshots.
- Day-based records store UTC timestamps, local `YYYY-MM-DD`, and the IANA timezone used at creation.

## 8. Testing matrix

### Unit

- BMR/TDEE and every goal/pace/cap combination.
- Macro allocation, carbohydrate floor, and rounding tolerance.
- Metric/imperial conversions.
- Nutrition aggregation and local-day assignment.
- Subscription state derivation and cached expiration.
- AI schema and implausible-value rejection.
- Quota windows and retention deadlines.
- Notification schedule calculations.

### Backend integration

- Clerk-to-Convex sync.
- Anonymous and cross-user rejection.
- Onboarding migration.
- Food/weight idempotency.
- Free/Pro history constraints.
- AI entitlement, quota, upload, correction, log, and retention sequence.
- RevenueCat webhook idempotency and lifecycle transitions.
- Export and deletion retry behavior.
- Device registration and cleanup.

### Device and end-to-end

- Email, Apple, and Google authentication.
- New/returning users, reinstall, second device, account switching.
- Purchase, trial eligibility, pending/cancelled purchase, renewal, cancellation, billing issue, expiration, refund, restore, and empty restore.
- Camera/gallery permissions, revocation, no-food, timeout, quota, and manual fallback.
- Offline writes and reconnect synchronization.
- All eight languages, both unit systems, timezone changes, large text, screen reader, contrast, and reduced motion.
- Export and deletion across multiple devices.

## 9. Required verification commands

Run after relevant changes:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npx.cmd expo-doctor
npx.cmd expo export --platform android --output-dir .expo\build-check
```

For Convex changes, also regenerate/check types and run the backend test suite once it is installed. Never deploy merely to validate local code.

## 10. Environment and external accounts

### Client-public variables

```text
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_CONVEX_URL
EXPO_PUBLIC_REVENUECAT_IOS_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
EXPO_PUBLIC_SENTRY_DSN
EXPO_PUBLIC_ANALYTICS_KEY
EXPO_PUBLIC_ANALYTICS_HOST
```

### Server-only Convex variables

```text
CLERK_ISSUER_URL
CLERK_SECRET_KEY
REVENUECAT_SECRET_KEY
REVENUECAT_WEBHOOK_SECRET
AI_PROVIDER
AI_API_KEY
AI_MODEL
EXPO_ACCESS_TOKEN
SENTRY_AUTH_TOKEN
```

Never commit `.env` or real keys. Development, preview, and production must have separate deployments, keys, analytics projects, and Sentry environments.

## 11. Release acceptance criteria

- Zero known cross-user data access.
- Every premium entry point has appropriate client UX; every premium server action enforces entitlement independently.
- Cancellation preserves access until actual expiration.
- Expiration does not delete historical data.
- AI results are editable and consistently labeled as estimates.
- Manual logging works through AI/provider/network failures.
- No sensitive nutrition or identity content reaches analytics/crash payloads.
- Eight languages and both unit systems pass device QA.
- Store lifecycle tests pass on physical iOS and Android devices.
- Design mapping references real files.
- Legal and store privacy requirements are complete.
- Production builds authenticate, purchase, restore, notify, export, and delete accounts successfully.

## 12. Post-V1 roadmap

- V1.1: saved meals, improved recent-food reuse, weekly summaries, stronger favorites and streaks.
- V1.5: external food search, barcode lookup, improved recognition, multi-photo analysis, smarter target adjustments.
- V2: HealthKit, Health Connect, wearables, recipes, optional meal planning, deeper analytics, and opt-in AI coaching.
