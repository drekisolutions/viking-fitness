// Shared plan-writer for the Stripe and RevenueCat webhooks.
// profiles.plan is the revenue gate and may ONLY be written by the service
// role (enforced in the DB by the lock_plan_column trigger — see
// supabase/migrations). Both webhooks use this single implementation.

import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/**
 * Set profiles.plan for a user. THROWS on failure so the webhook handler can
 * return a non-2xx status and let Stripe / RevenueCat retry delivery — silently
 * swallowing the error would strand a paying customer on the free plan.
 */
export async function setPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: 'premium' | 'free'
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ plan })
    .eq('id', userId);
  if (error) {
    throw new Error(`setPlan(${userId}, ${plan}) failed: ${error.message}`);
  }
}
