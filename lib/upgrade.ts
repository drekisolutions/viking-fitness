import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
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
// The payment webhook (Stripe or RevenueCat) is the source of truth for
// profiles.plan; the client update here is optimistic so the UI reflects the
// purchase immediately.

export type UpgradeOutcome =
  | { status: 'redirecting' }                 // web: navigating to Stripe
  | { status: 'purchased' }                   // native: entitlement active
  | { status: 'cancelled' }                   // user backed out of the purchase
  | { status: 'unavailable'; message: string } // no compliant path in this build
  | { status: 'error'; message: string };

export async function upgradeToPremium(
  userId: string,
  plan: StripePlan = 'monthly'
): Promise<UpgradeOutcome> {
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
    await supabase.from('profiles').update({ plan: 'premium' }).eq('id', userId);
    return { status: 'purchased' };
  }
  if (result.userCancelled) return { status: 'cancelled' };
  return { status: 'error', message: result.error ?? 'Purchase failed.' };
}

/** Restore a previous store purchase (required by App Store / Play guidelines). */
export async function restorePremium(userId: string): Promise<UpgradeOutcome> {
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
    await supabase.from('profiles').update({ plan: 'premium' }).eq('id', userId);
    return { status: 'purchased' };
  }
  return { status: 'error', message: result.error ?? 'No active subscription found.' };
}
