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

## ✅ Post-review hardening (2026-07-09, opus session)
- Added post-onboarding paywall (`app/upgrade.tsx`), restore-purchases, and a client
  `plan` field hydrated on start/success/onboarding.
- Ran an adversarial multi-agent review (5 dimensions, per-finding verification): 13
  confirmed findings, 11 fixed in code, commit 3389030. Fixes: subscription legal
  disclosure + Terms(`/terms`)/Privacy links at point of purchase, in-app privacy
  reachability, guest-purchase guard, email-confirmation session guard, native RC price
  display, `__proto__` allowlist, generic edge errors, missing catch handlers.
- **OPEN HIGH (owner):** `assets/*.png` are all one JPEG renamed to .png (no alpha) —
  Android adaptive icon renders cropped/broken. Needs the real Viking-head art re-exported
  as true PNGs before store submission. See checklist Part 5.
- Known gap: app has no dedicated sign-IN screen (only signUp on the account screen); if
  Supabase email-confirmation is enabled, a returning unconfirmed user has no login path.

## ✅ Council review round 2 (2026-07-28, commit c5ed880) — scored 62→~77/100
- Ran the /council skill (Sentinel/Architect/Market/Executor + Synthesizer) on the payment
  change set. Fixed code-side blockers/highs:
  - **Free-premium hole closed**: client no longer writes profiles.plan; added migration
    supabase/migrations/20260728000000_profiles_plan_lock.sql locking `plan` to service role
    (trigger). **MUST run `supabase db push` for it to take effect.**
  - Webhooks now return 5xx on DB-write failure (Stripe/RC retry); shared setPlan in
    functions/_shared/plan.ts. delete-account cancels the Stripe sub. bmi rehydrates.
    purchasePremium fails closed; constant-time secret compare; checkout fetch timeout;
    .env.example + CI workflow; account.tsx uses shared/native price.
  - **Deploy correction:** the Stripe `webhook` must also deploy with `--no-verify-jwt`.
- **Escalated (owner):** Market flagged the paywall sells unbuilt "AI meal plans / AI workouts"
  (status.md: not implemented, core loop hardcoded) — store-rejection/refund risk. Decision
  needed: build them or remove the claims. Did NOT change marketing copy unilaterally. Also:
  apply migration + deploy (needs Supabase auth), icon art (needs source).

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
