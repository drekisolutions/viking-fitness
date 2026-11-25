import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Stripe Checkout is the WEB-ONLY payment path. Native builds must use
// Google Play Billing / Apple IAP via RevenueCat (see lib/purchases.ts) —
// selling digital subscriptions through an external browser checkout
// violates Google Play's payments policy.
//
// The Edge Function derives the user and price from the JWT + plan key;
// the client never sends priceId, userId, email, or redirect URLs.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type StripePlan = 'monthly' | 'annual';

// Display metadata only — actual Stripe price IDs live server-side.
export const STRIPE_PRICES: Record<StripePlan, {
  amount: number;
  label: string;
  savings: string | null;
}> = {
  monthly: { amount: 14.99, label: '$14.99/mo', savings: null },
  annual:  { amount: 89,    label: '$89/yr',    savings: 'Save 50%' },
};

export async function startCheckout(
  plan: StripePlan
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'web') {
    return {
      success: false,
      error: 'Stripe checkout is only available on the web. Use the in-app upgrade instead.',
    };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'You must be signed in to upgrade.' };
    }

    // Bound the request so a hung network call can't freeze the upgrade flow.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey':        ANON_KEY,
        },
        body: JSON.stringify({ plan }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

    window.location.href = data.url;
    return { success: true };
  } catch (err: any) {
    const message = err?.name === 'AbortError'
      ? 'Checkout timed out. Please try again.'
      : err?.message ?? 'Checkout failed.';
    return { success: false, error: message };
  }
}
