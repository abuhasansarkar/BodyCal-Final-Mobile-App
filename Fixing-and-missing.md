# Reported issues

## 1. App opens on the onboarding goal screen instead of Welcome — FIXED

Startup now resolves through `resolveStartupDestination`, which sends a user with
`onboardingCompleted: false` to `/(public)/welcome`. Covered by
`src/features/onboarding/startup-destination.test.ts`.

## 2. Production readiness audit — ALL CODE FINDINGS FIXED

A full review of the client and the Convex backend produced 17 findings. Every
one that is code has been fixed and covered by tests where it was testable;
`convex/tests/auditRegressions.test.ts` holds the regressions.

Two were product decisions, taken explicitly:

- Remote push removed. V1 reminders are local only — see the note in `PLAN.md`.
- Free history is 7 days on every surface, from `FREE_HISTORY_DAYS`.

Two findings were **not** defects on closer reading and no change was made:

- Account deletion did already call Clerk's `useReverification`. The real problem
  was narrower: that hook only reacts to a Clerk API error, and the wrapped
  function calls Convex, so it could never fire. Replaced with a real
  first-factor check in `src/features/auth/reauthentication.ts`.
- Sentry source-map variables were already documented in `.env.example`. Only
  the EAS secret values are outstanding.

### Still open — external, cannot be closed from this repository

