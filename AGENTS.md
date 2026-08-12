# BodyCal Agent Instructions

These instructions apply to the entire repository. Read this file and `PLAN.md` before making changes.

## Product context

BodyCal is an adult-only iOS and Android wellness application for calorie targets, food logging, AI meal estimates, weight progress, reminders, and subscriptions. It is not a medical product. Never present calculated or AI-generated nutrition as diagnosis, treatment, or measured fact.

The production roadmap and acceptance criteria live in `PLAN.md`. Keep its status markers accurate when substantial work is completed, but do not mark a feature complete merely because a route or placeholder exists.

## Source-of-truth order

1. The user's current request.
2. This `AGENTS.md`.
3. `PLAN.md` product and acceptance requirements.
4. Versioned official documentation and installed package types.
5. Existing repository conventions.

If requirements conflict, surface the conflict instead of silently changing product behavior.

## Mandatory documentation checks

- Expo has changed. Before writing or changing Expo, React Native, Expo Router, notification, camera, image, native configuration, or EAS code, read the exact SDK 57 documentation at `https://docs.expo.dev/versions/v57.0.0/` and the relevant versioned page.
- Before changing any file under `convex/`, read `convex/_generated/ai/guidelines.md` completely. Those generated Convex rules override remembered patterns.
- Prefer installed package types and version-current primary documentation over memory.
- Do not upgrade Expo, React Native, NativeWind, Clerk, Convex, RevenueCat, or other core packages unless the user explicitly requests an upgrade or the current task requires it.

## Working-tree safety

- The repository may contain user changes. Inspect `git status` and relevant diffs before editing.
- Preserve unrelated modifications and deletions. Never restore starter files merely because Git reports them deleted.
- Never use `git reset --hard`, destructive checkout commands, or broad recursive deletion.
- Use `apply_patch` for manual file edits.
- Do not edit or commit `.env`; use `.env.example` for documented variable names only.
- Do not run deployment, submission, purchase, or other external write operations without explicit user authorization.

## Architecture boundaries

- `src/app` contains route entry files and route layouts only. Put screen implementation in `src/screens` and feature logic in `src/features`.
- Put reusable visual primitives in `src/components`, providers in `src/providers`, pure domain logic in `src/domain`, helpers in `src/lib`, configuration in `src/config`, translations in `src/locales`, and shared types in `src/types`.
- Backend schema and server functions belong in `convex/`.
- Prefer small feature-specific modules over large multi-purpose files.
- Keep UI/database code independent of a specific AI model; model selection comes from server environment configuration.

## Design gate

- Inspect `design/` before visual implementation.
- Do not invent design filenames, product colors, typography, spacing, radii, icons, charts, imagery, or brand assets.
- When design assets exist, create/update `design/MAPPING.md` using real filenames and `design/TOKENS.md` using observed values only.
- Until assets are supplied, use restrained semantic native-friendly foundation styles and state clearly that visual acceptance is blocked.
- Preserve native safe areas, platform behavior, accessibility, dynamic type, and reduced motion even when adapting supplied designs.

## Expo and UI rules

- V1 targets native iOS and Android. Do not spend product effort on web unless requested.
- Use Expo Router file-based routes and native stacks/form sheets/modals where appropriate.
- Native social auth, RevenueCat, and Android remote notifications require development builds; do not claim Expo Go validates them.
- Use NativeWind 5 with `react-native-css` through the wrappers in `src/tw`; do not mix in a second styling system without a demonstrated need.
- Interactive targets must be at least 44×44 points.
- Provide accessibility labels, roles, states, and live announcements for validation errors.
- Support font scaling, wrapping, screen readers, contrast, and reduced motion.
- Every data-driven screen needs loading, empty, success, offline/stale, error, and retry behavior before production acceptance.

## Localization and units

- No new user-facing string should be hard-coded inside a component. Add it to the i18next resources and use `useTranslation`.
- Launch languages are English, Spanish, German, French, Brazilian Portuguese, Italian, Japanese, and Korean.
- Use `Intl` for dates, numbers, times, and pluralization.
- Store weight in kilograms and height in centimeters; convert only at input/output boundaries.
- Store day records with both UTC timestamps and local `YYYY-MM-DD` plus an IANA timezone.
- Test long German/French copy and Japanese/Korean rendering.

## Convex backend rules

