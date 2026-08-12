# BodyCal — Full Design System v1.0.0

This system is based on the direction we established for BodyCal: **minimal, premium, iOS-first, easy to understand, calorie/nutrition focused, and primarily black/white rather than “fitness green.”** 

Your muscular shaker logo remains the primary brand mark, but the **rest of the product UI should stay clean and lifestyle-oriented** so BodyCal does not become visually heavy or look like a bodybuilding dashboard.

---

# 1. Brand Foundation

### Product

**BodyCal**

### Core positioning

> Track smarter. Eat better. Reach your goal.

BodyCal helps people:

* lose weight
* maintain weight
* gain weight
* track calories
* track protein, carbs and fat
* scan meals with AI
* discover goal-specific foods
* monitor weight and progress
* build consistent habits
* manage reminders and subscriptions

These are the core product functions defined for the app. 

### Brand personality

**Primary**

* Clean
* Confident
* Premium
* Simple
* Intelligent
* Trustworthy
* Goal-oriented

**Secondary**

* Motivating
* Healthy
* Modern
* Calm
* Friendly

### What BodyCal should NOT feel like

* bodybuilding software
* hardcore gym tracker
* neon fitness application
* overly gamified health app
* medical dashboard
* complicated nutrition database
* crowded analytics product

The intended experience is lightweight, modern, premium and low-cognitive-load. 

---

# 2. Logo System

Your supplied muscular man + shaker logo becomes the official BodyCal identity.

## Primary Logo — Black

Use:

* white/light backgrounds
* splash
* onboarding
* authentication
* dashboard header
* profile
* marketing pages

### Primary treatment

```text
Logo: #111111
Background: #FFFFFF
```

---

## Reverse Logo — White

Use on:

* camera screen
* dark photography
* black promotional surfaces
* occasional premium dark screens

```text
Logo: #FFFFFF
Background: #111111 or photography
```

---

## Recommended Lockup

```text
[ LOGO ] BodyCal
```

Use the icon left of the wordmark when horizontal space permits.

For smaller navigation headers, use:

```text
[ LOGO ] BodyCal
```

For splash and premium moments:

```text
      LOGO
     BodyCal
```

---

## Logo Clear Space

Minimum clear space around the mark:

```text
0.35 × logo width
```

Never let:

* text
* buttons
* food images
* screen edges

touch the logo.

---

## Logo Usage Rule

The logo itself may be muscular and expressive.

The **rest of the UI should not repeat muscular-body imagery everywhere**. Your design brief intentionally calls for premium lifestyle imagery instead of unrealistic bodybuilding visuals. 

---

# 3. Master Color System

The UI should rely primarily on **black, white, neutral grays and food photography**, while green is reserved for positive states rather than being the core brand color. 

## Brand Colors

| Token                | Hex       | Usage                                |
| -------------------- | --------- | ------------------------------------ |
| `brand-black`        | `#111111` | Primary buttons, active states, logo |
| `brand-black-strong` | `#000000` | Camera UI / maximum contrast         |
| `background`         | `#FFFFFF` | Main background                      |
| `surface-subtle`     | `#F7F7F7` | Secondary background                 |
| `surface-muted`      | `#FAFAFA` | Sections                             |
| `border`             | `#E8E8E8` | Inputs/cards/dividers                |
| `border-strong`      | `#D6D6D6` | Selected neutral control             |
| `text-primary`       | `#111111` | Main copy                            |
| `text-secondary`     | `#737373` | Supporting copy                      |
| `text-muted`         | `#A3A3A3` | Placeholder/meta                     |

---

# 4. Functional Accent Colors

These colors are **functional**, not primary branding.

## Protein

```text
#2F80ED
```

Use for:

* protein values
* macro chart
* protein progress

---

## Carbohydrates

```text
#F97316
```

Use for:

* carbs
* carbohydrate progress
* macro charts

---

## Fat

```text
#8B5CF6
```

Use for:

* fats
* fat progress
* macro visualization

---

## Success

```text
#22C55E
```

Use very sparingly:

* goal achieved
* weight progress
* valid scan
* success toast
* positive change

**Never use it as BodyCal's main button color.**

---

## Warning

```text
#F59E0B
```

---

