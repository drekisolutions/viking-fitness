import { Platform, Linking } from 'react-native';

const MONTHLY_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID!;
const ANNUAL_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID!;

export const STRIPE_PRICES = {
  monthly: { id: MONTHLY_PRICE_ID, amount: 9.99, label: '$9.99/mo', savings: null },
  annual:  { id: ANNUAL_PRICE_ID,  amount: 69.99, label: '$69.99/yr', savings: 'Save 42%' },
};

export async function startCheckout(
  priceId: string,
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = Platform.OS === 'web'
      ? window.location.origin
      : 'https://viking-fitness-pink.vercel.app';

    const res = await fetch(`${baseUrl}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        userId,
        email,
        successUrl: `${baseUrl}/success`,
        cancelUrl: `${baseUrl}/`,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');

    if (Platform.OS === 'web') {
      window.location.href = data.url;
    } else {
      await Linking.openURL(data.url);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
