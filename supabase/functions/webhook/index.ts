// Supabase Edge Function — Stripe Webhook Handler
// Runs on Deno; deploy with: supabase functions deploy webhook
// Required secrets (set via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//   SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase)
//   SUPABASE_URL               (auto-injected by Supabase)
//
// Register this URL in the Stripe Dashboard as:
//   https://<project-ref>.supabase.co/functions/v1/webhook

import Stripe from 'https://esm.sh/stripe@14?target=deno&no-check';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // @ts-ignore — Deno-compatible fetch
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const setPlan = async (userId: string, plan: 'premium' | 'free') => {
  const { error } = await supabase
    .from('profiles')
    .update({ plan })
    .eq('id', userId);
  if (error) console.error('setPlan error:', error);
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return new Response(
      JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const obj = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = obj.metadata?.userId;
      if (userId) await setPlan(userId, 'premium');
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const userId = obj.metadata?.userId;
      if (userId) await setPlan(userId, 'free');
      break;
    }
    case 'customer.subscription.resumed':
    case 'invoice.payment_succeeded': {
      const userId =
        obj.metadata?.userId ??
        obj.subscription_details?.metadata?.userId;
      if (userId) await setPlan(userId, 'premium');
      break;
    }
    case 'invoice.payment_failed':
      console.log('Payment failed for invoice:', obj.id);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
