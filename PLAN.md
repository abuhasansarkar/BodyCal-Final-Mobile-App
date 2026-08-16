# BodyCal Production Plan

Last updated: 2026-08-13

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
- [x] Single light appearance with all palette values in `src/global.css` and `src/config/theme.ts`.
- [!] Dark appearance is deliberately not shipped: `design/TOKENS.md` documents no dark palette. `app.json` pins `userInterfaceStyle: "light"`; flip `SUPPORTS_DARK_APPEARANCE` once dark references are supplied.
- [x] Route-only `src/app` structure.
- [x] Development, preview, and production EAS profiles.
- [x] Public/server environment contract in `.env.example`, covering every variable the code actually reads.
- [x] ESLint, strict TypeScript, Jest, Expo Doctor, and Android Metro export verification all pass.
- [x] Release builds throw on missing required public configuration; the unauthenticated setup fallback is development-only.

### Testing

- [x] Domain unit tests for the calculator, unit conversions, and safety caps.
- [x] Convex tests for authenticated access, unauthenticated rejection, wrong-user rejection, idempotency, query limits, validation bounds, deletion, export, and subscription webhook ordering (48 tests).
- [x] Offline outbox tests for deduplication, attempt caps, expiry, and account-switch clearing.
- [x] Translation key-parity test across all eight languages.
- [ ] Device tests for social auth, purchases, camera, and remote notifications.

### Navigation and screens

- [x] Public, authentication, onboarding, application, modal, form-sheet, scan, food, weight, and settings routes exist.
- [x] Authenticated bootstrap waits for Clerk and Convex before selecting a protected route.
- [x] Core screens have functional semantic UI.
- [ ] Final visual implementation and design mapping.
- [x] Loading, empty, offline, failure, and retry states on every data-driven screen, through the shared components in `src/components/ui/states.tsx`.
- [~] Screens are rebuilt on the documented design system; physical-device visual acceptance still pending.

### Domain and persistence

