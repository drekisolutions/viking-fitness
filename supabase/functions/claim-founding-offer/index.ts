// Supabase Edge Function — Founding 10 Offer Claim
// First 10 users to sign up via the landing page receive 1 year of Viking Pro free.
// Uses service role to write profiles.plan = 'pro' (enforced by lock_plan_column).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient, setPlan } from '../_shared/plan.ts';

const MAX_FOUNDING_SPOTS = 10;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const admin = createServiceClient();

  if (req.method === 'GET') {
    const { count } = await admin
      .from('founding_claims')
      .select('id', { count: 'exact', head: true });
    const used = count ?? 0;
    return json({
      total: MAX_FOUNDING_SPOTS,
      used,
      remaining: Math.max(0, MAX_FOUNDING_SPOTS - used),
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing authorization token' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid or expired token' }, 401);

    // Check if already claimed
    const { data: existing } = await admin
      .from('founding_claims')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await setPlan(admin, user.id, 'pro');
      return json({ claimed: true, alreadyClaimed: true, plan: 'pro', expiresAt: existing.expires_at });
    }

    // Check remaining founding spots
    const { count } = await admin
      .from('founding_claims')
      .select('id', { count: 'exact', head: true });

    if ((count ?? 0) >= MAX_FOUNDING_SPOTS) {
      return json({ claimed: false, remaining: 0, error: 'All 10 Founding Warrior spots have been claimed.' }, 409);
    }

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await admin.from('founding_claims').insert({
      user_id: user.id,
      email: user.email ?? '',
      granted_plan: 'pro',
      expires_at: expiresAt,
    });

    if (insertError) {
      return json({ error: insertError.message }, 500);
    }

    await setPlan(admin, user.id, 'pro');
    const remaining = Math.max(0, MAX_FOUNDING_SPOTS - ((count ?? 0) + 1));
    return json({ claimed: true, plan: 'pro', remaining, expiresAt });
  } catch (err: any) {
    console.error('claim-founding-offer error:', err);
    return json({ error: err?.message ?? 'Unable to claim founding offer.' }, 500);
  }
});
