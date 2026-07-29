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

import { createServiceClient, setPlan } from '../_shared/plan.ts';

const supabase = createServiceClient();

const PREMIUM_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
]);

// CANCELLATION only turns off auto-renew; access lasts until EXPIRATION.
const FREE_EVENTS = new Set(['EXPIRATION']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Constant-time string comparison so the shared-secret check does not leak the
// secret through response timing.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const provided = req.headers.get('Authorization') ?? '';
  if (!expected || !timingSafeEqual(provided, expected)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Parse the payload separately from processing so a malformed body is a 400
  // (do not retry) while a DB write failure is a 500 (RevenueCat retries).
  let event: any;
  try {
    ({ event } = await req.json());
  } catch {
    return json({ error: 'Invalid webhook payload' }, 400);
  }

  try {
    const userId: string | undefined = event?.app_user_id;

    // NOTE: app_user_id is set client-side (lib/purchases.ts) and is trusted
    // here as the profiles key. This is gated by the shared webhook secret, so
    // it is not anonymously exploitable, but a determined user who knows a
    // victim's Supabase UUID and spends real money could target that row.
    // Low risk (griefing only). Harden later: persist the RevenueCat customer
    // ↔ user mapping at purchase time and reconcile, plus event-id idempotency.
    //
    // Ignore RevenueCat anonymous ids — purchases are configured with the
    // Supabase user id as app_user_id (see lib/purchases.ts).
    if (userId && !userId.startsWith('$RCAnonymousID:')) {
      if (PREMIUM_EVENTS.has(event.type)) await setPlan(supabase, userId, 'premium');
      else if (FREE_EVENTS.has(event.type)) await setPlan(supabase, userId, 'free');
      else console.log('Unhandled RevenueCat event type:', event.type);
    }

    return json({ received: true });
  } catch (err: any) {
    // DB write failed — return 5xx so RevenueCat retries rather than dropping
    // the subscription state change.
    console.error('RevenueCat webhook handler error:', err.message);
    return json({ error: 'Handler failed; will retry' }, 500);
  }
});
