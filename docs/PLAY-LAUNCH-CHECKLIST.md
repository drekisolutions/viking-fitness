# Viking Fitness — Google Play Launch Checklist

Last updated: 2026-07-09
Package: `com.drekilabs.vikingfitness` · EAS project: `66b7059a-065b-43d8-aa13-6ffac05ed0e3` (owner `dreki_solutions`)

---

## Part 0 — Council corrections applied (this branch)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | CRITICAL | Stripe browser checkout on Android violates Google Play's payments policy | Native builds now use **RevenueCat / Google Play Billing** (`lib/purchases.ts`); Stripe is **web-only** (`lib/stripe.ts` refuses on native). `react-native-purchases` added (custom paywall, so `react-native-purchases-ui` is intentionally not used). New `revenuecat-webhook` edge function keeps `profiles.plan` in sync. |
| 2 | HIGH | `create-checkout-session` trusted client-supplied `priceId`, `userId`, `email`, redirect URLs | Function now verifies the JWT (`auth.getUser`), derives user id + email server-side, maps a `plan` key (`monthly`/`annual`) to price IDs held in **server secrets**, and uses server-side constant redirect URLs. Client sends only `{ plan }`. |
| 3 | MEDIUM | `api/` Vercel routes duplicated the Supabase edge functions; server `stripe` SDK in app deps | `api/` deleted, `stripe` removed from `package.json`, `vercel.json` rewrite simplified. Supabase edge functions are the single backend. |
| 4 | LOW | `autoVerify: true` on a bare custom-scheme intent filter | Intent filter block removed — `"scheme": "vikingfitness"` already generates the correct deep-link filter; `autoVerify` is only valid for https App Links. |
| 5 | Play req | No privacy policy URL; no account deletion | Added `/privacy` web route (deploys to `https://viking-fitness-pink.vercel.app/privacy`) and in-app **Profile → Delete account & data** backed by a JWT-verified `delete-account` edge function. |
| — | Build fix | `react-native-worklets` missing from deps (web export failed) | Re-added `react-native-worklets@~0.5.1` per CLAUDE.md. |

**Client env var changes:** `EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID` / `EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID` are no longer read by the client (price IDs are server secrets now). New: `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (and later `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`).

---

## Part 1 — Backend deploys (free, do now)

**FIRST apply the DB migration** — it creates/locks the `profiles` schema and, critically,
locks the `plan` column to the service role so users can't self-grant premium. Nothing
else is safe to rely on until this is applied:

```bash
supabase db push        # applies all migrations in supabase/migrations/
                        #   20260728000000_profiles_plan_lock.sql     (locks plan)
                        #   20260728000100_generated_plans.sql        (AI plan storage)
                        #   20261120000000_core_tracking_and_glp1.sql (food, water, weight, workouts, GLP-1)
                        #   20261120000100_warband_and_adaptive.sql   (Warbands, boss raids, adaptive TDEE)
```

(Or paste those migration files into the Supabase SQL editor and run them. They are written
to be safe against the existing DB — IF NOT EXISTS / CREATE OR REPLACE throughout.)

Then deploy the functions and set secrets:

```bash
# From the project root, linked to the Supabase project:
supabase functions deploy create-checkout-session
supabase functions deploy webhook --no-verify-jwt              # Stripe signs its own requests
supabase functions deploy delete-account
supabase functions deploy revenuecat-webhook --no-verify-jwt   # RC calls it with its own auth header
supabase functions deploy generate-plan                        # AI meal/workout plans (premium)
supabase functions deploy tactical-adapt                       # AI pivots, salvage meals & NL food parse (premium)

supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_MONTHLY_PRICE_ID=price_xxx \
  STRIPE_ANNUAL_PRICE_ID=price_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  APP_BASE_URL=https://viking-fitness-pink.vercel.app \
  REVENUECAT_WEBHOOK_AUTH=<long-random-string> \
  ANTHROPIC_API_KEY=sk-ant-xxx