- Use generated Convex APIs and generated types. Do not introduce new `anyApi`, `any`, generic builders, or hand-written function references unless generated types genuinely cannot express the case and the reason is documented.
- Public functions derive identity from `ctx.auth`. Never accept a user ID from the client as authorization.
- Use a shared `requireCurrentUser()` helper and user-scoped indexes.
- Check document ownership before every update/delete and before returning private data.
- Validate all function arguments and external payloads. Bound array sizes, string lengths, numeric ranges, query limits, uploads, and action timeouts.
- Queries and mutations remain deterministic. Put network calls and Node-only libraries in actions with `"use node"` when required.
- Use internal functions for webhook application, schedules, cleanup, and privileged workflows.
- Retriable writes require client idempotency keys and a unique indexed lookup.
- Avoid `.filter()` where an index can express the query. Add deliberate indexes for expected access patterns.
- Do not deploy Convex as a validation step. Typecheck and test locally first.
- Before any deployment-affecting Convex command, identify the target deployment and obtain explicit consent for production.

## Authentication and authorization

- Clerk `subject` is the canonical external identity.
- Store Clerk tokens through the Expo SecureStore cache.
- Revalidate the onboarding draft on the server after authentication.
- Reauthentication is required for destructive account operations.
- Account switching must clear user-scoped local caches/outbox/notifications and transition RevenueCat to the new Clerk ID.
- Account deletion must remain idempotent and remove user data, images, devices, exports, and Clerk identity safely.

## Nutrition calculation rules

- Support ages 18–80 only.
- Use Mifflin–St Jeor and the activity/goal/safety constraints documented in `PLAN.md`.
- Keep calculation functions pure and thoroughly unit tested.
- Never rewrite historical targets. Profile/goal changes create a new effective-dated nutrition goal.
- Label targets as estimates and preserve the formula version/input snapshot.
- Do not change formulas, safety floors, or caps without explicit product approval and updated tests.

## AI rules

- AI calls happen server-side only through the provider boundary.
- The client compresses images to a maximum 1,600-pixel long edge, approximately 0.75 JPEG quality, and no more than 4 MB.
- The server independently verifies authentication, current RevenueCat entitlement, quota, MIME/size constraints, and idempotency before provider invocation.
- Require strict structured output and validate it before persistence.
- Reject negative, non-finite, and implausible nutrition values.
- Results remain editable and visibly labeled as estimates.
- Manual logging must remain available during provider, entitlement, quota, or network failures.
- Retain abandoned/failed images for at most 24 hours and images attached to logs for 30 days.
- Never send meal images or sensitive nutrition content to analytics or crash reporting.

## Subscription rules

- RevenueCat is authoritative for the `pro` entitlement. Convex stores a server-gating mirror, never an independent purchase truth.
- Use the Clerk user ID as RevenueCat App User ID.
- Fetch offering/packages and localized price metadata from RevenueCat/store APIs.
- Never hard-code currency or claim trial eligibility from configuration alone.
- Show “no charge today” only when the selected store product is confirmed eligible for a zero-price trial.
- Cancellation retains access until entitlement expiration. Expiration locks premium features but never deletes history.
- AI actions require fresh server verification when the mirror is stale or missing.
- Restore purchases must remain visible and an empty restore is informative, not an error.

## Notifications

- Explain benefits before requesting OS permission.
- Do not request notification permission automatically at app startup.
- Handle Android channels, token rotation, invalid receipts, revoked permission, timezone/locale changes, sign-out cleanup, quiet hours, and duplicate prevention.
- Treat delivery as best-effort; never guarantee that the operating system will deliver a reminder.
- Notification payloads contain routes/opaque identifiers, not nutrition or identity details.

## Privacy and observability

- Only `EXPO_PUBLIC_*` values may enter the client bundle. All secrets remain in Convex/EAS server environments.
- Do not log or capture emails, tokens, photos, notes, meal names, weights, calorie values, or macro values.
- Sentry must keep default PII disabled and scrub requests.
- Analytics is opt-in, uses opaque identity, disables touch autocapture, and records categorical metadata only.
- Provide export, deletion, retention disclosure, notification controls, privacy policy, terms, and support access before release.

## Testing and verification

Run checks proportional to the change. The standard local gate is:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

For native/configuration/dependency changes, also run:

```powershell
npx.cmd expo-doctor
npx.cmd expo export --platform android --output-dir .expo\build-check
```

- Add unit tests for domain rules and regressions.
- Add Convex tests for success, unauthenticated access, wrong-user access, idempotency, limits, and failure paths.
- Use development builds and physical devices for social auth, purchases, camera, and remote notifications.
- Never report a check as passing unless it was run successfully in the current worktree.
- Do not use `npm audit fix --force`; review advisories against Expo SDK compatibility.

## Definition of done

A change is done only when:

- The requested behavior is implemented without unrelated changes.
- Authorization, privacy, offline, and failure behavior are addressed.
- Relevant translation and accessibility requirements are satisfied.
- Lint, strict TypeScript, and relevant tests pass.
- Native configuration is validated when affected.
- `PLAN.md` is updated when milestone status materially changes.
- Remaining external blockers or unverified device/store behavior are stated clearly.
