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

## 6. Full-codebase and process review, 24 Aug 2026 — all findings fixed

A read of the whole tree plus the four gate commands. The gate itself was the
first finding: `npm test` and `npx expo-doctor` were both failing on `main`, so
CI was red while `PLAN.md` and this file read green.

### The gate

- **Test fixtures had rotted.** `FREE_HISTORY_DAYS` is a window that moves with
  the calendar, and `FOOD_ENTRY.localDate` was the literal `2026-08-13`. Eleven
  days later the fixture sat outside the free window, every gated read clamped it
  away, and three tests failed reporting an empty array — which reads as a broken
  query, not an expired fixture. Fixture dates now hang off `localDateOffset()`
  in `convex/tests/setup.ts`. Tests that deliberately probe *outside* the free
  window keep their literals and their `grantPro`, because those only ever drift
  further out.
- **Thirteen packages behind their SDK 57 patch versions.** `npx expo install
  --fix`; doctor is 21/21.

### Security and correctness

- **Unmetered RevenueCat calls through `ai.startScan`.** The `aiScan` rate limit
  lives inside `aiDb.begin`, which runs *after* the entitlement check, and
  `isEntitlementFresh` returns false for every account with no mirror row — which
  is every free user. So each `startScan` spent an outbound request to
  `api.revenuecat.com` before any limiter could refuse it, and the call that
  eventually threw "Pro entitlement required" had already spent it.
  `verifyForCurrentUser` now consumes the same per-identity budget as the
  client-callable `verifyEntitlement`.
- **A malformed store date granted open-ended Pro.** An unparseable
  `expires_date` made `active` true and normalized `expirationAt` to `undefined`,
  which every gate reads as "no expiry". `expires_date: null` legitimately means
  a non-expiring entitlement and still grants; a date we cannot read is now
  refused and logged.
- **The 18–80 age window admitted 17 and 81.** `assertAdultDateOfBirth`
  subtracted birth years and then allowed a year of slack either side. The slack
  was covering for year-only arithmetic that `deriveDateOfBirth`'s 1 January
  convention already makes unnecessary. Now an exact comparison.

### Scale — every item from §3's "open, recorded but not fixed" list

- **`usersDb.collectExport`** `.collect()`ed every row of every user table in one
  query. Past Convex's read limit that threw, `buildExport` caught it and wrote
  `export_failed`, and the account with the most data was the one that could
  never get it out. Now `collectExportHeader` + a cursor-paginated
  `collectExportPage`, driven by the action.
- **`maintenance.deleteExpiredExports` and `pruneRateLimits`** read the head of
  an unindexed table and filtered in JavaScript, so once the head held unexpired
  rows nothing behind it was ever reached — both reported success and collected
  nothing. Now indexed (`by_status_expires`, `by_window`) and self-rescheduling,
  like the two sweeps beside them. `failExport` stamps an expiry so failed jobs
  are collected too.
- **`aiDb.readScanUsage`** read every scan of the month and discarded the
  failures. Failures consume no quota, so nothing bounds how many an account can
  accumulate — and this runs on the path that starts every scan, so a phone with
  a bad camera could eventually make its own scanning impossible. Now three
  bounded reads over `by_user_status_created`, one per billable status.
- **`foods.searchCatalog`** took `limit` rows and *then* dropped the ones that did
  not match the meal type, so a filtered search returned whatever fraction of the
  first page happened to match. `mealTypes` is an array and cannot be a search
  `filterField`, so the read now over-fetches into a bounded candidate pool
  before filtering.
- **`dashboard.getDailyCalorieSeries`** `.collect()`ed a range capped only at ten
  years, while the progress screen offers "All". Now bounded and read
  newest-first, so if the bound is ever reached the chart loses its oldest days
  rather than flat-lining the ones the user is looking at; the partial day the
  cut falls inside is dropped rather than charted wrong.

### Product

- **`settings.get` had no caller.** The table had a writer and no reader, so its
  own docstring — that these preferences follow the account across devices —
  described something that did not happen. Language was worse: nothing ever
  *wrote* it, so `languageMode`/`language` only held insert defaults. New
  `providers/settings-sync-provider.tsx` pulls once on sign-in, filling in only
  what this device has no answer for, then pushes this device's choices back.
  A device with its own stored language keeps it; an analytics question already
  answered here is never overwritten by the account's copy.
