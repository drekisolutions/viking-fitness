# Viking Fitness — Build Status

Last updated: 2026-07-09 (branch claude/great-gauss-04189e — Council corrections + Play launch prep)

## ✅ Council review corrections (2026-07-09)
- Play compliance: RevenueCat/Play Billing is now the native payment path (`lib/purchases.ts`);
  Stripe checkout is web-only. Requires EAS build to test (not Expo Go).
- Security: `create-checkout-session` edge function now verifies the JWT, derives user
  server-side, allowlists plans (price IDs are Supabase secrets), fixed redirect URLs.
- Removed duplicate `api/` Vercel routes + `stripe` dep; Supabase edge functions are the backend.
- app.json: removed invalid autoVerify bare-scheme intentFilter; EAS projectId written
  (66b7059a-065b-43d8-aa13-6ffac05ed0e3, owner dreki_solutions).
- Added `/privacy` page, in-app account deletion (+ `delete-account` edge function),
  `revenuecat-webhook` edge function; re-added missing `react-native-worklets` dep.
- **Next:** owner actions in `docs/PLAY-LAUNCH-CHECKLIST.md` (Play Console app, RevenueCat
  project, deploy edge functions/secrets, then EAS production build — paid, needs confirmation).

---

## ✅ Done

### App (Step 1)
- All 6 onboarding screens built and working
- All 5 tab screens built (Home, Training, Nutrition, Progress, Profile)
- BMI + TDEE calculations wired up
- Zustand state management
- NativeWind + Tailwind styling
- Reanimated animations (particles, count-up, fade/slide)
- SVG ring chart and sparklines on Home dashboard
- Fixed: Pressable-wrapping-TextInput bug (profile, body, account screens)
- Fixed: Lucide icon names (House, BarChart2)
- Fixed: react-native-worklets missing dep
- Fixed: newArchEnabled + reanimated version alignment

### GitHub (Step 2)
- Git initialized in project root
- Initial commit made (36 files)
- ⚠️ GitHub repo NOT yet created — needs `gh auth login`

---

## 🔄 In Progress

### GitHub (Step 2)
- `gh` CLI installed (v2.92.0)
- **BLOCKED:** User needs to run `gh auth login` in terminal
- After login: create private repo → push → protect main branch

---

## ⏳ Pending

### Step 3 — Vercel
- `expo export --platform web` → deploy
- Custom domain setup

### Step 4 — Supabase
- Create project
- Schema: users, workouts, food_log, body_measurements, achievements
- Replace mock auth in `app/onboarding/account.tsx` with real Supabase auth
- Add `@supabase/supabase-js` + `expo-secure-store`
- Row Level Security policies

### Step 5 — Stripe
- Web: Stripe Checkout for premium subscriptions
- Mobile: RevenueCat (`react-native-purchases`) → App Store + Play Store products
- Free vs Premium gate in app logic

### Step 6 — PostHog
- Install `posthog-react-native`
- Track: onboarding_completed, subscription_started, workout_logged, food_logged
- Funnel: onboarding → account → premium conversion

### Step 7 — EAS + App Stores
- `npm install -g eas-cli`
- Configure `eas.json` (development, preview, production profiles)
- Apple Developer account setup (bundle ID: com.drekilabs.vikingfitness)
- Google Play Console setup (package: com.drekilabs.vikingfitness)
- `eas build --platform all`
- `eas submit`

---

## Known Issues / Tech Debt
- Auth in `account.tsx` is mock only (sets profile directly in Zustand)
- All dashboard data (workouts, food log, weight) is hardcoded/static
- No persistence — Zustand state resets on app restart (needs AsyncStorage or Supabase)
- Profile photo is a Pexels placeholder URL
- Workout and nutrition data not connected to any real database
