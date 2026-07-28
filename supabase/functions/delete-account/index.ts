// Supabase Edge Function — Account Deletion
// Runs on Deno; deploy with: supabase functions deploy delete-account
// Required secrets:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   STRIPE_SECRET_KEY  (optional — enables cancelling the web subscription so
//                       the card isn't charged after the account is gone)
//
// Google Play requires apps that offer account creation to offer account
// deletion. The caller is identified from their verified JWT only — a user
// can delete exactly one account: their own.
//
// NOTE: store-managed subscriptions (Google Play / Apple) cannot be cancelled
// server-side and must be cancelled by the user in their store settings; this
// is disclosed in the privacy policy / terms.

import Stripe from 'https://esm.sh/stripe@14?target=deno&no-check';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

// Best-effort cancellation of any active Stripe (web) subscription for this
// user's email, so deletion does not leave a live recurring charge.
async function cancelStripeSubscriptions(email: string | undefined) {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key || !email) return;
  try {
    const stripe = new Stripe(key, {
      // @ts-ignore — Deno-compatible fetch
      httpClient: Stripe.createFetchHttpClient(),
    });
    const customers = await stripe.customers.list({ email, limit: 10 });
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 100,
      });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  } catch (e) {
    // Do not block account deletion on a Stripe error — log and continue.
    console.error('delete-account: Stripe cancellation failed (continuing):', e);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing authorization token' }, 401);

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid or expired token' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Stop web billing before removing the account.
    await cancelStripeSubscriptions(user.email);

    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', user.id);
    if (profileError) throw profileError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return json({ deleted: true });
  } catch (err: any) {
    console.error('delete-account error:', err);
    return json({ error: 'Unable to delete account. Please try again or contact support.' }, 500);
  }
});