# Optional: ANTHROPIC_MODEL=claude-haiku-4-5   (much cheaper/faster than the
# claude-opus-5 default — recommended for consumer-scale generation; see below)
```

`STRIPE_SECRET_KEY` is also read by `delete-account` (to cancel the web subscription when a
user deletes their account). `ANTHROPIC_API_KEY` powers `generate-plan`. Redeploy the web app
to Vercel afterwards so `/privacy`, `/terms`, and the new checkout client go live.

> **AI model / cost:** `generate-plan` defaults to `claude-opus-5` ($5/$25 per 1M tokens). Each
> plan is a small request, but at consumer scale set `ANTHROPIC_MODEL=claude-haiku-4-5`
> ($1/$5) — it's more than capable for structured meal/workout generation. The model is
> env-configurable so you can switch without a redeploy of the app.

---

## Part 2 — Google Play Console (owner action, ~$25 one-time if no account yet)

1. **Developer account** at https://play.google.com/console (Moser Holdings LLC / Dreki Solutions). Identity verification can take a few days — start early.
2. **Create app**: name *Viking Fitness*, default language en-US, type App, Free (with in-app purchases).
3. **Store listing**
   - Short description (≤80 chars) and full description (≤4000 chars).
   - App icon 512×512 PNG, feature graphic 1024×500, ≥2 phone screenshots (take from an EAS build or emulator, not Expo Go).
   - Category: Health & Fitness. Contact email: dreki.solutions@gmail.com.
4. **Privacy policy URL**: `https://viking-fitness-pink.vercel.app/privacy` ✅ (deployed from this branch).
5. **App content declarations**
   - **Content rating questionnaire**: Health & Fitness app; no user-generated content, no violence/gambling — expect *Everyone*.
   - **Target audience**: 18+ (or 13+; app is not designed for children).
   - **Ads**: No ads.
   - **Data safety form** (matches the privacy policy and actual behavior):
     | Question | Answer |
     |---|---|
     | Collects data? | Yes |
     | Personal info | Email address, name — app functionality, account management |
     | Health & fitness | Height, weight, age, sex, activity level, workouts, food logs — app functionality |
     | Financial info | No card data collected by the app (Play Billing / Stripe handle payments) |
     | Purchase history | Collected (subscription status) — app functionality |
     | Data encrypted in transit? | Yes (HTTPS to Supabase) |
     | Can users request deletion? | Yes — in-app (Profile → Delete account & data) and via dreki.solutions@gmail.com |
     | Data shared with third parties? | Service providers only (Supabase, RevenueCat, Stripe on web) — select "No" for sharing as defined by Play (no advertising/analytics sharing) |
   - **Account deletion URL** (required since app supports account creation): use `https://viking-fitness-pink.vercel.app/privacy` (documents both deletion paths).
6. **Monetize → Subscriptions**: create one subscription per plan:
   - `vf_premium_monthly` — $9.99/mo, 7-day free trial (offer phase)
   - `vf_premium_annual` — $69.99/yr, 7-day free trial
   Base-plan IDs are what RevenueCat imports — note them exactly.

---

## Part 3 — RevenueCat (free tier, owner action)

1. Create project **Viking Fitness** at https://app.revenuecat.com.
2. Add **Google Play Store app**, package `com.drekilabs.vikingfitness`.
   - Requires a **Play service-account JSON** (Google Cloud → IAM → service account with Pub/Sub + Play Android Publisher access, invited in Play Console → Users & permissions). RevenueCat's setup wizard walks through it.
3. **Products**: import `vf_premium_monthly` and `vf_premium_annual` from Play.
4. **Entitlement**: create `premium` (must match `PREMIUM_ENTITLEMENT` in `lib/purchases.ts`) and attach both products.
5. **Offering**: `default` offering with packages `$rc_monthly` → vf_premium_monthly and `$rc_annual` → vf_premium_annual (the code looks up `offering.monthly` / `offering.annual`).
6. **API key**: copy the **Google Play public API key** into `.env` as `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, and add the same variable as an EAS secret: `eas env:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value <key> --environment production`.
7. **Webhook**: Integrations → Webhooks → URL `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`, Authorization header = the `REVENUECAT_WEBHOOK_AUTH` secret from Part 1.

---

## Part 4 — EAS build & submit (⚠️ paid/queued steps — confirm before running)

RevenueCat's native module does **not** run in Expo Go — billing can only be tested in these builds.

```bash
# 1. Production AAB for the Play Store (uses remote versionCode)
eas build --platform android --profile production

# 2. First upload MUST be manual: Play Console → Testing → Internal testing →
#    create release → upload the .aab from the EAS build page.
#    (Play requires one manual upload before eas submit can work, and
#    billing products only activate once an AAB with the BILLING permission
#    is on a track.)