## Error / Destructive

```text
#EF4444
```

Use for:

* delete account
* failed scan
* validation issues
* destructive actions

---

# 5. Color Distribution

Recommended screen composition:

```text
70–80% White / neutral
15–20% Black / dark text
5–8% Food photography
<5% Functional accent colors
```

This keeps BodyCal looking like a premium health application rather than a colorful fitness tracker.

---

# 6. Typography

The design specification calls for an Apple/SF-Pro-like hierarchy. 

### Recommended

**SF Pro Display / SF Pro Text**

For Expo cross-platform implementation:

**Inter** is the safest practical alternative.

---

## Type Scale

| Style      | Size | Weight | Line Height |
| ---------- | ---: | -----: | ----------: |
| Display    |   36 |    700 |          42 |
| H1         |   32 |    700 |          38 |
| H2         |   24 |    600 |          30 |
| H3         |   20 |    600 |          26 |
| Body Large |   17 |    400 |          25 |
| Body       |   15 |    400 |          22 |
| Label      |   14 |    500 |          19 |
| Caption    |   13 |    400 |          18 |
| Micro      |   12 |    500 |          16 |

---

# 7. Numerical Typography

Large health metrics should command attention.

Examples:

```text
2,650
kcal
```

```text
74.8
kg
```

```text
1,640 kcal left
```

Recommended:

```text
44–56px
600–700 weight
-1% tracking
```

Large health numbers are intentionally prominent in the design specification. 

---

# 8. Spacing System

Use an **8px-based system with 4px increments**.

```text
4
8
12
16
20
24
32
40
48
64
```

The underlying design brief specifies generous spacing and 20–24px page padding. 

### Screen padding

```text
Horizontal: 20px
Large screens: 24px
Top section gap: 24–32px
Section gap: 28–32px
```

---

# 9. Corner Radius

Use a soft, consistent radius system. 

| Component            | Radius |
| -------------------- | -----: |
| Small chip           |   10px |
| Input                |   14px |
| Button               |   16px |
| Small card           |   16px |
| Standard card        |   20px |
| Feature card         |   24px |
| Modal / Bottom sheet |   28px |
| Food image           |   18px |
| Avatar               |  999px |

Avoid randomly mixing radius values.

---

# 10. Borders

Default:

```text
1px #E8E8E8
```

Selected:

```text
1.5px #111111
```

Error:

```text
1px #EF4444
```

Avoid placing visible borders around every element.

---

# 11. Shadows

Use almost no heavy elevation.

Your design spec specifically calls for extremely subtle shadows and avoiding floating shadow-heavy cards. 

### Standard card

```text
0 4px 18px rgba(0,0,0,0.04)
```

### Floating bottom sheet

```text
0 -8px 30px rgba(0,0,0,0.08)
```

### Camera result sheet

```text
0 -12px 40px rgba(0,0,0,0.12)
```

---

# 12. Primary Button

```text
Height: 54–56px
Background: #111111
Text: #FFFFFF
Radius: 16px
Font: 16px / 600
```

Examples:

**Continue**

**Scan Food**

**Add to Today**

**Start My Plan**

**Start 3-Day Free Trial**

The requested CTA system is a full-width black button with white text and ~52–56px height. 

---

# 13. Secondary Button

```text
Background: #FFFFFF
Border: 1px #E8E8E8
Text: #111111
Height: 52px
Radius: 16px
```

Examples:

* Retake
* Add manually
* Restore Purchases
* Save to Favorites

---

# 14. Destructive Button

```text
Background: #FFF5F5
Text: #EF4444
```

Example:

**Delete Account**

Do not make **Sign Out** visually dominant.

---

# 15. Inputs

Standard input:

```text
Height: 54px
Background: #FFFFFF
Border: #E8E8E8
Radius: 14px
Padding: 16px
```

States:

```text
Default
Focused
Filled
Error
Disabled
```

For numbers such as weight and height, prefer a **large central number + ruler/wheel** rather than conventional text fields, which matches the requested onboarding UX. 

---

# 16. Selection Cards

Used for:

* goal
* gender
* activity
* pace
* subscription

### Default

```text
Background: #FFFFFF
Border: #E8E8E8
```

### Selected

