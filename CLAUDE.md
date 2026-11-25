# Viking Fitness — Claude Project

Norse-themed fitness & nutrition SaaS mobile app built with React Native + Expo.

**Company:** Dreki Solutions (Moser Holdings LLC)
**Memory files:** `.claude/memory/` — read `project.md` and `status.md` at session start.

## Quick Context

- Expo SDK 58, Expo Router 58, NativeWind v4, Zustand, Reanimated 4.7.x
- Target runtime: **Expo SDK 58** (development / EAS build)
- Always use `npm install --legacy-peer-deps`
- New Architecture is always enabled in Expo SDK 55+ (`newArchEnabled` removed from `app.json`)
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
