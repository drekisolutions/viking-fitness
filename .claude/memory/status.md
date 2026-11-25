# Viking Fitness — Build Status

Last updated: 2026-11-22 (branch `master` — Live backend, web deploy, webhooks, EAS builds & Play automation ready)

## ✅ Launch Infrastructure & Store Wiring (2026-11-22)
- **Supabase (`dcjumiwseyisfwnmario`):** https://dcjumiwseyisfwnmario.supabase.co — All 5 migrations applied (including `20261120000200_fix_warband_rls.sql`), 12 tables verified `200 OK`, all 6 Edge Functions `ACTIVE`, and all 7 secrets set (`ANTHROPIC_API_KEY`, `APP_BASE_URL`, `REVENUECAT_WEBHOOK_AUTH`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- **Vercel Web Production:** https://viking-fitness-sepia.vercel.app (`/`, `/privacy`, `/glp1`, `/warband` verified `200 OK`). `.vercelignore` excludes local keys, certs, and mobile binaries.
- **Stripe Live Webhook:** Destination `we_1Ue3N6PoN0MD3e7C9h3F2nOY` (`Active`, 6 subscription/invoice events) wired to `/functions/v1/webhook`.
- **RevenueCat (`13dc37e5` / `appfccea8e249`):** Google Play app (`com.vikingfitness.myapp`), `premium` entitlement (`entla5fd6fca25`), `default` offering (`ofrng09cac5d7c4`), webhook (`Active`, `200 OK` test), GCP service account (`viking-fitness-515410` + RTDN topic `projects/viking-fitness-515410/topics/Play-Store-Notifications`).
- **EAS Builds & Automated Play Submit (`eas.json`):** Internal `.apk` `463af193-ca31-479a-92a0-6311a2af21b2` finished; Production `.aab` `v1.0.20` (`10020`, `com.vikingfitness.myapp`) build `c34bcf70-2ea4-474a-b692-5d7544d2b6f7` finished (`viking-fitness-v1_0_20.aab`). `eas submit` configured (`viking-fitness-515410-0537c2794f45.json`, `track: internal`, `releaseStatus: draft`).
- **Pending Play Upload Key Activation:** Upload Key Reset to `97:97:20:BD:EE:91:51:84:E7:0B:51:EB:3F:8A:D2:54:F4:FD:52:C4` activates **Nov 24, 2026 at 7:03 PM UTC (2:03 PM EST)**; afterwards run `eas submit`, create Play subscriptions (`vf_premium_monthly` / `vf_premium_annual`), and import into RevenueCat.

## ✅ Phase 2 Competitive Wedges (2026-11-20)
- **Iron ↔ Rations + Adaptive TDEE (`constants/adaptive.ts`, Progress/Home/Nutrition/Training):** Zero-API-cost 21-day EMA-based metabolic estimator (`calculateAdaptiveTDEE` with ±150 kcal weekly step check-ins) + closed-loop training/nutrition coupling (`getIronRationsCoupling`: heavy-lift carb refuel bumps suppressed on GLP-1 Peak days, plus 2/3-day Low-Rations recovery guard).
- **Battlefield Tactical Adaptations (`constants/tacticalFallback.ts`, `lib/tactical.ts`, `supabase/functions/tactical-adapt/index.ts`):** 1-tap `Pivot Today's Battle` (`25 Min Rush`, `Hotel / DB Only`, `Low Energy`, `Back-Safe`, `Busy Gym`), `Salvage My Day` 3-option macro rescue, and `Text / Mic` multi-food natural-language parser (instant offline tactical engines + Premium Claude enhancement).
- **Anti-Fragile Warband Raids (`constants/warband.ts`, `app/warband.tsx`, `supabase/migrations/20261120000100_warband_and_adaptive.sql`):** Weekly rotating Norse boss raids, bodyweight-normalized squad damage, 6-char invite-code co-op Warbands (2–5 friends), Shield Wall Passes (`1–3` stored) so illness/travel never breaks consistency, and bodyweight-ratio Strength Standards (`Thrall → Odinborn`).
- **Pending Owner Deploy:** Run `supabase db push` (`20261120000000_core_tracking_and_glp1.sql` + `20261120000100_warband_and_adaptive.sql`) and deploy `generate-plan` + `tactical-adapt`.

