# Observed BodyCal design tokens

Sources: `DESIGN-SYSTEM.md`, `design-system.png`, `welcome.jpg`, `auth.png`, `onboarding-1-to-6.png`, and `onboarding-7-to-12.png`.

## Welcome and authentication

| Token | Observed value |
| --- | --- |
| Screen background | `#FFFFFF` |
| Primary text and CTA | `#111111` |
| Supporting text | `#737373` |
| Subtle surface | `#FAFAFA` |
| Border | `#E8E8E8` |
| Screen horizontal padding | `20px` |
| Primary CTA height | `54–58px` |
| Standard primary CTA radius | `16px` |
| Welcome primary CTA shape | Full capsule |
| Selection-card radius | `16px` |
| Feature-card radius | `24px` |
| Welcome hero radius | `28px` |
| Selected border | `1.5px #111111` |
| Body copy | `15px` minimum |
| Minimum interactive target | `44×44px` |

The current welcome composition observed in `welcome.jpg` is a language badge aligned to the upper-right, one dominant portrait visual, a large centered two-line headline, a black capsule CTA, and a centered inline sign-in action.

## Onboarding 1–6

| Token | Observed value |
| --- | --- |
| Reference canvas | `393×852pt` modern iPhone portrait target |
| Onboarding background | `#FFFFFF` |
| Header arrangement | 44pt back target, centered icon + BodyCal wordmark, balanced trailing space |
| Progress | Twelve connected circular steps representing the complete onboarding flow; the app centers the track and omits visible `current / total` text |
| Question alignment | Centered |
| Question size | Approximately `24px`, bold |
| Supporting copy | Approximately `14px`, `#737373`, centered |
| Selection card | Approximately `76px` high, `16px` radius, `#E8E8E8` border |
| Selected card | `#111111` border; selection is not communicated by color alone |
| Unit control | Two-segment control; active segment `#111111` with white text |
| Numeric value | Approximately `54px`, semibold, tabular numerals |
| Ruler | Horizontal snapping scale with a fixed black center indicator |
| Bottom action area | White fixed footer, subtle top separator, 56pt black CTA |

The raster design-system board is `1448×1086` PNG. The onboarding composite is `1672×941` PNG and contains six phone frames; implementation measurements are normalized to the documented `393×852pt` device target rather than copied from the composite's outer canvas.

## Onboarding 7–12

| Token | Observed value |
| --- | --- |
| Reference composite | `1672×941` PNG with six portrait phone frames |
| Header lockup | Same centered horizontal logo + BodyCal wordmark used throughout onboarding |
| Progress | The same twelve-step connected-dot track continues from steps 7–12, without a visible fraction (approved implementation override) |
| Selection rows | White, subtle border, rounded corners, leading outline icon, trailing radio state |
| Building state | Three bordered task rows with completed and in-progress status indicators |
| Plan-generation counter | Large tabular percentage above a slim rounded progress track; the app retains the BodyCal black-and-white palette instead of copying the supplemental reference gradient |
| Result hierarchy | Large estimated calorie target followed by blue/orange/purple macro cards |
| Completed-plan layout | Black circular success mark, goal-specific centered headline, muted grouped recommendation surface, dominant calorie tile, three equal macro tiles, and a separate personalized-info surface; edit/pencil actions are omitted by request |
| Paywall trial timeline | Orange `#FF8A00` milestone with pale-orange connector, used only for the Today/free-trial timeline |
| Paywall plan cards | `22px` radius, `2px` border; selected plan uses `#111111`, a black checked radio, and an optional black trial banner |
| Paywall legal actions | Centered inline Terms · Privacy · Restore actions using secondary text color and 44pt minimum targets |
| AI introduction | Large rounded food photo with white scan-corner overlay |
| Reminder rows | Leading category icon, title/supporting cadence, trailing native switch |
| Primary action | Fixed black bottom CTA above the bottom safe area |

The implementation keeps calculated nutrition visibly labeled as an estimate, preserves the authenticated account boundary before server persistence, and requests notification permission only after an explicit setup action.

## Icon implementation

The supplied references use simple monochrome outline and filled icons. The app maps each semantic icon through Expo Symbols: SF Symbols on iOS and the corresponding Material Symbol on Android. Shared sizes are `16px` for compact metadata, `20â€“25px` for controls and navigation, and `27â€“30px` for prominent success or result states. Icons inherit the surrounding semantic color and never replace an accessible text label.

## Post-purchase flow

