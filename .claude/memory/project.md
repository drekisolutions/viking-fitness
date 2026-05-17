# Viking Fitness App

**Company:** Dreki Solutions (under Moser Holdings LLC)
**Local path:** `C:\Users\longb\Desktop\Moser Holdings LLC\Dreki Solutions\SaaS\Viking Fitness`
**Type:** React Native mobile app + web (Expo)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Routing | Expo Router 6.x (file-based) |
| Styling | NativeWind v4 + Tailwind CSS |
| State | Zustand |
| Animations | Reanimated 4.1.x + react-native-worklets |
| Icons | Lucide React Native 0.475.x |
| Fonts | BebasNeue (display), Oswald (headings), Inter (body) |
| Backend | Supabase (planned) |
| Payments | Stripe web + RevenueCat mobile (planned) |
| Analytics | PostHog (planned) |
| CI/CD | EAS Build + EAS Submit (planned) |

---

## Design System

```
colors.black      = #0B0B0D   (background)
colors.surface    = #1A1C1F   (cards)
colors.border     = #2A2D32
colors.frost      = #D9E1E8   (primary text)
colors.blue       = #4BA3FF   (primary action)
colors.gold       = #D6A756   (premium / rank)
colors.red        = #A12727   (danger)
colors.muted      = #5A6070   (secondary text)
```

Fonts: `fonts.display`, `fonts.heading`, `fonts.headingLight`, `fonts.body`, `fonts.bodyMedium`
Radius: `radius.sm=12`, `radius.md=18`, `radius.lg=24`, `radius.full=999`

---

## App Architecture

### Screens
```
app/
  index.tsx                  → redirects: onboarding or (tabs)
  _layout.tsx                → root: loads fonts, splash
  +not-found.tsx
  onboarding/
    index.tsx                → splash + welcome + ember particles
    profile.tsx              → name, age, sex
    body.tsx                 → height, weight, activity level
    goal.tsx                 → cut/build/recomp/maintain + meal plan
    results.tsx              → animated BMI + calorie reveal
    account.tsx              → auth (mock) + free vs premium
  (tabs)/
    index.tsx                → home dashboard (ring chart, macros, quests)
    training.tsx             → workout splits + cards
    nutrition.tsx            → food log + macro progress bars
    progress.tsx             → weight chart + measurements + PRs
    profile.tsx              → settings + targets + sign out
```

### State (Zustand stores)
- `store/onboarding.ts` — name, age, sex, height, weight, activity, goal, mealPlan, bmi, calories, macros
- `store/user.ts` — UserProfile (id, email, onboardingComplete, etc.)

### Key Constants
- `constants/theme.ts` — colors, fonts, radius
- `constants/calculations.ts` — calculateBMI(), calculateTDEE() Mifflin-St Jeor, getCalorieTarget(), getMacros()

---

## Product Model

**Free tier:** meal tracking, macro tracking, basic workouts, Warrior ranks I–II
**Premium ($9.99/mo):** AI meal plans, AI workouts, progress photos, full analytics, all ranks

**Rank system:** Thrall → Raider → Berserker → Jarl → Warchief → Odinborn

---

## Deploy Pipeline (standard for all Dreki Solutions apps)

1. **Build** — Bolt.new + Claude for scaffolding, iterate locally
2. **GitHub** — Private repo, `main` protected
3. **Vercel** — `expo export --platform web`, custom domain
4. **Supabase** — Auth + PostgreSQL + RLS
5. **Stripe** — Web billing direct; mobile via RevenueCat
6. **PostHog** — Events, funnels, feature flags
7. **EAS** — iOS + Android builds → App Store + Play Store

---

## Critical Dev Notes

- `newArchEnabled: true` in app.json (required for reanimated 4.x)
- `react-native-worklets` must be explicit dep (reanimated 4.x peer)
- **Never** wrap `TextInput` in `<Pressable onPress={Keyboard.dismiss}>` — kills focus
- Expo Go SDK 54 is the target device runtime
- Always `npm install --legacy-peer-deps`
- Icons: use `House` (not `Home`), `BarChart2` (not `ChartBar`)