- **Rate limits reached the user as "the analysis did not finish".**
  `describeStartFailure` read `cause.data` only when it was a string, and
  `consumeRateLimit` is the one error that throws object data — so the object
  fell through to `cause.message`, matched no branch, and `retryAfterMs` was
  discarded. Extracted to `features/scan/start-failure.ts` (testable, returns a
  key rather than translated text), with new copy in all eight languages that
  says how long to wait.
- **`aiDb.getScanQuota` had no caller,** so the 10/day and 150/month limits were
  enforced but invisible and discoverable only by failing. The camera screen now
  shows the remaining count once it is down to three, reusing the existing notice
  treatment rather than inventing one.

### Not defects — no change, now documented in place

- `foods.getRecommendations` has no caller because the goal-suggestion section
  was removed from the foods screen on request. Re-adding it is a product
  decision, not a repair.
- `aiDb.getProviderStatus` has no caller because it is an operator tool read from
  the Convex dashboard. Giving it a screen would put deployment configuration in
  front of users.
- `settings.update({ units })` is a redundant mirror: display units live on
  `userProfiles`, which `profiles.getCurrent` already reads back.

### Process

`PLAN.md` and this file were both green while the gate was red. Status markers
should not move until the gate has been run in the worktree — the rule AGENTS.md
already states for checks applies to the markers that report them.

## 7. `settings.get` threw `Unauthenticated` on the welcome screen — fixed

Introduced by §6's own settings-sync work, reported from the device log the same
evening.

`SettingsSyncProvider` subscribed to `api.settings.get` unconditionally. It sits
inside `ConvexUserGate`, and that gate returns its children *unwrapped* when
nobody is signed in — the auth and public routes live under the same provider
tree — so the query ran with no identity on the very first screen of the app and
`requireCurrentUser` threw.

`OutboxSyncProvider`, its sibling, already guarded every flush with
`useConvexAuth().isAuthenticated`. The new provider was the outlier and now
follows the same pattern: the subscription is `"skip"` until Convex has an
identity, both effects return early without one, and the pull flag resets on
sign-out so the next account adopts its own settings rather than inheriting the
previous one's.

`settings.get` is also tolerant now, matching `users.getCurrent`: no identity, or
an identity whose `syncFromClerk` has not landed, answers null rather than
throwing. A client subscribes to this across sign-in and sign-out, and those
moments are not errors. Nothing is leaked by the distinction — the answer is the
caller's own settings or nothing at all.

`aiDb.getScanQuota` on the camera screen took the same guard, for the same reason.

Covered by three regressions in `convex/tests/reviewRegressions.test.ts`.

## 8. Progress card rendered `{{percent}}% of goal` — fixed

Reported from a screenshot of the Progress tab.

### The literal placeholder

`progress.pctOfGoal` is defined **twice**. `resources.ts` says `"{{pct}}% of your
goal"`; `screens/*.ts` says `"{{percent}}% of goal"`. `buildBundle` assigns
`progress: screens.progress`, replacing the namespace outright rather than
merging it, so the screens copy is the one that renders and the `resources` copy
is unreachable. `progress-screen.tsx` passed `{ pct }`.

i18next leaves an unmatched placeholder in place rather than throwing — correct
at runtime, and the reason this reached a device in all eight languages with
every test passing. `parity.test.ts` compares which keys *exist*; the key existed
everywhere and every language agreed. The mismatch was between the call site and
the bundle, which nothing looked at.

Fixed by passing `percent`, and the dead `progressTranslations` copy now carries
a comment saying it is superseded and must not be added to.

### The guard

`src/locales/interpolation.test.ts` parses every `t("key", { … })` call in `src/`
— balanced-brace scan, so nested objects and ternaries are read whole, and
shorthand `{ percent }` counts — resolves each key against the bundle that
actually renders, and fails when the string names a placeholder the call site
does not supply. Verified against the real defect: reintroducing `pct` fails the
suite in all eight languages with the file and both names.

### Screens that could take down the app

The dashboard had an error boundary written inline. Progress, Profile and Foods
had none, so a Convex `useQuery` observing a server error threw past them to
`FatalErrorBoundary` — which replaces the *whole* app with "Something went wrong"
and offers a restart. One failed profile query should not read as a crash, nor
cost the user their place in the app.

`components/screen-error-boundary.tsx` generalizes it: a retryable card in place
of the screen, reporting to Sentry with a `screen` tag rather than swallowing the
error, and reusing the existing `ErrorState` and `errors.loadFailed`. Applied to
Progress, Profile and Foods; the dashboard's hand-rolled copy now uses it too and
keeps its own wording.

