# Viking Fitness — Build Status

Last updated: 2026-07-29 (branch claude/great-gauss-04189e — GitHub step completed, PR #1 merged to master)

## ✅ GitHub step complete (2026-07-29, this session)
- Owner ran `gh auth login` (account drekisolutions). Repo already existed from a prior
  session: **drekisolutions/viking-fitness**, private, default branch `master`; both
  branches were already pushed and in sync.
- **PR #1** (claude/great-gauss-04189e → master; 7 commits, +2741/−301, 36 files — all the
  Play-Billing/checkout/adversarial-review/Council-round-2/AI-features work) was green
  (CI: tsc + web export SUCCESS) and cleanly mergeable. **Merged to master** with a merge
  commit (359d0b2) at owner's direction.
- **Branch protection NOT enabled:** GitHub's free plan blocks protection rules on private
  repos (403 "Upgrade to Pro or make public"). Owner decision — upgrade to GitHub Pro,
  make the repo public, or rely on PR-workflow discipline. Not actionable from the CLI.
- **Next in pipeline:** Step 3 Vercel (`expo export --platform web` → deploy) and Step 4
  Supabase (apply migrations + deploy edge functions/secrets) — both still owner-auth-gated.

## ✅ Sign-in screen + profiles-row persistence fix (2026-07-29, this session)
- Built `app/signin.tsx` (email/password via `signInWithPassword`) and wired it into the
  onboarding welcome "Sign In" link and a new link on the account (sign-up) screen. Detects
  the "email not confirmed" error and offers to resend the confirmation link — **closes the
  known gap** where a returning, unconfirmed user had no login path.
- **Critical bug fixed:** nothing ever created a `profiles` row (no on-signup trigger;
  `account.tsx` + the payment webhook both used UPDATE → 0 rows on a missing row). Free
  sign-ups persisted nothing, and a premium purchase would have **stranded the payer on
  free**. `account.tsx` now **upserts** the row; `plan` stays service-role-locked via the
  `lock_plan_column` trigger, so the client still can't self-grant premium. NOTE: still
  needs the profiles migration applied (`supabase db push`) for the row/RLS/trigger to exist.
- Refactored the DB→client profile mapping (was duplicated 3×) into `lib/session.ts`
  (`fetchAppProfile`), now shared by `index.tsx`, `success.tsx`, `signin.tsx`.
- Commit 1dcf959. tsc + web export clean; `/signin` bundles.
- Follow-ups: forgot-password (needs a reset-completion screen + deep-link/Site-URL config);
  optional `handle_new_user` DB trigger as defense-in-depth for the profiles row.

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

## ✅ AI features built (2026-07-28)
- User chose to BUILD the AI features (resolving the Market blocker). Implemented:
  - `supabase/functions/generate-plan/index.ts` — Claude (default `claude-opus-5`, env
    `ANTHROPIC_MODEL`) via the official SDK (`npm:@anthropic-ai/sdk`), structured JSON output,
    JWT-verified + **premium-gated server-side**, persists to new `generated_plans` table
    (migration 20260728000100). Needs `ANTHROPIC_API_KEY` secret.
  - `lib/ai.ts` (generatePlan/getLatestPlan + types) and `components/AIPlanCard.tsx` (premium
    gate → /upgrade when free; generate/regenerate; renders meal & workout plans). Dropped into
    `app/(tabs)/nutrition.tsx` (meal) and `training.tsx` (workout).
  - Model is env-configurable; recommend `claude-haiku-4-5` for consumer-scale cost.
  - tsc + web export clean. Deploy steps in docs/PLAY-LAUNCH-CHECKLIST.md Part 1.
  - Still hardcoded/not-built: the free-tier food log + dashboards (real persistence pending).

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

### GitHub (Step 2) — ✅ COMPLETE (2026-07-29)
- Private repo drekisolutions/viking-fitness created and pushed
- PR #1 merged to master (merge commit 359d0b2); CI green
- Branch protection blocked by GitHub free plan (owner decision — see top section)

---

## 🔄 In Progress

_(GitHub step done — see top section. Next: Vercel + Supabase deploys, both owner-auth-gated.)_

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
- Auth is real Supabase now: signUp on `account.tsx`, signIn on `signin.tsx`. The
  "no dedicated sign-IN screen" gap is CLOSED (2026-07-29).
- All dashboard data (workouts, food log, weight) is hardcoded/static
- No persistence — Zustand state resets on app restart (needs AsyncStorage or Supabase)
- Profile photo is a Pexels placeholder URL
- Workout and nutrition data not connected to any real database