| Token | Observed/adapted value |
| --- | --- |
| Progress | Three slim connected visual segments at the top |
| Header back target | `48px` circular subtle surface |
| Main headline | `34â€“42px`, bold, responsive wrapping |
| Review accent | Warm star color `#E5A15E`, observed from `review.jpg` |
| Information card | White, `#E8E8E8` border, `20â€“22px` radius |
| Thank-you illustration | Nested pale lavender circular surface with monochrome celebration icon |
| Footer | Fixed white action area with subtle top separator and 60px capsule CTA |

The app does not reproduce the source review image's unverified user totals, ratings, portraits, testimonials, weight-loss claims, or medication reference. The layout is adapted while BodyCal collects only genuine user input.

## Dashboard

| Token | Observed/adapted value |
| --- | --- |
| Information hierarchy | Greeting, week strip, calorie summary, macros, Scan Food, quick actions, daily meals |
| Summary card | White surface, subtle border, `24px` radius, large tabular calorie value |
| Current day | Black circular fill with white date text |
| Calorie progress | Black fill on a quiet `#E8E8E8` track |
| Macro colors | Protein `#2F80ED`, carbs `#F97316`, fat `#8B5CF6` |
| Primary action | Black `64px` Scan Food button |
| Meal presentation | One grouped white surface with subtle row separators |
| Primary dashboard reference | `main-dashbaord.png`, `864×1821px` composite normalized to the `393×852pt` target |
| Brand header | Horizontal black logo lockup in the native tab header |
| Header streak | Compact white capsule with orange flame; value is calculated from consecutive user-scoped food-log dates and is never fabricated |
| Calorie summary | Large `48px` tabular value with a compact monochrome circular progress indicator |
| Macro summary | Three equal white tiles with functional blue/orange/purple progress tracks |
| Scan banner | `28px` radius, black copy surface, real food-scanning photography, white capsule action |
| Recent food rows | `76px` rounded thumbnail, compact timestamp/nutrition metadata, neutral icon fallback |
| Week navigation | Three horizontally paged weeks: two previous weeks plus the current week; future-week paging is unavailable |
| Date selection | `44px` circular date targets; selected date uses `#111111` fill and refreshes that local day's nutrition data |
| Primary tab action | Elevated `64px` black circular camera action centered between Progress and Foods |

The implementation combines the cleaner hierarchy from `dashboard.png` and `dashboard-screen.png`. Barcode and water modules are not shown because those capabilities are not backed by the current V1 data model.

## Profile

| Token | Observed/adapted value |
| --- | --- |
| Identity block | `96px` circular avatar, large name, muted email, compact membership capsule |
| Goal summary | White bordered `24px` card with three equal columns and quiet vertical separators |
| Settings groups | White bordered `24px` surfaces with `64px` minimum rows and subtle separators |
| Leading controls | `40px` quiet icon tiles with semantic monochrome symbols |
| Destructive actions | Red icon/text, visually separated from standard settings |
| Membership | RevenueCat-derived Premium or Free label; never inferred from presentation alone |
| Progress language | Only stored goal and weight data is displayed; unsupported “on track” claims are omitted |

## Three-screen paywall

| Token | Observed/adapted value |
| --- | --- |
| Presentation | Full-screen modal with custom close and restore controls |
| Brand lockup | Centered BodyCal mark and wordmark on all three states |
| Screen 1 | Three compact benefit rows, large rounded meal image, black CTA |
| Screen 2 | Circular reminder icon and three vertically connected timeline cards |
| Screen 3 | `22px` plan-card radius, black selected state, security summary and legal links |
| Primary CTA | Approximately `60px`, black, `16px` radius |
| Supporting surface | `#FAFAFA` with subtle `#E8E8E8` border |
| Navigation | Three sequential states inside one modal; back returns to the previous paywall state |

The supplied filename is `paywal-1to-3.png`. Store-provided prices replace the static example prices, and free-trial messaging appears only when RevenueCat confirms eligibility for the selected product.

## Camera permission education

| Token | Observed/adapted value |
| --- | --- |
| Hero | Large portrait food-scanning photograph with `28px` corners |
| Education card | White surface, subtle border/shadow, `28px` radius |
| Headline | Approximately `28px`, bold |
| Tips | Three icon-led rows with quiet separators and `17px` labels |
| Action | Black `60px` CTA with `16px` radius |

The screen explains scan quality before requesting the operating-system camera permission. If permission can no longer be requested, the same design presents an Open Settings action.
