// Supabase Edge Function — AI Plan Generator (premium feature)
// Runs on Deno; deploy with: supabase functions deploy generate-plan
// Required secrets (set via: supabase secrets set KEY=value):
//   ANTHROPIC_API_KEY          (Claude API key)
//   ANTHROPIC_MODEL            (optional; defaults to claude-opus-5 — set to
//                               claude-haiku-4-5 for a much cheaper/faster option)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//
// Generates a personalized meal or workout plan from the user's profile via
// Claude and persists it to generated_plans. Access is gated to premium users
// server-side — the client cannot bypass it. The Claude API key stays here and
// is never exposed to the app bundle.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// JSON schemas for structured output (no min/max/length — unsupported by the
// structured-outputs validator; every object sets additionalProperties: false).
const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    total_calories: { type: 'integer' },
    meals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          time: { type: 'string' },
          calories: { type: 'integer' },
          protein_g: { type: 'integer' },
          carbs_g: { type: 'integer' },
          fat_g: { type: 'integer' },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'time', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'items'],
      },
    },
    tips: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'total_calories', 'meals', 'tips'],
};

const WORKOUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    focus: { type: 'string' },
    duration_min: { type: 'integer' },
    warmup: { type: 'array', items: { type: 'string' } },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          sets: { type: 'integer' },
          reps: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['name', 'sets', 'reps', 'notes'],
      },
    },
    cooldown: { type: 'array', items: { type: 'string' } },
    tips: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'focus', 'duration_min', 'warmup', 'exercises', 'cooldown', 'tips'],
};

const SYSTEM = `You are a Norse-themed strength & nutrition coach for the Viking Fitness app.
Generate a single, practical, safe, personalized plan as JSON that matches the provided schema exactly.
Base every number on the user's stats and targets. Keep language encouraging with light Viking flavor,
but never make medical claims or recommend anything unsafe. Respect the user's calorie and macro targets
for meal plans, and their goal and experience for workouts.`;

function buildPrompt(type: 'meal' | 'workout', p: Record<string, any>): string {
  const stats = [
    `Goal: ${p.goal ?? 'build'}`,
    `Sex: ${p.sex ?? 'unspecified'}`,
    `Age: ${p.age ?? '?'}`,
    `Weight: ${p.weight_lbs ?? '?'} lbs`,
    `Activity: ${p.activity_label ?? 'moderate'}`,
    `Daily calorie target: ${p.calories ?? '?'} kcal`,
    `Protein/Carbs/Fat targets: ${p.protein ?? '?'}g / ${p.carbs ?? '?'}g / ${p.fat ?? '?'}g`,
    `Meal-plan style: ${p.meal_plan ?? 'balanced'}`,
  ].join('\n');

  if (type === 'meal') {
    return `Create ONE full day of eating that hits the user's calorie and macro targets as closely as possible.
Use 3–5 meals with realistic whole foods. Give 2–4 short practical tips.

User:
${stats}`;
  }
  return `Create ONE workout session appropriate for the user's goal and activity level.
Include a short warmup, 4–7 main exercises with sets/reps and brief form notes, a cooldown, and 2–4 tips.

User:
${stats}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'AI plans are not configured yet.' }, 503);

    // Verify the caller's JWT and derive identity.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing authorization token' }, 401);

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: { user }, error: authError } = await anon.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid or expired token' }, 401);

    const { type } = await req.json();
    if (type !== 'meal' && type !== 'workout') {
      return json({ error: 'Invalid plan type' }, 400);
    }

    // Load the profile and gate on premium (server-side — never trust the client).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);
    if (profile.plan !== 'premium') {
      return json({ error: 'AI plans are a Premium feature.' }, 403);
    }

    // Generate with Claude. Structured output guarantees schema-valid JSON;
    // thinking disabled at low effort keeps it fast and cheap for this bounded task.
    const anthropic = new Anthropic({ apiKey });
    const response: any = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: type === 'meal' ? MEAL_SCHEMA : WORKOUT_SCHEMA },
      },
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(type, profile) }],
    } as any);

    if (response.stop_reason === 'refusal') {
      return json({ error: 'Could not generate that plan. Please try again.' }, 422);
    }

    const textBlock = (response.content ?? []).find((b: any) => b.type === 'text');
    if (!textBlock?.text) return json({ error: 'Empty response from the model.' }, 502);

    let plan: unknown;
    try {
      plan = JSON.parse(textBlock.text);
    } catch {
      return json({ error: 'Model returned malformed data. Please try again.' }, 502);
    }

    // Persist so the plan survives app restarts without re-billing the model.
    const { error: insertError } = await admin
      .from('generated_plans')
      .insert({ user_id: user.id, type, content: plan });
    if (insertError) console.error('generated_plans insert error:', insertError.message);

    return json({ plan });
  } catch (err: any) {
    console.error('generate-plan error:', err?.message ?? err);
    return json({ error: 'Could not generate plan. Please try again.' }, 500);
  }
});