- `eas init` for `extra.eas.projectId` and `owner`.
- Publishing the Terms and Privacy documents, then setting `EXPO_PUBLIC_TERMS_URL`
  and `EXPO_PUBLIC_PRIVACY_URL`. Release builds now refuse to start without them.
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` on the EAS build profile.
- RevenueCat production products, entitlement, and webhook secret.
- Store listings, Data Safety form, and privacy nutrition labels.
- Device QA for social auth, purchases, camera, and reminder delivery.

## 3. Full-app review, 19 Aug 2026 — security and correctness fixed

Thirteen findings from a read of the client and the Convex backend. The three
security/correctness ones are fixed and covered by regressions; the rest are
recorded and still open.

### Fixed

- **Unvalidated public write.** `aiDb.recordCorrection` took `v.any()` and patched
  it straight onto the scan, with no shape, no length bounds and no status check.
  It also takes read precedence (`correctedEstimate ?? estimate`), so a malformed
  correction made a completed scan render as "no estimate" on both the scan
  result and the saved-entry detail screen. It now takes `storedEstimateValidator`,
  re-narrows through `readStoredEstimate`, requires a completed scan, and refuses
  a correction with no usable nutrition.
- **Entitlement fallback.** Both the RevenueCat REST verification and the client's
  `deriveSubscriptionState` fell back to the first entitlement in the object when
  `pro` was absent, so any second entitlement on the project would have unlocked
  the app. Both now require `pro`, matching the webhook, which always did.
- **Transfers were ignored.** `TRANSFER` was not in `SUBSCRIPTION_EVENT_TYPES`, so
  the webhook answered 200 and changed nothing while `stateFromEvent` carried an
  unreachable `TRANSFER` branch — the account a subscription moved away from kept
  Pro until its stored expiry, up to a year. Transfers now route to
  `subscriptions.applyTransfer`, which expires every id in `transferred_from`.

### Also fixed — the analysing screen

- The `scan/analyzing` route was the only one drawing its own header that was not
  declared in `(app)/_layout.tsx`, so it rendered two back chevrons, a stray
  divider and a doubled top inset. Declared with `headerShown: false`; its error
  states now inset their own top edge. Siblings (preview, edit, result) use
  `AppScreen` and still rely on the native header, so they are untouched.
- The status badge over the photo used `bg-black/60` plus `backdrop-blur-md`,
  which React Native does not implement — white text over an unpredictable meal
  photo. Now an explicit opaque fill, clear of the viewfinder frame.
- Reduced motion is honoured: both animation loops are held at rest and the
  sweep line is not rendered.
- The step checklist no longer advances on a blind timer from mount. It waits for
  the analysis to be queued, so a slow upload cannot show "Estimating portions…"
  and four-of-four for a photo still on the device.

### Open, recorded but not fixed

Scale: unbounded `.collect()` in `dashboard.getDailyCalorieSeries` and
`usersDb.collectExport`; `maintenance.deleteExpiredExports` and `pruneRateLimits`
read only the head of the table with no index on the field they filter and no
rescheduling; `readScanUsage` collects failed scans that nothing bounds;
`foods.searchCatalog` filters by meal type after truncating.

Product: `settings.get` has no caller, so language/units/analytics consent are
mirrored to Convex and never read back; `aiDb.getScanQuota` has no caller;
rate-limit `ConvexError` object data is not read by `describeStartFailure`, so
`retryAfterMs` is discarded; `useServerProAccess` freezes its expiry comparison
at mount.

## 4. Three reported bugs — fixed

### "Free plan" still showing after a successful purchase

The profile badge read the RevenueCat SDK state alone (and re-derived Pro from an
inline copy of the state list); subscription settings did the same. Those two
surfaces and the server-gated ones therefore answered from different sources and
could disagree. A new `useProAccess()` resolves it from both — the SDK, which
updates the instant a purchase completes on *this* device, and the Convex mirror,
which is written by the store webhook and so survives a reinstall and follows the
account to another device. Either saying Pro is enough to *show* Pro; nothing is
granted on that basis, because every gated read is still re-checked server-side.

While there: `useServerProAccess` had frozen its `expirationAt` comparison in
`useState` at mount, so a subscription that lapsed with a screen open kept access
until the screen remounted. It now evaluates against the clock each time the
mirror is read.

### Days before sign-up were selectable in the dashboard calendar

The strip always renders three whole weeks, so an account created yesterday
reached back as far as twenty days it never had. Those days opened an empty
diary, which reads as data that went missing. The floor is the account's own
`_creationTime`; days below it are disabled exactly as future days already were,
and a swipe that would land outside the range settles on the nearest day the user
could have tapped. `isSelectableLocalDate` / `clampSelectableLocalDate` in
`week-range.ts` carry the rule, with tests.

The carousel also memoised its three weeks with an empty dependency list while
reading `new Date()` directly, so an app left open across midnight kept
yesterday's strip. It now takes `todayLocalDate` from the screen, which is the
same value the dashboard queries its range with.

### A Pro account could still reach the paywall

The paywall disabled its own buy button for a subscriber, but every route into it
still landed there — a deep link, the back stack, or an upgrade prompt tapped
before the entitlement had loaded. The route now redirects an existing subscriber
to subscription settings. The decision is latched on entry rather than tracked
live, deliberately: a purchase made *on* that screen flips the account to Pro
mid-flow, and a live guard would unmount the paywall underneath its own success
handler before it could hand over to the benefits screen.

## 5. Crash in the week strip, and the purchase failure identified

### `Cannot read property 'split' of undefined`

`localDateToDate` parsed its argument unguarded, and it is reached from render on
the dashboard's week strip, so one missing prop cost the whole screen — the
dashboard error boundary caught it and reported "we couldn't load your
dashboard", which hides the real fault. It now validates the shape and falls back
to today, which is what every caller is asking about anyway. Covered by tests.

The crash itself came from a bundle built between two edits: the carousel had
already gained its required `todayLocalDate` prop while the screen passing it had
not reloaded. The tree on disk is consistent and typechecks.

### The purchase failure is a RevenueCat configuration fault, not a code one

The diagnostic added in section 4 reported it exactly:

```
[paywall] action failed {"code": null, "message": "The store purchase completed,
but it is not attached to the RevenueCat entitlement \"pro\".", ...}
```

The store accepts the purchase and RevenueCat grants no `pro` entitlement for it.
That is also why the profile read "Free plan" after paying, and why the server
mirror stays empty: `convex/http.ts` ignores any webhook whose `entitlement_ids`
omit `pro`, so nothing is ever written. **This cannot be fixed from the
repository** — the `pro` entitlement has to exist in the RevenueCat dashboard with
both store products attached to it.

What the app now does about it: the failure has its own type
(`ProEntitlementMissingError`, in a module free of the store SDK so the rule is
testable), its own log field, and its own user-facing sentence. "Please try
again" was actively wrong advice — the next attempt buys nothing and the previous
one is unaccounted for — so that case now points at Restore instead, in all eight
languages.

## 6.

<!-- Add the next issue here. -->
