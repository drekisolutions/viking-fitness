import { Platform, Linking } from 'react-native';
import { supabase } from '@/lib/supabase';

// Supabase Edge Functions handle all Stripe server-side logic
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Web deployment base URL for Stripe redirects on web
const WEB_BASE_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://viking-fitness-pink.vercel.app';

export const STRIPE_PRICES = {
  monthly: {
    id:      process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
    amount:  9.99,
    label:   '$9.99/mo',
    savings: null,
  },
  annual: {
    id:      process.env.EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID!,
    amount:  69.99,
    label:   '$69.99/yr',
    savings: 'Save 42%',
  },
};

export async function startCheckout(
  priceId: string,
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use the logged-in user's JWT so the Edge Function can verify identity
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token ?? ANON_KEY;

    // Native uses a deep link so the OS re-opens the app after payment.
    // Web uses a normal HTTPS URL so Stripe's browser redirect works.
    const successUrl = Platform.OS === 'web'
      ? `${WEB_BASE_URL}/success`
      : 'vikingfitness://success';
    const cancelUrl = Platform.OS === 'web'
      ? `${WEB_BASE_URL}/`
      : 'vikingfitness://onboarding/account';

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey':        ANON_KEY,
      },
      body: JSON.stringify({ priceId, userId, email, successUrl, cancelUrl }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

    if (Platform.OS === 'web') {
      window.location.href = data.url;
    } else {
      // Opens Stripe Checkout in the system browser.
      // After payment Stripe redirects to vikingfitness://success
      // which re-opens this app via the registered URL scheme.
      await Linking.openURL(data.url);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
