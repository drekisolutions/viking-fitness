# Viking Fitness — Google Play Launch Checklist

Last updated: 2026-07-09
Package: `com.drekilabs.vikingfitness` · EAS project: `66b7059a-065b-43d8-aa13-6ffac05ed0e3` (owner `dreki_solutions`)

---

## Part 0 — Council corrections applied (this branch)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | CRITICAL | Stripe browser checkout on Android violates Google Play's payments policy | Native builds now use **RevenueCat / Google Play Billing** (`lib/purchases.ts`); Stripe is **web-only** (`lib/stripe.ts` refuses on native). `react-native-purchases` + `react-native-purchases-ui` added. New `revenuecat-webhook` edge function keeps `profiles.plan` in sync. |
| 2 | HIGH | `create-checkout-session` trusted client-supplied `priceId`, `userId`, `email`, redirect URLs | Function now verifies the JWT (`auth.getUser`), derives user id + email server-side, maps a `plan` key (`monthly`/`annual`) to price IDs held in **server secrets**, and uses server-side constant redirect URLs. Client sends only `{ plan }`. |
| 3 | MEDIUM | `api/` Vercel routes duplicated the Supabase edge functions; server `stripe` SDK in app deps | `api/` deleted, `stripe` removed from `package.json`, `vercel.json` rewrite simplified. Supabase edge functions are the single backend. |
| 4 | LOW | `autoVerify: true` on a bare custom-scheme intent filter | Intent filter block removed — `"scheme": "vikingfitness"` already generates the correct deep-link filter; `autoVerify` is only valid for https App Links. |
| 5 | Play req | No privacy policy URL; no account deletion | Added `/privacy` web route (deploys to `https://viking-fitness-pink.vercel.app/privacy`) and in-app **Profile → Delete account & data** backed by a JWT-verified `delete-account` edge function. |
| — | Build fix | `react-native-worklets` missing from deps (web export failed) | Re-added `react-native-worklets@~0.5.1` per CLAUDE.md. |

**Client env var changes:** `EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID` / `EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID` are no longer read by the client (price IDs are server secrets now). New: `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (and later `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`).

---

## Part 1 — Backend deploys (free, do now)

```bash
# From the project root, linked to the Supabase project:
supabase functions deploy create-checkout-session
supabase functions deploy webhook
supabase functions deploy delete-account
supabase functions deploy revenuecat-webhook --no-verify-jwt   # RC calls it with its own auth header

supabase secrets set \
  STRIPE_MONTHLY_PRICE_ID=price_xxx \
  STRIPE_ANNUAL_PRICE_ID=price_xxx \
  APP_BASE_URL=https://viking-fitness-pink.vercel.app \
  REVENUECAT_WEBHOOK_AUTH=<long-random-string>
```

Redeploy the web app to Vercel afterwards so `/privacy` and the new checkout client go live.

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

## Part 5 — Remaining known gaps (not launch blockers, tracked)

- iOS path: RevenueCat wiring is platform-agnostic, but the App Store app, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, and Apple products are not set up yet.
- No restore-purchases button in the UI yet (`restorePurchases()` exists in `lib/purchases.ts`) — stores expect one; add to Profile before broad release.
- Upgrade path after onboarding: users who start free currently have no in-app upgrade screen; premium purchase only happens during onboarding.
- Dashboard data (workouts, food log, weight) is still hardcoded; fine for internal testing, should be real before production rollout.
