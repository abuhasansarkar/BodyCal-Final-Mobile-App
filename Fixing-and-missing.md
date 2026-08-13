# Reported issues

## 1. App opens on the onboarding goal screen instead of Welcome — FIXED

Startup now resolves through `resolveStartupDestination`, which sends a user with
`onboardingCompleted: false` to `/(public)/welcome`. Covered by
`src/features/onboarding/startup-destination.test.ts`.

## 2.

<!-- Add the next issue here. -->