- [x] Mifflin–St Jeor BMR and activity calculations.
- [x] Loss/gain adjustment caps and calorie safety boundaries.
- [x] Macro calculation and unit conversion helpers.
- [x] Validated persisted onboarding draft in AsyncStorage (it exceeds SecureStore's Android size ceiling and holds no credentials).
- [x] Convex schema for users, profiles, goals, catalog, food logs, weights, AI scans, favorites, settings, devices, subscriptions, exports, and deletion jobs.
- [x] Shared identity and ownership helpers.
- [x] Idempotent food and weight mutations, resolved through the `by_user_request` index rather than a per-user scan.
- [x] AsyncStorage offline outbox and reconnect synchronization.
- [x] Every Convex module uses the generated `./_generated/server` builders and the generated `api`/`internal` references. No `mutationGeneric`, `makeFunctionReference`, or `anyApi` remains.
- [x] Single shared nutrition calculator in `convex/lib/nutrition.ts`, imported by both the backend and the client.
- [x] Server-side validation library (`convex/lib/validation.ts`) bounds every numeric range, date, string length, and locale.
- [x] Per-identity rate limits on plan generation, entitlement verification, AI scans, and exports.

### Authentication and account lifecycle

- [x] Custom email/password sign-in and sign-up.
- [x] Email verification and password recovery.
- [~] Native Apple/Google flow code and config plugins exist; provider consoles and physical-device tests remain.
- [x] Clerk ID is reused as RevenueCat App User ID.
- [x] Resumable, idempotent deletion job: all user data is cleared first and the Clerk identity last, so a failure never locks the user out.
- [x] Export runs through the server `exportJobs` pipeline and returns an expiring download URL.
- [x] Deletion status, retry, and cancel UX; a failed job reactivates the account.
- [ ] Cross-device deletion completion notification.

### Tracking

- [x] Convex-backed Today totals and meal sections.
- [x] Manual food entry and weight entry.
- [x] Offline queue for manual food and weight records.
- [x] Free vs Pro history windows are enforced by Convex for food, weight, and progress queries; client range controls cannot bypass entitlement checks.
- [x] Progress summary, weight chart with functional range selection, streak tracking, and goal progress analytics.
- [x] Full food-log editing/deletion UI.
- [x] Full weight history editing/deletion UI.
- [x] Serving/quantity editor and meal selector on all logging paths.

### AI scanning

- [x] Camera/gallery selection and permission handling.
- [x] Client image resize/compression that steps quality down until it fits the 4 MB limit.
- [x] Direct Convex storage upload with one-shot byte-preserving POST, client JPEG signature/size checks, timeout handling, and independent server signature/size verification.
- [x] Server-only OpenAI provider call with structured Zod output, sent as an inline image with `store: false`.
- [x] Analysis runs on the scheduler, not inside the client's request: the scan is durable before any provider call, and the client follows `aiDb.getScan` reactively through `pending → processing → completed`.
- [x] Reopening or resuming a scan rejoins it by id instead of starting a second one.
- [x] Per-food breakdown (preparation, estimated grams, per-item calories and macros), meal totals, calorie range, assumptions, and portion confidence.
- [x] Server-side plausibility checks: calorie and macro totals must agree with the sum of items, estimated weights must be positive or unknown, and an implausible result fails rather than being rewritten to zeroes.
- [x] `isFood: false` is reported as "no food detected" instead of a fabricated empty meal.
- [x] Bounded provider retries with backoff, reusing the same scan id so a retry never creates a second scan or a duplicate meal entry.
- [x] Server-side RevenueCat verification when the entitlement mirror is stale or missing, rather than on every request.
- [x] Upload ownership is recorded and verified before a blob is analysed or attached.
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
- [x] Webhook replay protection, out-of-order-event guard, and replay of events that arrive before the Convex user exists.
- [~] Fixture tests cover purchase, renewal, cancellation, billing issue, expiration, trial, replay, and stale ordering; transfer and refund semantics still need store-side validation.
- [x] Offline entitlement is reported as `offlineUnknown` and premium stays unlocked from the last known status.
- [x] Cached-entitlement hard expiry policy while offline for an extended period.
- [!] Product creation, pricing, trials, entitlement, offering, transfer policy, and sandbox lifecycle tests require store and RevenueCat accounts.

### Notifications

- [x] Education screen before OS permission request.
- [x] Android channels, response listener, and deep-link routing.
- [x] Daily local reminders and trial-reminder scheduling helpers.
- [x] Sign-out and account-switch cleanup of the outbox, scheduled reminders, and RevenueCat identity.
- [x] Convex preferences and push-device records exist.
- [x] Expo push token registration, rotation, and permission reconciliation, deduplicated per installation and per token.
- [ ] Invalid-receipt processing (requires a server sender).
- [x] Local reminder scheduling with stable identifiers, quiet hours, and cancellation on disable.
- [x] Reminder preferences persist to Convex.
- [ ] Server-side reminder sender and multi-device delivery policy.
- [ ] Timezone/locale change rescheduling.
- [!] Remote push testing requires Expo credentials and physical Android/iOS devices.

### Localization, accessibility, and privacy

- [x] i18next initialization for English, Spanish, German, French, Brazilian Portuguese, Italian, Japanese, and Korean.
- [x] Welcome/tab baseline translations exist.
- [x] Every user-facing string lives in the translation resources; no screen hard-codes copy.
- [x] All eight launch languages are complete, with key parity enforced by `ScreenTranslations` at compile time and by `src/locales/parity.test.ts` at test time.
- [ ] Native-speaker review of the newly added copy.
- [x] Complete metric/imperial input and display controls across all screens.
- [x] Shared controls use semantic roles and minimum target sizing.
- [ ] Full screen-reader, dynamic type, contrast, reduced-motion, and non-color state audit.
- [x] Sentry disables default PII, strips request payloads, and drops console/network breadcrumbs.
- [x] Analytics is consent-gated behind an explicit Settings toggle, autocapture is disabled, and consent is mirrored to `userSettings`.
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
- [x] Add font loading and splash-screen hold/release behavior.
- [x] Add a user-visible fatal configuration/error boundary.
- [x] Make production builds reject missing required public variables.
- [x] Add CI for install, lint, typecheck, tests, Expo Doctor, secret scanning, and dependency review.
- Exit: clean install and CI checks pass on Windows/macOS runners.

### Phase 2 — Calculation and onboarding acceptance

- [x] Calculation engine and primary tests.
- [x] Onboarding persistence and server migration.
- [x] Add boundary/table tests for every activity, goal, pace, cap, minimum, and maximum.
- [~] Replace approximate year-only birthday persistence with an explicitly approved age/date model.
- [x] Add manual-target review when carbohydrates cannot remain at least 100 g.
- [x] Add effective-dated recalculation UX after goal/profile changes.
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
- [x] Add Zod/Convex validators for all external webhook and action payload boundaries.
- [x] Add `convex-test` coverage for happy paths, anonymous callers, wrong-user access, idempotency, and history limits.
- [ ] Run Convex reviewer and authorization audits before release.
- [ ] Add backup schedule and documented restore drill.
- Exit: zero known cross-user access paths and backend verification suite passes.

### Phase 5 — Food tracking and discovery

- [x] Manual logging and daily totals.
- [x] Custom-food create, list, delete, and edit are implemented and reachable from Food search and manual entry.
- [x] Implement search across curated, custom, recent, and favorites.
- [x] Favorites mutations plus UI: a favourite toggle on catalog rows and a Favourites section in Food search.
- [x] Add editable portions, meal selection, dates, and quantities.
- [ ] Build reviewed food-catalog import/seed pipeline with localized content.
- [ ] Add food images and attribution/rights records where required.
- Exit: manual/catalog tracking works online, offline, and after retries without duplicate records.

### Phase 6 — AI estimation

- [x] Functional server-provider path and editable result.
- [x] Add full entitlement/quota/failure UX.
- [x] Validate actual MIME signature in addition to storage metadata.
- [x] Add no-food and implausible-combination policy fixtures.
- [x] Add correction persistence and attached-log linkage tests.
- [ ] Add cost controls, alerts, and provider kill switch.
- Exit: camera, gallery, timeout, retry, quota, no-food, low-confidence, manual fallback, and retention cases pass.

### Phase 7 — Progress

- [x] Weight persistence and basic summary.
- [x] Build accessible weight chart.
- [x] Add Week, Month, 3 Months, and All ranges with entitlement rules.
- [x] Implement start/current/goal completion, streak, and calorie-consistency calculations.
- [x] Add timezone-boundary and sparse-data tests.
- Exit: 30-day free view and complete Pro analytics match backend fixtures.

### Phase 8 — Commerce

- [x] Client and server integration baseline.
- [ ] Verify all webhook event mappings against signed fixtures.
- [x] Add cached active-entitlement behavior for offline launch.
- [~] Cancellation, billing issue, expiration, trial, replay, and stale-ordering fixtures exist; refund, transfer, resubscription, and store-side validation remain.
- [ ] Add purchase-cancelled, pending, interrupted, unavailable, and restore-empty user states.
- [!] Configure App Store and Play products and RevenueCat dashboard.
- Exit: physical-device sandbox matrix passes for both stores.

### Phase 9 — Notifications

- [x] Local baseline.
- [x] Implement installation identity and account-bound Expo token registration.
- [~] Implement token refresh; invalid receipt cleanup still requires the server sender.
- [ ] Add server-driven reminder selection, quiet hours, and deduplication.
- [ ] Reconcile schedules after timezone, locale, preference, and subscription changes.
- [ ] Add trial reminder server fallback.
- Exit: permission-granted, denied, revoked, timezone-change, multi-device, and sign-out cases pass.

### Phase 10 — Settings, privacy, and operations

- [x] Complete all settings routes rather than placeholder feature screens.
- [x] Implement language, units, appearance, nutrition target, and notification controls.
- [x] Complete export download/share workflow.
- [x] Account deletion backend, status/retry UX, resumable cleanup tests, and identity-linked event/rate-limit cleanup.
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
AI_API_KEY          # or OPENAI_API_KEY; exactly one must be set
AI_MODEL
EXPO_ACCESS_TOKEN
SENTRY_AUTH_TOKEN
```

The AI variables must be set on the **Convex deployment** (`npx convex env set AI_API_KEY …`). Deployed actions do not read a local `.env` file, so a key that only lives there produces the same failure as no key at all. `aiDb.getProviderStatus` reports whether the running deployment can see one.

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