### Checked and correct — no change

- All twelve Profile settings routes resolve to real files.
- `weights.getHistory` orders `desc`, so Profile's `limit: 1` really is the
  latest entry, not the oldest.
- The floating gear in the screenshot is the `expo-dev-client` launcher button,
  not app UI.
- Content passing under the translucent tab bar is iOS behaviour;
  `contentInsetAdjustmentBehavior="automatic"` gives the scroll view its inset.

## 9. Foods tab review, 25 Aug 2026 — fixed

A full pass over the Foods tab and the two screens it should lead to. The tab
rendered a list and nothing else: no route out of it, a search box that searched
almost nothing, and a "Log Again" button that failed in silence.

### The list led nowhere

`UserScannedFoodCard` was a plain `View`. `/(app)/food/log/[id]` — the screen
that views, corrects and deletes a logged meal — existed and was reachable from
Today and from History, but not from the tab dedicated to the user's meals. From
here a logged meal could not be opened at all. The card is now the press target,
with a composed accessibility label and a hint.

### The search box only searched what was already on screen

It substring-matched the 40 rows the screen had already loaded. `foods.searchCatalog`,
its search index, `foodCatalog` and every localized title in it had no caller, so
`/(app)/food/[id]` — the catalog detail screen — was unreachable in the running
app, and a search for a food the user had never logged returned "No matches" for
a catalog that contained it.

Searching now consults three sources under one query: the user's own logged
meals, their saved custom foods, and the catalog through its search index.
Matching is accent-insensitive, because "musli" must find "Müsli" in a German
build. The catalog section appears only while a query is present, so the
goal-suggestion section that was removed on request stays removed.

### Re-logging failed silently

`catch {}` with a comment saying the user could retry — nothing on screen said
the write had failed, and there was no offline path, so a re-log made with no
connection was simply lost. `features/food/use-relog-meal.ts` now carries that
flow for both screens: an offline attempt is queued for `OutboxSyncProvider`,
every outcome produces a notice, and one in-flight re-log disables all of them so
a double tap cannot produce two entries. It stays on the screen afterwards rather
than jumping to Today — "log again" is an action people repeat.

The photograph is deliberately not copied to the new entry. An image's lifetime
is bound to the scan that produced it and `foodLogs.remove` reclaims the blob
with the entry that owns it, so a second entry pointing at the same storage id
would lose its picture the moment the original was deleted.

### Other defects fixed on the same screens

- **A meal-type filter that matched nothing** showed "No scanned meals found" and
  offered a camera. The user had meals; the chip did not. It now says so and
  offers to clear the chip.
- **`MacroStat` had an `accessibilityLabel` on a `View` with no `accessible`,**
  so the label was dropped and VoiceOver read the value and the label as two
  separate elements. Same defect on the streak badge.
- **Every card name carried `accessibilityRole="header"`,** so screen-reader
  header navigation walked through forty list items.
- **The list stopped at 60 entries in silence.** It pages in blocks of 30 to a
  stated ceiling of 150, names what is on screen, and points at the full history.
- **`/(app)/food/[id]` and `/(app)/food/log/[id]` had no error boundary,** so a
  failed read replaced the whole app with a restart prompt.
- **The catalog detail screen filed every food as lunch** unless the user noticed
  the meal control. It now defaults from the local hour.
- **Deleting an entry called `router.back()` unconditionally,** which is a no-op
  when the screen was opened by deep link and left the user on a deleted entry.
- **The delete confirmation offered "Yes" and "No",** which forces the reader
  back to the title to work out which one deletes. Now "Cancel" and "Delete".
- **The logged-meal screen had no primary action.** Correcting and deleting were
  in the hero; eating the same thing again meant going back to the tab.

### Still open — product decisions, not defects

- `/(app)/food/search` remains reachable only from the new "Browse the food
  library" link in the Foods footer. Its favourites, recents and library sections
  are now largely duplicated by the tab's own search; removing it is a product
  call, so it is linked rather than deleted.
- `foods.getRecommendations` still has no caller, for the reason recorded in §6.
- The design's fifth "Shakes" chip has no equivalent: `MealType` is
  breakfast/lunch/dinner/snack, so the chip would match nothing.

## 10.

<!-- Add the next issue here. -->
