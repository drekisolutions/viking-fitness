import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// RevenueCat (Google Play Billing / Apple IAP) — the ONLY payment path on
// native builds. Google Play policy requires Play Billing for in-app digital
// subscriptions; Stripe Checkout is web-only (see lib/stripe.ts).
//
// The native module does not exist in Expo Go or on web, so it is loaded
// lazily and every entry point degrades gracefully when unavailable.
// Requires an EAS development/production build to actually purchase.

const REVENUECAT_API_KEY = Platform.select({
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
});

export const PREMIUM_ENTITLEMENT = 'premium';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let purchasesModule: typeof import('react-native-purchases').default | null | undefined;

function getPurchases() {
  if (purchasesModule !== undefined) return purchasesModule;
  if (Platform.OS === 'web' || isExpoGo || !REVENUECAT_API_KEY) {
    purchasesModule = null;
    return purchasesModule;
  }
  try {
    purchasesModule = require('react-native-purchases').default;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

/** True when store billing can run: native EAS build with an API key set. */
export function isNativeBillingAvailable(): boolean {
  return getPurchases() !== null;
}

let configured = false;

/** Configure the SDK once, tying purchases to the Supabase user id. */
export async function configurePurchases(appUserID: string): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases) return false;
  if (!configured) {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY!, appUserID });
    configured = true;
  } else {
    await Purchases.logIn(appUserID);
  }
  return true;
}

export type PurchaseResult = {
  success: boolean;
  userCancelled?: boolean;
  error?: string;
};

/**
 * Purchase the premium subscription through the store.
 * plan maps to the default RevenueCat packages: $rc_monthly / $rc_annual.
 */
export async function purchasePremium(
  plan: 'monthly' | 'annual'
): Promise<PurchaseResult> {
  const Purchases = getPurchases();
  if (!Purchases) {
    return {
      success: false,
      error: 'In-app purchases require the App Store / Play Store version of Viking Fitness.',
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering) {
      return { success: false, error: 'No subscription offering is configured.' };
    }

    const pkg =
      plan === 'annual'
        ? offering.annual ?? offering.availablePackages[0]
        : offering.monthly ?? offering.availablePackages[0];
    if (!pkg) {
      return { success: false, error: 'No subscription package is available.' };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] != null;
    return active
      ? { success: true }
      : { success: false, error: 'Purchase completed but entitlement is not active yet.' };
  } catch (err: any) {
    if (err?.userCancelled) {
      return { success: false, userCancelled: true };
    }
    return { success: false, error: err?.message ?? 'Purchase failed.' };
  }
}

/** Restore previous store purchases (required by store guidelines). */
export async function restorePurchases(): Promise<PurchaseResult> {
  const Purchases = getPurchases();
  if (!Purchases) {
    return {
      success: false,
      error: 'Restore is only available in the store version of Viking Fitness.',
    };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const active = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] != null;
    return active
      ? { success: true }
      : { success: false, error: 'No active premium subscription found.' };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Restore failed.' };
  }
}
