# Council Review — Viking Fitness

**Date:** 2026-07-09
**Scope:** Full codebase + Google Play launch readiness (app/, api/, lib/, store/, constants/, components/, hooks/, supabase/functions/, build & store config)
**Reviewed by:** 4 independent judge agents (Sentinel/security, Architect/structure, Market/viability, Executor/delivery) + synthesis
**Out of scope:** iOS submission, web deployment hardening

---

## COUNCIL VERDICT

**COUNCIL SCORE: 34/100 — REJECTED (correction loop required before launch)**

All four judges returned FAIL at CRITICAL severity. The app has a genuinely good funnel, correct nutrition math, and real meal-plan content — but it cannot currently build, would crash on launch if it did build, sells features that don't exist, gates nothing behind the subscription, and its only purchase path violates Google Play policy as configured. None of this is fatal to the product; all of it is fixable in a focused correction pass.

### Critical blockers (must fix, in order)

1. **The app cannot build.** `react-native-worklets` is not installed; Reanimated 4.1.x's babel plugin is a shim that requires `react-native-worklets/plugin`, so every Metro bundle / EAS build fails at babel init. `npx expo-doctor` confirms the missing peer dep. Fix: `npx expo install react-native-worklets`, commit it, prove a bundle with `npx expo export --platform android`.
2. **All four image assets are the same renamed JPEG.** `icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png` are one identical 539 KB JPEG (JFIF header) renamed to `.png`. expo-doctor fails schema validation; Android adaptive icons need real PNG with alpha. Play listing additionally needs a 512px icon + 1024×500 feature graphic (don't exist).
3. **Production builds get no environment variables.** `eas.json` has no `env` blocks, no EAS dashboard env evidence, `.env` is (correctly) gitignored — so EAS builds ship with `EXPO_PUBLIC_SUPABASE_URL` etc. undefined. `lib/supabase.ts:4-5` uses `!` assertions → `createClient(undefined, undefined)` throws at import → instant crash on launch. Fix: `eas env:create` for all five EXPO_PUBLIC vars + replace `!` with a loud startup guard.
4. **Monetization is non-compliant with Google Play as built.** The only purchase path is Stripe Checkout in an external browser (`lib/stripe.ts` → Supabase edge function). For in-app digital subscriptions Play requires Play Billing — OR enrollment in Google's Billing Choice / Expanded Billing Choice program (US since Oct 2025; US/UK/EEA since June 30 2026; worldwide ~Sept 2027) with its UX and reporting requirements. Unenrolled Stripe-only = rejection/takedown. `react-native-purchases` + `react-native-purchases-ui` (RevenueCat, the compliant path) are in package.json but never imported. Decide: (a) wire RevenueCat/Play Billing for Android (globally safe, recommended), or (b) keep Stripe and enroll in Billing Choice, restricting distribution to US/UK/EEA. Note: RevenueCat requires an EAS dev/production build — the "Expo Go SDK 54" target in CLAUDE.md is obsolete either way.
5. **The paywall sells features that don't exist.** `app/onboarding/account.tsx:26-33` advertises "AI meal plans, AI workouts, Progress photos, Full analytics, All ranks" — none are in the codebase (rank is `mockRank`, "real system in Phase 2"). Deceptive-behavior violation + chargeback machine. Paywall copy must describe only what ships. Honest v1 premium: full meal-plan library + GLP-1 protocol (real, in `constants/mealPlans.ts`).
6. **Zero premium gating — the subscription is a donation.** No code anywhere reads `plan === 'premium'`. `enterApp()` receives `plan` and discards it; `UserProfile` has no plan field, so gating is structurally impossible in the UI. Free users, guests, and payers get the identical app. Fix: add `plan` to `UserProfile`, populate from the DB fetch, gate premium surfaces.
7. **Checkout identity is never verified → free premium minting.** `supabase/functions/create-checkout-session/index.ts` trusts client-supplied `userId`/`priceId`/`email`/`successUrl`/`cancelUrl`; never validates the JWT (client even falls back to the public anon key, which passes the gateway). With `trial_period_days: 7` and the webhook granting `premium` on `checkout.session.completed` (fires at trial start, $0 collected), anyone with the anon key can mint premium for any userId. Fix: derive `userId` via `supabase.auth.getUser(token)`, reject mismatches, allowlist priceIds against the two known IDs, allowlist redirect URLs.
8. **No sign-in path exists.** Repo-wide grep: only `signUp` — no `signInWithPassword`, no password reset. A paying subscriber who signs out or switches devices is permanently locked out. Mandatory before charging anyone.
9. **No database schema in the repo.** Zero migrations/SQL. The `profiles` table, its RLS policies, and the row-creation trigger are unversioned and unverifiable (if RLS is missing, any user can rewrite any profile via the anon key). Commit `supabase/migrations/` with schema + RLS.
10. **Rotate live secrets.** Real `sk_live` Stripe secret, webhook secret, and Supabase service-role key sit in `.env` in a Desktop folder (OneDrive sync risk; also now passed through review tooling). Verified never committed to git — but rotate all three and keep server secrets only in Vercel/Supabase secret stores.

### High-priority issues

- **Core tabs are hardcoded mock data presented as the user's own** — Training: 4 static workouts, START is a no-op; Progress: fabricated weight history, PRs, 14-day streak; Profile: "47 Workouts / 3.7 lbs Lost"; Home: calorie ring hardcoded to 0, bell badge always lit. Ship as real minimal features (local workout logger + weight log) or label explicitly as previews.
- **Duplicate payment backend.** Vercel `api/` pair duplicates the Supabase edge functions line-for-line, still deploys (vercel.json), can drift/double-process. The Vercel webhook's `bodyParser: false` config is a Next.js convention that likely doesn't apply under @vercel/node — probably broken anyway. Delete the `api/` pair; move `stripe` (server SDK, v22 vs v14 drift) out of the app's dependencies.
- **Supabase webhook function likely 401s every Stripe delivery.** Edge functions default `verify_jwt = true`; Stripe sends no Supabase JWT. Pin `verify_jwt = false` for the webhook in `supabase/config.toml` and prove a live test event returns 200 — otherwise no customer ever gets upgraded.
- **`expo-secure-store` at 55.0.14 — wrong major for SDK 54** (expects ~15.0.8). Fix via `npx expo install --check` (also takes expo/expo-font/expo-router patches).
- **Guest mode is a data-loss trap.** No store persistence; "Continue without account" profiles evaporate on restart → forced re-onboarding. Add zustand `persist` (AsyncStorage) or remove the guest path.
- **Annual plan is unpurchasable.** `handleContinuePremium` hardcodes the monthly price ID; the $69.99/yr SKU ("Save 42%") is dead code. Add a plan selector or delete it.
- **Success screen races the webhook.** Fixed 2.5s `setTimeout` (uncleared on unmount), polls once, no retry — payers routinely land in-app still `free`. Poll until `plan === 'premium'` or timeout with retry.
- **Unchecked DB writes.** `saveProfileToSupabase` and other `profiles` writes ignore errors; with email confirmation enabled, signUp yields no session, RLS rejects the write silently, user enters app with unsaved profile.
- **Health-app compliance.** GLP-1 medication targeting (Ozempic/Wegovy/Mounjaro, 900–1,200 kcal) triggers Play's Health Apps declaration + Jan 2026 requirements. Need: privacy policy URL (nothing exists), Data Safety form prep (email + health data → Supabase), in-app medical disclaimer.
- **No crash reporting, no CI, zero tests.** Add Sentry (@sentry/react-native), one CI job (`tsc --noEmit` + `expo-doctor`), unit tests for `constants/calculations.ts` first.

### Medium / low (backlog)

- Two Zustand stores hold the same profile fields with a manual sync seam (`initFromProfile`); collapse to one source of truth post-onboarding; extract `lib/profile.ts` with a single `mapDbProfile()` (currently duplicated in index.tsx + success.tsx).
- Meal plan slot calories are static (~1,850/day) and never scale to the user's computed target shown directly above them — two sources of truth.
- setState-in-rAF ring animations (~180 re-renders/sec across 3 rings) and a 16ms setInterval counter — replace with Reanimated (already installed).
- `autoVerify: true` on a custom-scheme intent filter is meaningless (App Links need https + host + assetlinks.json) — remove it.
- Wildcard CORS on checkout creator + client-controlled redirect URLs = phishing primitive (fixed by blocker #7's allowlists).
- Dead weight: MacroRing component, useCountUp, NativeWind/tailwind fully configured with zero className usages, react-native-purchases (until wired).
- Pexels hotlinked images in Training cards — fragile + off-brand.
- Pricing: $9.99/mo / $69.99/yr sits at MacroFactor/MyFitnessPal level without their functionality; 2-3x Hevy/Strong. Launch ~$29–40/yr until food logging + workout tracking are real.
- `.claude/memory/status.md` is stale (2026-05-16) and contradicts the tree (claims worklets fixed). Update or delete.

### Strengths on record

1. `constants/calculations.ts` is correct and clean: exact Mifflin-St Jeor, correct BMI-703, macro splits sum to 100%, GLP-1 clamp (900–1,200 kcal) shows real domain care. Pure, testable, isolated from UI.
2. Meal-plan content is real: 7 plans × 7 rotating options with plausible macros, tips, focus/avoid lists (~490 lines). The GLP-1 companion plan is a sharp, underserved 2026 niche — the app's best wedge.
3. Onboarding funnel is polished, well-animated, conversion-shaped, with clean one-way data flow.
4. Webhook signature verification is correctly implemented in both handlers.
5. `lib/supabase.ts` storage adapter (SecureStore native / guarded localStorage web, lazy require) is a well-executed platform seam.
6. Secrets hygiene in git is right: `.env` never committed anywhere in history; keystore patterns blocked; server keys never got `EXPO_PUBLIC_` prefixes.
7. `npx tsc --noEmit` is fully clean under `strict: true`.

---

## Correction plan (priority order)

**P0 — Unbreak the build (blockers 1–3)**
1. `npx expo install react-native-worklets` + `npx expo install --check` (fixes expo-secure-store major + patch drift); commit.
2. Replace all 4 assets with real PNGs (1024×1024 icon, adaptive foreground with alpha, splash); `npx expo-doctor` until green; produce Play 512px icon + 1024×500 feature graphic.
3. `eas env:create` for the five `EXPO_PUBLIC_*` vars (production); replace `!` assertions in lib/supabase.ts + lib/stripe.ts with loud startup guards.
4. Prove: `npx expo export --platform android` succeeds, then an EAS preview build boots on a device.

**P1 — Security & billing (blockers 4, 7–10)**
5. Rotate Stripe secret key, webhook secret, Supabase service-role key. Remove server secrets from `.env`.
6. Harden create-checkout-session: JWT-derived userId, priceId allowlist, redirect allowlist. Delete Vercel `api/` pair; move `stripe` out of app deps.
7. Pin webhook `verify_jwt = false` in supabase/config.toml; prove a Stripe test event returns 200 and flips `plan`.
8. Commit `supabase/migrations/` (profiles schema + RLS + trigger). Check errors on every profiles write.
9. Add sign-in + password reset screens.
10. Wire RevenueCat (Play Billing) as the Android purchase path; keep Stripe for web only. Configure products in Play Console + RevenueCat dashboard.

**P2 — Product honesty (blockers 5–6 + highs)**
11. Rewrite paywall copy to what ships; gate meal-plan library + GLP-1 protocol behind `plan === 'premium'` (add plan to UserProfile + store).
12. Fix or clearly label mock tabs; minimal real weight log + workout logger if feasible; kill fake streak/PRs/stats.
13. Plan selector (monthly/annual) or delete annual; success-screen polling with retry; zustand persist for guest mode (or remove guest).
14. Add Sentry + CI (tsc, expo-doctor) + calculations tests. Reprice (~$29–40/yr band) until trackers are real.

**P3 — Play submission**
15. Privacy policy (hosted URL) + in-app medical disclaimer (GLP-1/BMI features).
16. Play Console: create app, store listing (screenshots, 512 icon, feature graphic), content rating questionnaire, Data Safety form, Health Apps declaration, target-API compliance (EAS default is fine), closed testing track.
17. Note: personal Play developer accounts created after Nov 2023 require 12 testers for 14 days on closed testing before production access — plan the beta cohort now.
18. `eas build --profile production --platform android` → upload AAB to closed testing → iterate → production rollout.

---

## Full agent verdicts

### AGENT: Sentinel — VERDICT: FAIL, SEVERITY: CRITICAL
Key findings: live sk_live/whsec/service-role secrets in .env (untracked but rotate + relocate); zero auth binding on checkout endpoint (anon key passes gateway; premium minting via trial + webhook); same forgery surface on Vercel api/ with no auth at all; no sign-in path repo-wide; `plan` written but never read; Vercel webhook bodyParser config likely broken under @vercel/node; Supabase webhook likely 401s (verify_jwt default); wildcard CORS + client-controlled redirect URLs; unchecked profiles writes + unverifiable RLS (no schema in repo); 2.5s payment race; stripe server SDK in app deps; no ErrorBoundary; fabricated profile stats.
Commendations: correct webhook signature verification both handlers; SecureStore usage; git secrets hygiene; client never self-grants premium.

### AGENT: Architect — VERDICT: FAIL, SEVERITY: CRITICAL
Key findings: no backend data model in repo (no migrations/SQL/RLS/trigger); checkout identity never verified despite comment claiming it; no state persistence (guest mode = data-loss trap); duplicated payment backend line-for-line; two stores duplicating profile fields with manual sync seam; `plan` never stored client-side (gating structurally impossible); duplicated snake_case mapping + validation blocks; RevenueCat deps never imported while Stripe browser checkout ships; static meal calories vs computed target (two sources of truth); setState-loop animations despite Reanimated; mock data as real user data; uncleared success timeout, single poll; dead code (MacroRing, useCountUp, NativeWind with zero usage); useEffect without dep array in useFrameworkReady; zero tests/CI.
Commendations: calculations.ts correct/clean/pure; supabase.ts platform seam; onboarding one-way data flow.

### AGENT: Market — VERDICT: FAIL, SEVERITY: CRITICAL
Key findings: paywall advertises AI meal plans/AI workouts/progress photos/analytics/ranks — none exist; zero premium gating (subscription = donation); core tabs are hardcoded placeholders shown as user data; billing half-migrated and non-compliant (Stripe permitted only via Billing Choice enrollment in US/UK/EEA as of June 2026, Play Billing mandatory elsewhere until ~Sept 2027); priced at MacroFactor/MFP level ($9.99/mo, $69.99/yr) without their functionality vs Hevy $23.99/yr, Strong $29.99/yr; annual SKU unpurchasable (hardcoded monthly ID); GLP-1 features trigger Health Apps declaration + Jan 2026 requirements with no privacy policy or disclaimer; Pexels hotlinks undercut the premium Norse brand.
Commendations: real meal-plan content; GLP-1 niche is a sharp wedge; onboarding math correct and funnel conversion-shaped.
Sources: Play payments policy 10281818; alt-billing 16497028/17161464; Expanded Billing Choice (June 2026 blog); Stripe support on Play rules; 2026 fitness pricing surveys; Health declaration 14738291.

### AGENT: Executor — VERDICT: FAIL, SEVERITY: CRITICAL
Key findings: react-native-worklets missing → every build fails at babel init (verified); all 4 assets are one renamed JPEG → expo-doctor schema FAIL, adaptive icon invalid, Play assets missing; no EAS env config + `!` assertions → production crash at launch; RevenueCat deps unwired + "Expo Go" target contradiction; Stripe-browser-checkout is the only purchase path; expo-secure-store wrong major (55.x vs ~15.0.8); no privacy policy/Data Safety/Health declaration anywhere; autoVerify meaningless on custom scheme; duplicate backends + stripe server SDK in app deps; no CI/tests/crash reporting (PostHog planned, not installed); stale .claude/memory/status.md contradicting repo state.
Commendations: tsc fully clean under strict; SSR-safe storage shim; secrets/keystore git hygiene.

---

*Report generated by the Council skill (multi-agent review). Correction work is handed to the dedicated Viking Fitness project session.*