```text
Background: #FAFAFA
Border: #111111
```

Include:

* icon
* title
* supporting copy
* check indicator

Do **not** use bright green selection states.

---

# 17. Chips

Use only where useful:

* High Protein
* Breakfast
* Lunch
* Dinner
* Snacks
* Shakes
* AI Estimate

### Neutral chip

```text
Background: #F7F7F7
Text: #111111
```

### Active chip

```text
Background: #111111
Text: #FFFFFF
```

---

# 18. Macro Component

The same macro convention should appear everywhere.

### Protein

Blue dot + value.

### Carbs

Orange dot + value.

### Fat

Purple dot + value.

Example:

```text
● 42g          ● 68g          ● 18g
Protein        Carbs          Fat
```

Never change macro colors between screens.

---

# 19. Calorie Progress Component

### Large dashboard version

```text
2,450
/ 3,200 kcal
```

with black progress ring.

### Percentage

```text
77%
of goal
```

The ring itself stays primarily black/gray.

The macro accents appear below.

---

# 20. Food Photography System

Food photography is one of the strongest visual branding elements.

The design specification asks for imagery that feels realistic, natural, premium and well-lit, without looking oversaturated or stock-like. 

### Use

* natural daylight
* warm neutral surfaces
* white / cream ceramic plates
* soft shadows
* high ingredient detail
* realistic serving sizes
* slight editorial styling

### Avoid

* ultra-saturated colors
* dark gym photography
* dramatic bodybuilding imagery
* fake plastic-looking food
* generic stock imagery

---

# 21. Icon System

Use only one icon family.

Recommended:

**Lucide React Native**

or native **SF Symbols** when available.

The brief explicitly asks for minimal outline icons with consistent line weight. 

### Stroke

```text
1.75–2px
```

### Standard sizes

```text
16
18
20
22
24
28
```

---

# 22. Core Icons

```text
Home
Bowl / Apple
Camera
Chart
User
Search
Barcode
Plus
Bell
Calendar
Target
Scale
Droplet
Flame
Chevron Right
Heart
Bookmark
Settings
Shield
Help Circle
Log Out
Trash
```

---

# 23. Bottom Navigation

Final primary navigation:

```text
Today
Foods
        [ Camera ]
Progress
Profile
```

The product brief specifies Today, Foods, Progress and Profile as the core tabs. 

### Active

```text
#111111
```

### Inactive

```text
#A3A3A3
```

### Center Scan Action

```text
56 × 56px
Black circle
White camera/scan icon
```

The scan button may float slightly above the tab bar.

---

# 24. Header System

### Main screen

```text
[ BodyCal logo ]                     [ notification ]
```

or:

```text
Good morning, John 👋
Stay consistent. Results follow.
```

### Subscreen

```text
←        Screen Title
```

### Modal

No full header.

Use:

```text
────────
```

drag indicator + dismiss icon when appropriate.

---

# 25. Card System

Do not turn the entire interface into cards.

### Use cards for

* major calorie summary
* subscription option
* progress summary
* food recommendation
* goal summary

### Use plain rows for

* profile settings
* notifications
* meal history
* ingredients
* help center

This aligns with the instruction to avoid excessive cards and busy dashboards. 

---

# 26. Food Card

### Image

```text
96–120px wide
18px radius
```

### Content

```text
Chicken & Rice Power Bowl
720 kcal

45g P   78g C   28g F
```

### Optional secondary text

```text
Grilled chicken, jasmine rice,
avocado and garlic aioli.
```

Do not add badges everywhere.

---

# 27. Food Detail Modal

Use a **large iOS-style bottom sheet**.

Structure:

```text
Drag indicator

Large Food Photo

Food name
Description

Calories

Protein | Carbs | Fat

Serving selector

Ingredients

Why it fits your goal

[ Add to Today ]

View Full Nutrition
```

Modal top radius:

```text
28px
```

Background behind modal:

```text
rgba(0,0,0,0.48)
```

---

# 28. Camera System

This can be BodyCal's most visually distinctive experience.

### Camera background

Live camera feed.

### Overlay

```text
White scan corners
```

### Top controls

```text
X                          Flash
```

White BodyCal logo can appear subtly in the center.

### Message

