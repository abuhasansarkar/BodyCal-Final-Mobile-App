# BodyCal design mapping

Only supplied, real filenames are listed here. A route is not visually accepted merely because it appears in this mapping.

| App route | Design reference | Reference frame |
| --- | --- | --- |
| `/(public)/welcome` | `welcome.jpg` | Language badge, hero, headline, CTA, and sign-in link |
| `/(auth)/sign-in` | `auth.png` | Center phone adapted into the design-system authentication bottom sheet with Apple, Google, and email choices |
| `/(auth)/email-sign-in` | `auth.png` | Center phone: returning-user email and password authentication |
| `/(auth)/sign-up` | `auth.png` | Right phone: account creation |
| `/(onboarding)/goal` | `onboarding-1-to-6.png` | Frame 1 of 6: primary goal selection |
| `/(onboarding)/calculation-basis` | `onboarding-1-to-6.png` | Frame 2 of 6: personal calculation-basis selection, adapted from the sex-selection reference |
| `/(onboarding)/age` | `onboarding-1-to-6.png` | Frame 3 of 6: large age value and horizontal ruler |
| `/(onboarding)/height` | `onboarding-1-to-6.png` | Frame 4 of 6: metric/imperial segmented control and ruler |
| `/(onboarding)/current-weight` | `onboarding-1-to-6.png` | Frame 5 of 6: kg/lb segmented control and ruler |
| `/(onboarding)/goal-weight` | `onboarding-1-to-6.png` | Frame 6 of 6: current/goal comparison and goal ruler |
| `/(onboarding)/activity` | `onboarding-7-to-12.png` | Frame 1 of 6: four activity-level selection rows |
| `/(onboarding)/pace` | `onboarding-7-to-12.png` | Frame 2 of 6: three goal-pace selection rows |
| `/(onboarding)/calculating` | `onboarding-7-to-12.png`, `Plan-ready.jpg` | Frame 3 of 6 provides the BodyCal structure and task states; `Plan-ready.jpg` provides the percentage counter and filled progress-track reference |
| `/(onboarding)/result` | `onboarding-7-to-12.png`, `Plan-complated.jpg` | The onboarding composite provides the shared BodyCal header; `Plan-complated.jpg` provides the completed-plan success state, grouped recommendation tiles, and personalized-info layout, with its pencil icons intentionally omitted |
| `/(onboarding)/ai-introduction` | `onboarding-7-to-12.png` | Frame 5 of 6: meal-photo scan framing and feature summary |
| `/(onboarding)/notifications` | `onboarding-7-to-12.png` | Frame 6 of 6: reminder-category controls and setup completion |
| `/(app)/paywall` | `paywal-1to-3.png`, `paywall.jpg` | Three sequential full-screen states from `paywal-1to-3.png`: benefit overview with food photography, trial reminder timeline, and annual/monthly selection with purchase disclosure. `paywall.jpg` remains a supplemental pricing-card reference. Trial and no-charge language render only when RevenueCat confirms eligibility. |
| `/(app)/(tabs)/today` | `main-dashbaord.png`, `dashboard.png`, `dashboard-screen.png` | `main-dashbaord.png` is the primary hierarchy: horizontal BodyCal header with a real food-logging streak, three-page swipeable week strip (two previous weeks through the current week), prominent calorie card, three macro tiles, photographic scan banner, recent uploads, and photo-led daily meal rows. The bottom navigation includes the reference's elevated center Scan action. Unsupported water and barcode features remain omitted. |
| `/(app)/(tabs)/foods` | `foods.png`, `modal-food.png` | `foods.png` is the canonical design reference: header with BodyCal logo lockup and live streak badge, search bar ("Search high-calorie foods and meals"), horizontal category filter pills (Breakfast, Lunch, Dinner, Snacks, Shakes), dynamic goal headline ("Foods for healthy weight gain"), and photographic food cards with rich macro breakdown (Protein #2F80ED, Carbs #F97316, Fat #8B5CF6). |
| `/(app)/(tabs)/progress` | `progress.png`, `weight-chart.jpg` | `progress.png` is the canonical design reference: header with brand subtitle, 3-column start/current/goal weight card, total progress percentage with circular goal ring, interactive Weight Over Time line chart with range selector pills (Week, Month, 3M, All), and 2x2 metric cards grid (Current streak, Avg. calories, Goal consistency, Avg. protein). |
| `/(app)/(tabs)/profile` | `profile.png` | Identity header with Clerk avatar/name/email, RevenueCat-backed membership badge, profile edit action, real goal/weight summary, grouped settings, and separated account/sign-out actions. Unsupported or unverified progress claims are omitted. |
| `/(app)/scan/camera` (before permission) | `camera-open-before.png` | Large food-scan hero, three scan-quality tips, and black permission education CTA shown before the OS camera prompt; permanently denied permission adapts the CTA to open device settings |
| `/(app)/benefits` | `DESIGN-SYSTEM.md`, `design-system.png` | Post-purchase BodyCal feature summary using five real product capabilities and shared cards, icons, typography, progress, and fixed CTA patterns |
| `/(app)/review` | `review.jpg` | Three-step progress/header rhythm, large review-focused headline, rating presentation, bordered information cards, fixed CTA, and skippable feedback prompt; unsupported third-party ratings, user counts, portraits, medical claims, and testimonials are intentionally omitted |
| `/(app)/thank-you` | `thank-for-trust.jpg` | Centered celebratory circular illustration, large gratitude headline, supporting copy, and final fixed CTA adapted to BodyCal |

## Implementation notes

- `/(app)/(tabs)/today` macro tiles use the supplied photography: `assets/images/food (2).png` for protein, `assets/images/food (3).png` for carbohydrates, and `assets/images/food (1).png` for fat. Note the space before the parenthesis in each filename. Each sits in a circular tinted well at the tile's lower-left, per `main-dashbaord.png`, and is marked `accessible={false}` because the adjacent value and label already carry the meaning.
- The Apple authentication button uses `assets/images/apple-sign-in-logo.png` tinted white on the black button. The previous SF Symbol `apple.logo` had no Material Symbols counterpart, so the Android button rendered without a logo.
- Unused supplied assets, kept but not currently mapped to any route: `BodyCal-White-Logo.png`, `daily-goal-runner.png`, `logo-glow.png`, `muscular-body-man.png`, `muscular-body-man-hero.png`. `assets/images/tabIcons/` and the `expo-*`/`react-logo*`/`tutorial-web` files are unused Expo template leftovers.
- `/(public)/welcome` uses `assets/images/welcome-food-scan-hero.png`, derived from the user-supplied person-photographing-food reference with its phone frame and instruction UI removed.
- The language badge in `welcome.jpg` shows only its closed state. In the app it opens a native form sheet containing all eight launch languages, with radio semantics and a persisted selection.
- The sign-in entry follows the authentication bottom-sheet pattern in `DESIGN-SYSTEM.md`; choosing email opens the mapped email/password screen within the same native sheet stack.
- Responsive height, Dynamic Type, screen-reader semantics, and 44-point minimum targets take precedence over fixed mockup coordinates.
- Sign-in and sign-up remain mapped but are not visually accepted by this welcome-screen change.
- `design-system.png` and `DESIGN-SYSTEM.md` jointly define the shared BodyCal foundations. Where fixed mockup geometry conflicts with Dynamic Type, safe areas, localization, or smaller Android displays, the responsive native behavior takes precedence.
- The screen-2 reference includes a third undisclosed-sex choice. It is intentionally not mapped to an invented Mifflin–St Jeor formula constant; the implemented choices state the required calculation basis explicitly pending a product decision.
- The Results CTA retains the existing account-creation boundary. Successful sign-up resumes at AI Scan, after which authenticated reminder setup persists the nutrition plan and completes onboarding.
- A successful subscription purchase now continues through Benefits, Review, and Thank You before entering Today. Review submission remains optional; low ratings may include private authenticated feedback, while eligible positive ratings defer to the operating system's native store-review prompt.
