// Supabase Edge Function — Stripe Checkout Session Creator (web only)
// Runs on Deno; deploy with: supabase functions deploy create-checkout-session
// Required secrets (set via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY
//   STRIPE_MONTHLY_PRICE_ID
//   STRIPE_ANNUAL_PRICE_ID
//   APP_BASE_URL                (optional; defaults to the Vercel deployment)
//
// Security model: the caller sends only { plan: 'monthly' | 'annual' } plus
// their Supabase JWT. User id and email are derived from the verified JWT,
// price IDs come from server secrets, and redirect URLs are server-side
// constants — nothing security-relevant is trusted from the client.

import Stripe from 'https://esm.sh/stripe@14?target=deno&no-check';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // @ts-ignore — Deno-compatible fetch
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_BASE_URL =
  Deno.env.get('APP_BASE_URL') ?? 'https://viking-fitness-pink.vercel.app';

const PRICE_IDS: Record<string, string | undefined> = {
  monthly: Deno.env.get('STRIPE_MONTHLY_PRICE_ID'),
  annual: Deno.env.get('STRIPE_ANNUAL_PRICE_ID'),
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller's JWT and derive identity server-side.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing authorization token' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid or expired token' }, 401);

    const { plan } = await req.json();
    const priceId = PRICE_IDS[plan as string];
    if (!priceId) return json({ error: 'Invalid plan' }, 400);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_BASE_URL}/success`,
      cancel_url: `${APP_BASE_URL}/`,
      metadata: { userId: user.id, supabaseUserId: user.id },
      subscription_data: {
        metadata: { userId: user.id, supabaseUserId: user.id },
        trial_period_days: 7,
      },
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return json({ error: err.message }, 500);
  }
});
