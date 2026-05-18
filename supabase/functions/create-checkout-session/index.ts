// Supabase Edge Function — Stripe Checkout Session Creator
// Runs on Deno; deploy with: supabase functions deploy create-checkout-session
// Required secrets (set via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY

import Stripe from 'https://esm.sh/stripe@14?target=deno&no-check';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // @ts-ignore — Deno-compatible fetch
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId, userId, email, successUrl, cancelUrl } = await req.json();

    if (!priceId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: priceId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, supabaseUserId: userId },
      subscription_data: {
        metadata: { userId, supabaseUserId: userId },
        trial_period_days: 7,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
