import { Platform } from 'react-native';
import { startCheckout, type StripePlan } from '@/lib/stripe';
import {
  configurePurchases,
  isNativeBillingAvailable,
  purchasePremium,
  restorePurchases as restoreNativePurchases,
} from '@/lib/purchases';

// Single compliant upgrade path shared by onboarding (account.tsx) and the
// post-onboarding paywall (app/upgrade.tsx):
//   web    → Stripe Checkout (page redirects away)
//   native → Google Play Billing / Apple IAP via RevenueCat
//   otherwise (Expo Go / no key) → unavailable, caller shows a message
//
// The payment webhook (Stripe or RevenueCat) is the SOLE writer of
// profiles.plan — the client never writes that column (it is locked to the
// service role via RLS; see supabase/migrations). The UI reflects the purchase
// immediately from the local Zustand store, and the DB catches up when the
// webhook fires.

export type UpgradeOutcome =
  | { status: 'redirecting' }                 // web: navigating to Stripe
  | { status: 'purchased'; plan: 'premium' | 'pro' } // native: entitlement active
  | { status: 'cancelled' }                   // user backed out of the purchase
  | { status: 'unavailable'; message: string } // no compliant path in this build
  | { status: 'error'; message: string };

// Guests ('Continue without account') get a throwaway 'guest-<ts>' id that
// exists nowhere server-side. Charging them via the store would orphan the
// entitlement to an id the webhook can never reconcile and the plan would be
// lost on next launch — so a real, signed-in account is required first.
const NEEDS_ACCOUNT_MESSAGE =
  'Create a free account to subscribe — your purchase must be tied to your account so it syncs across devices.';

function isRealAccount(userId: string): boolean {
  return !!userId && !userId.startsWith('guest-');
}

export async function upgradeToPremium(
  userId: string,
  plan: StripePlan = 'monthly'
): Promise<UpgradeOutcome> {
  if (!isRealAccount(userId)) {
    return { status: 'unavailable', message: NEEDS_ACCOUNT_MESSAGE };
  }

  if (Platform.OS === 'web') {
    const result = await startCheckout(plan);
    return result.success
      ? { status: 'redirecting' }
      : { status: 'error', message: result.error ?? 'Checkout failed.' };
  }

  if (!isNativeBillingAvailable()) {
    return {
      status: 'unavailable',
      message:
        'Upgrading requires the App Store / Play Store version of Viking Fitness.',
    };
  }

  const configured = await configurePurchases(userId);
  if (!configured) {
    return {
      status: 'unavailable',
      message: 'In-app purchases are not available in this build.',
    };
  }

  const result = await purchasePremium(plan);
  if (result.success) {
    // profiles.plan is set by the RevenueCat webhook (service role); the caller
    // updates the local store so the UI reflects the tier immediately.
    return { status: 'purchased', plan: result.plan ?? (plan.startsWith('pro_') ? 'pro' : 'premium') };
  }
  if (result.userCancelled) return { status: 'cancelled' };
  return { status: 'error', message: result.error ?? 'Purchase failed.' };
}

/** Restore a previous store purchase (required by App Store / Play guidelines). */
export async function restorePremium(userId: string): Promise<UpgradeOutcome> {
  if (!isRealAccount(userId)) {
    return { status: 'unavailable', message: NEEDS_ACCOUNT_MESSAGE };
  }

  if (Platform.OS === 'web') {
    return {
      status: 'unavailable',
      message: 'Restore is only available in the app version of Viking Fitness.',
    };
  }
  if (!isNativeBillingAvailable()) {
    return {
      status: 'unavailable',
      message: 'Restore requires the App Store / Play Store version of Viking Fitness.',
    };
  }

  await configurePurchases(userId);
  const result = await restoreNativePurchases();
  if (result.success) {
    // profiles.plan is reconciled by the RevenueCat webhook (service role).
    return { status: 'purchased', plan: result.plan ?? 'premium' };
  }
  return { status: 'error', message: result.error ?? 'No active subscription found.' };
}