# 3. Subsequent uploads can be automated:
eas submit --platform android --profile production   # needs the service-account JSON
```

**Testing order (matters):**
1. Internal testing release live → add tester emails (License testing in Play Console → Settings for test purchases that don't charge).
2. Install from the internal-testing link, sign up, buy premium → verify RevenueCat dashboard shows the purchase and `profiles.plan` flips to `premium` (webhook).
3. Test cancel/expire flows with Play's test-card acceleration; verify plan reverts to `free` on EXPIRATION.
4. Verify account deletion end-to-end.
5. Promote internal → closed/open testing → production. **Note:** new personal Play accounts (post-Nov 2023) need 12+ testers for 14 days on closed testing before production; organization accounts don't.

---

## Part 5 — Blockers surfaced by the adversarial review (owner action)

- **App icon / splash assets are broken (HIGH — do before any store submission).** `assets/icon.png`,
  `adaptive-icon.png`, `splash.png`, and `favicon.png` are all the *same* JPEG file renamed to
  `.png` (JPEG magic bytes, no alpha channel, all 1024×1024, identical md5). Consequences: the
  Android adaptive icon is a full-bleed opaque square that the launcher mask crops at the corners
  (the `#0B0B0D` background never shows), and these files can't be reused for the Play 512×512
  store icon. **Fix requires the real Viking-head art re-exported as true PNGs:** `adaptive-icon.png`
  transparent-background with art inside the ~66% safe zone; `icon.png` a 1024×1024 opaque PNG; a
  real splash graphic; a small favicon. Verify each begins with PNG bytes `89 50 4E 47` before
  committing. (I can't regenerate the art here — it needs the source image.)

## Part 5b — AI features (built) + remaining product work

- ✅ **"AI meal plans" and "AI workouts" are now real** (was the Council's CRITICAL "don't bill
  for unbuilt features" blocker). Implemented via the `generate-plan` edge function (Claude,
  premium-gated server-side) + the `AIPlanCard` on the Nutrition and Training tabs, persisted in
  `generated_plans`. **Requires:** apply the `generated_plans` migration, deploy `generate-plan`,
  and set `ANTHROPIC_API_KEY` (Part 1). Until then the card shows for premium users but generation
  returns a "not configured" message.
- **Validate generation quality on a real build before broad launch.** The prompt + schema are
  solid, but review a handful of real generations for tone/accuracy, and confirm the model tier
  fits your cost target (default `claude-opus-5`; `claude-haiku-4-5` recommended for scale).
- **Wire the core tracking loop to real, persisted data before production.** The free-tier food
  log / dashboards are still hardcoded — fine for internal testing, but the freemium funnel needs
  a real logging floor before a wide rollout.

## Part 6 — Remaining known gaps (not launch blockers, tracked)

- iOS path: RevenueCat wiring is platform-agnostic, but the App Store app, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, and Apple products are not set up yet. The iOS paywall also needs Apple's standard EULA link (or your own) — `/terms` covers the custom-EULA requirement.
- RevenueCat webhook trusts the client-set `app_user_id` as the profiles key (gated by the shared secret). Low risk (griefing only), documented inline in `supabase/functions/revenuecat-webhook/index.ts`. Harden later with a stored RevenueCat↔user mapping + event-id idempotency.
- Webhooks are idempotent (absolute state) but have no out-of-order/event-id guard — fine for internal testing, add an event ledger before production scale.
- No dedicated sign-IN screen (account screen only does `signUp`); returning unconfirmed-email users have no login path.
- Dashboard data (workouts, food log, weight) is still hardcoded; fine for internal testing, should be real before production rollout.

### Resolved by Council review round 2 (2026-07-28)
- ✅ **Free-premium hole closed** — `plan` is no longer written by the client; a DB migration
  (`supabase/migrations/20260728000000_profiles_plan_lock.sql`) locks the column to the service
  role. **Must apply the migration (Part 1) for this to take effect.**
- ✅ Schema-as-code — `profiles` table + RLS now committed as a migration (was live-only).
- ✅ Webhooks return 5xx on DB-write failure so Stripe/RevenueCat retry (was silently 200).
- ✅ Account deletion now cancels the active Stripe subscription (was leaving it billing).
- ✅ `bmi` now rehydrates on cold start (was showing "—" for returning users).
- ✅ Onboarding card uses the shared price + localized native price (was hardcoded USD).
- ✅ Purchase fails closed on term mismatch; constant-time webhook secret compare; checkout fetch timeout; `.env.example` + CI workflow added; shared `setPlan` extracted.
- ⚠️ **Deploy correction:** the Stripe `webhook` must ALSO deploy with `--no-verify-jwt` (Stripe sends a signature, not a Supabase JWT) — see Part 1.

### Resolved by the review pass (2026-07-09)
- ✅ Restore-purchases button — added to Profile (native) and the paywall.
- ✅ Post-onboarding upgrade path — `app/upgrade.tsx` paywall reachable from Profile.
- ✅ Subscription legal compliance — auto-renewal disclosure + Terms of Use (`/terms`) + Privacy Policy links now on both purchase surfaces; privacy policy reachable in-app (Profile → Privacy & Security).
- ✅ Guest purchase guard — guests can no longer trigger an orphaned store charge.
- ✅ Email-confirmation signup no longer silently discards the profile.
- ✅ Native paywall shows the localized Play/Apple price; edge functions return generic errors and use an explicit plan allowlist.