```text
Fit the whole meal in frame
```

### Bottom

```text
Gallery        Capture        Switch
```

The camera should remain intentionally minimal, consistent with the full-screen camera specification. 

---

# 29. AI Analysis States

### 1. Captured

**Use this photo?**

### 2. Analyzing

```text
Analyzing your meal...
```

Steps:

```text
✓ Identifying foods
✓ Estimating portions
○ Calculating nutrition
```

### 3. Result

```text
Chicken Rice Bowl

≈ 685 kcal

48g Protein
76g Carbs
20g Fat
```

Include:

**AI estimate**

and:

> AI estimates may vary. Adjust portions for better accuracy.

These states are defined in the product design brief. 

---

# 30. Onboarding System

The onboarding should feel like **one continuous flow**, not unrelated screens.

### Shared structure

```text
←                     3 / 8

Progress indicator

Question
Supporting explanation

Interactive control

[ Continue ]
```

---

# 31. Onboarding Screens

Recommended final flow:

```text
1. Primary Goal
2. Gender
3. Age
4. Height
5. Current Weight
6. Goal Weight
7. Activity Level
8. Goal Pace
9. Building Plan
10. Personalized Results
11. AI Scan Intro
12. Notification Preferences
13. Paywall
```

This combines the requested goal/body inputs, goal pace, calculation, personalized target, AI scan intro, notification setup and subscription flow. 

---

# 32. Authentication System

## Welcome

Keep auth secondary on the Welcome screen.

```text
Logo

Reach your goal
without the guesswork.

Food / AI scan hero

[ Get Started ]

I already have an account
```

---

## Authentication Bottom Sheet

Recommended BodyCal UX:

```text
Sign In

[ Apple   Sign in with Apple ]

[ Google  Sign in with Google ]

[ Email   Continue with email ]

Privacy copy
```

This avoids forcing full forms immediately.

---

## Email Auth

Separate screen:

```text
Welcome back

Email
Password

[ Sign In ]

Forgot password?

Create account
```

---

# 33. Paywall System

Pricing:

```text
Yearly
$24.99 / year

Monthly
$7.99 / month
```

Yearly is default and best value.

The specified paywall uses a **3-day free trial**, yearly `$24.99`, monthly `$7.99`, a transparent timeline and clear restore/terms/privacy links. 

---

# 34. Recommended 3-Screen Paywall Flow

### Screen A

```text
Reach your goal faster
```

Features + food hero.

CTA:

```text
Try BodyCal Free
```

---

### Screen B

```text
We'll remind you
before your trial ends
```

Timeline:

```text
Today
Start free trial

Day 2
Trial reminder

Day 3
Subscription begins
```

---

### Screen C

```text
Choose your plan
```

Yearly selected.

Primary:

```text
Start 3-Day Free Trial
```

---

# 35. Dashboard System

Dashboard hierarchy:

```text
Header
Greeting

Week selector

Calories summary

Macros

Scan Food

Secondary actions

Today's Meals

Streak
```

Do not turn Home into a statistics dump.

The intended Today screen centers around calories remaining, macros, a prominent Scan Food CTA and simple daily meal rows. 

---

# 36. Foods Screen

Structure:

```text
BodyCal

Search

Breakfast
Lunch
Dinner
Snacks
Shakes

Foods for healthy weight gain

Recommended for you

Food cards
```

### Explicitly exclude

* Filter button
* Sort button
* recently eaten section on main discovery view
* complicated database controls

The Foods screen direction specifies goal-based recommendations and asks to avoid complicated filters and sorting. 

---

# 37. Progress System

Use only the most valuable metrics.

### Hero

```text
Start weight
Current weight
Goal weight

+2.8 kg
60% of goal
```

### Chart

Weight over time.

Controls:

```text
Week
Month
3M
All
```

### Four summary metrics

```text
Current streak
Avg. calories
Goal consistency
Avg. protein
```

The progress specification explicitly says to keep the chart simple and avoid too many analytics. 

---

# 38. Profile System

### Header

```text
Avatar

John Doe
john@email.com

Premium
```

### Goal summary

```text
Current Goal
Current Weight
Goal Weight
```

### Grouped settings