## ✅ Phase 0 + Phase 1 + GLP-1 Muscle Armor v1 (2026-11-20)
- **Git & Hygiene:** Fast-forwarded `master` (`359d0b2`) and merged `claude/great-gauss-04189e` (`e278be4`) cleanly; ignored local `.vercel`, `*.aab`, `*.apk`, `*.der` files.
- **Assets & Dependencies:** Re-exported `icon.png`, `adaptive-icon.png`, `splash.png`, and `favicon.png` as true PNGs (`89 50 4E 47`) with real RGBA alpha channels on adaptive/splash/favicon. Added `@react-native-async-storage/async-storage@2.2.0` and aligned `expo-secure-store@~15.0.8`.
- **Hardening Fixes:** Added `[]` dep array in `useFrameworkReady.ts`; guarded missing env vars in `lib/supabase.ts`; checked `profiles.upsert` errors in `account.tsx`; added retry polling + fallback button in `success.tsx`; updated `generate-plan` to `claude-haiku-4-5`, tool-use JSON output, 5/day per-user rate limit, and live GLP-1 context; updated `privacy.tsx` for Anthropic/Open Food Facts + GLP-1 disclaimer; aligned paywall copy to shipped features.
- **Real Core Tracking Loop:** Added persisted Zustand stores (`store/user.ts`, `store/onboarding.ts`, `store/tracker.ts`) + Supabase schema (`supabase/migrations/20261120000000_core_tracking_and_glp1.sql`) with RLS. Replaced all mock data across Home, Training (`app/workout-session.tsx` with stopwatch, rest timer, PR detection), Nutrition (real food diary, Quick Shield curated list, Open Food Facts search & UPC barcode lookup, scaled Meal Plan logging), Progress (EMA trend weight, real 1RM/relative strength PRs, Muscle Armor score, weekly campaign), and Profile (monogram crest, target/plan editors).
- **GLP-1 Muscle Armor (`app/glp1.tsx`, `constants/glp1.ts`):** Bateman 1-compartment multi-dose pharmacokinetic wave chart, least-recently-used injection site rotation, 7-day Peak/Cruise/Rebound calorie + Protein Shield + workout volume cycling, Muscle Armor Index (0–100), and Premium Reverse-Diet & Taper Off-Ramp.
- **Tests & CI:** Added `tests/calculations.test.ts` and `tests/glp1.test.ts` (run with `node --test tests/*.test.ts` in CI).
- **Pending Owner Deploy:** Run `supabase db push` (applies `20261120000000_core_tracking_and_glp1.sql` + prior migrations) and redeploy `generate-plan` + `delete-account`, then deploy web/EAS.

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

## ✅ Pricing, Auth Recovery, Analytics & iOS Config (2026-11-24)
- **Pricing updated to $14.99/mo and $89/yr:** Live Stripe product `Viking Fitness Premium` (`prod_VgqV6Ke31s3Lti`) + prices (`price_1UfSosPoN0MD3e7CWy0NHSNP` / `price_1UfSotPoN0MD3e7CPKrbvMpB`) created, Supabase production secrets (`STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`) updated, and `lib/stripe.ts`, `app/terms.tsx`, `docs/PLAY-LAUNCH-CHECKLIST.md`, `.env` updated.
- **Forgot / Reset Password:** Added `app/forgot-password.tsx`, `app/reset-password.tsx`, `Forgot password?` link on `app/signin.tsx`, and `detectSessionInUrl: Platform.OS === 'web'` in `lib/supabase.ts`.
- **Paywall Accuracy:** Removed un-gated Muscle Armor/analytics claims from `app/upgrade.tsx`, `app/onboarding/account.tsx`, and `app/(tabs)/profile.tsx` so paywall copy matches server/client-gated features.
- **PostHog Analytics:** Installed `posthog-react-native` and wired `lib/analytics.ts` (`initAnalytics`, `identifyUser`, `trackEvent` for `onboarding_completed`, `sign_in`, `subscription_checkout_started`, `subscription_started`, `food_logged`, `workout_logged`). Set `EXPO_PUBLIC_POSTHOG_API_KEY` to enable.
- **iOS Config:** Added `ios.buildNumber` (`"1"`) and `ios.infoPlist` (`ITSAppUsesNonExemptEncryption: false`, `NSCameraUsageDescription`) to `app.json`.
- **Remaining Store Console Actions:**
  1. **Play Upload Key:** `eas submit` returned HTTP 403 (`97:97:...` vs expected `71:16:...`). Wait for Play upload key reset propagation or re-check Play Console → App Integrity, then re-run `eas submit -p android --profile production`.
  2. **Play Subscriptions & RevenueCat:** Service account lacks Play Console financial/store-presence permission (`403` on `POST /subscriptions`). Create `vf_premium_monthly` ($14.99/mo) and `vf_premium_annual` ($89/yr) in Play Console UI and import into RevenueCat.
  3. **iOS Build & App Store Connect:** Run `eas build --platform ios --profile production` (requires Apple Developer account) and configure App Store Connect + RevenueCat iOS app.
