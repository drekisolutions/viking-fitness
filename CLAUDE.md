# Viking Fitness — Claude Project

Norse-themed fitness & nutrition SaaS mobile app built with React Native + Expo.

**Company:** Dreki Solutions (Moser Holdings LLC)
**Memory files:** `.claude/memory/` — read `project.md` and `status.md` at session start.

## Quick Context

- Expo SDK 54, Expo Router 6, NativeWind v4, Zustand, Reanimated 4.1.x
- Target runtime: **Expo Go SDK 54**
- Always use `npm install --legacy-peer-deps`
- `newArchEnabled: true` required (reanimated 4.x needs New Architecture)
- `react-native-worklets` must stay as an explicit dependency

## File Structure

```
app/                  Expo Router screens
  (tabs)/             Main tab navigator
  onboarding/         6-screen onboarding flow
components/ui/        Button, Card, ProgressBar, MacroRing
constants/            theme.ts, calculations.ts
store/                onboarding.ts, user.ts (Zustand)
hooks/                useFrameworkReady.ts
```

## Deploy Pipeline

1. Build (done) → 2. GitHub → 3. Vercel → 4. Supabase → 5. Stripe → 6. PostHog → 7. EAS/Stores

## Current Blocker

GitHub step needs `gh auth login` run in terminal to proceed.