```text
Goals
Calorie & Macro Targets
Notifications
Language
Units
Appearance

Subscription
Restore Purchases

Help Center
Privacy Policy
Terms

Delete Account
Sign Out
```

The profile structure and settings groupings come directly from the app blueprint. 

---

# 39. Empty States

Keep them extremely simple.

### Empty meals

```text
No meals yet

Take a photo or add your first food.

[ Scan Food ]
```

### Empty progress

```text
No progress yet

Log your weight to start tracking.

[ Add Weight ]
```

### Empty favorites

```text
No favorites

Foods you save will appear here.
```

These states are part of the defined system. 

---

# 40. Error States

### AI Scan Failure

```text
Couldn't analyze meal

We couldn't confidently identify your food.

[ Try Again ]

Add Manually
```

### Barcode

```text
No barcode result

We couldn't find this product.

[ Add Manually ]
```

### Offline

```text
No Internet

Check your connection and try again.

[ Retry ]
```

These error patterns are specified for the app. 

---

# 41. Loading

Use:

* skeleton lists
* animated placeholder food cards
* subtle progress rings
* inline loader

Avoid blocking fullscreen spinners unless unavoidable. 

---

# 42. Motion System

Animations:

```text
150–250ms
```

### Button

```text
Scale 1 → 0.98 → 1
```

### Bottom sheet

Spring entrance.

### Progress ring

Animate from zero on initial load.

### Food add

Quick slide/fade into diary.

### Selected onboarding card

Border + check fade.

### Tab switch

Subtle opacity transition.

The motion system should stay subtle rather than flashy. 

---

# 43. Haptic System

### Light haptic

* selection
* chip
* segmented control
* calendar day

### Medium haptic

* capture photo
* add meal
* complete onboarding step

### Success haptic

* plan created
* meal successfully added
* goal milestone

### Warning haptic

* destructive confirmation

---

# 44. Accessibility

Minimum:

```text
Touch target: 44 × 44px
```

Body text:

```text
15px minimum
```

Ensure:

* no information relies only on color
* proper screen reader labels
* Dynamic Type support
* 4.5:1 contrast for normal text
* clear focus indicators
* reduced-motion support

---

# 45. Dark Mode

BodyCal should be **light-first**.

Dark mode can later use:

```text
Background      #0D0D0D
Surface         #161616
Card            #1D1D1D
Text Primary    #FFFFFF
Text Secondary  #A3A3A3
Border          #2B2B2B
```

Keep food images identical.

Do not invert photography.

---

# 46. Device System

Primary design target:

**iPhone 16 Pro / modern iPhone portrait proportions**, with correct safe areas and no content beneath the Dynamic Island. 

Recommended design frame:

```text
393 × 852
```

@3x assets where necessary.

---

# 47. Expo / NativeWind Design Tokens

Recommended implementation naming:

```text
colors
  background
  foreground
  surface
  surfaceMuted
  border
  textPrimary
  textSecondary
  textMuted

  protein
  carbs
  fat
  success
  warning
  destructive

spacing
  1 = 4
  2 = 8
  3 = 12
  4 = 16
  5 = 20
  6 = 24
  8 = 32
  10 = 40

radius
  sm = 10
  md = 14
  button = 16
  card = 20
  xl = 24
  sheet = 28
```

---

# 48. Final BodyCal Visual Rule

The most important design rule is:

> **Black establishes the BodyCal brand. Food photography creates emotion. Macro colors communicate information. Everything else remains quiet.**

That means:

**DO**

```text
White background
Black CTA
Large typography
Realistic food
Generous spacing
Subtle cards
Few meaningful colors
Simple charts
One obvious action
```

**DON'T**

```text
Green primary UI
Neon accents
Heavy gradients
Too many cards
Huge shadows
Crowded dashboards
Bodybuilder artwork everywhere
Complex macro charts
Too many actions per screen
```

This is consistent with the requirement that every BodyCal screen maintain the same header spacing, typography, colors, radii, buttons, icons, navigation, imagery, shadows and margins. 

## Final product feel

**BodyCal = Apple-level simplicity + premium food photography + AI nutrition + black-and-white identity.**

The UI should make calorie tracking feel substantially simpler than traditional nutrition applications, with one clear primary action on each screen. 
