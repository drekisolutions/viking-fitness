// Supabase Edge Function — RevenueCat Webhook Handler
// Runs on Deno; deploy with: supabase functions deploy revenuecat-webhook --no-verify-jwt
// Required secrets (set via: supabase secrets set KEY=value):
//   REVENUECAT_WEBHOOK_AUTH    (same value entered as the Authorization header
//                               in RevenueCat → Project → Integrations → Webhooks)
//   SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase)
//   SUPABASE_URL               (auto-injected by Supabase)
//
// Register this URL in the RevenueCat dashboard as:
//   https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//
// Keeps profiles.plan in sync with Play Billing / App Store subscription
// state, the same way the Stripe webhook does for web checkout.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const PREMIUM_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
]);

// CANCELLATION only turns off auto-renew; access lasts until EXPIRATION.
const FREE_EVENTS = new Set(['EXPIRATION']);

const setPlan = async (userId: string, plan: 'premium' | 'free') => {
  const { error } = await supabase
    .from('profiles')
    .update({ plan })
    .eq('id', userId);
  if (error) console.error('setPlan error:', error);
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expected || req.headers.get('Authorization') !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { event } = await req.json();
    const userId: string | undefined = event?.app_user_id;

    // Ignore RevenueCat anonymous ids — purchases are configured with the
    // Supabase user id as app_user_id (see lib/purchases.ts).
    if (userId && !userId.startsWith('$RCAnonymousID:')) {
      if (PREMIUM_EVENTS.has(event.type)) await setPlan(userId, 'premium');
      else if (FREE_EVENTS.has(event.type)) await setPlan(userId, 'free');
      else console.log('Unhandled RevenueCat event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('RevenueCat webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
