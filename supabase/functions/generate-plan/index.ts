// Supabase Edge Function — AI Plan Generator (premium feature)
// Runs on Deno; deploy with: supabase functions deploy generate-plan
// Required secrets (set via: supabase secrets set KEY=value):
//   ANTHROPIC_API_KEY          (Claude API key)
//   ANTHROPIC_MODEL            (optional; defaults to claude-haiku-4-5)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//
// Generates a personalized meal or workout plan from the user's profile (plus
// optional live GLP-1 Shot Wave context) via Claude and persists it to
// generated_plans. Access is gated to premium users server-side and rate-limited
// to 5 generations per 24h per user.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5';
const DAILY_LIMIT = 5;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MEAL_SCHEMA = {
  type: 'object' as const,
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
  type: 'object' as const,
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
Generate a single, practical, safe, personalized plan by calling the provided tool with exact JSON.
Base every number on the user's stats and targets. Keep language encouraging with light Viking flavor,
but never make medical claims, never prescribe medication doses, and never recommend anything unsafe.
Respect the user's calorie and macro targets (and any active GLP-1 Shot Wave adjustments) for meal plans,
and their goal, recovery state, and muscle-preservation priorities for workouts.`;

interface Glp1Context {
  phase?: string;
  medication?: string;
  doseMg?: number;
  proteinFloorG?: number;
  adaptedCalories?: number;
  trainingNote?: string;
}

function buildPrompt(
  type: 'meal' | 'workout',
  p: Record<string, any>,
  glp1Context?: Glp1Context
): string {
  const effectiveCalories = glp1Context?.adaptedCalories ?? p.calories ?? '?';
  const effectiveProtein = glp1Context?.proteinFloorG ?? p.protein ?? '?';

  const stats = [
    `Goal: ${p.goal ?? 'build'}`,
    `Sex: ${p.sex ?? 'unspecified'}`,
    `Age: ${p.age ?? '?'}`,
    `Weight: ${p.weight_lbs ?? '?'} lbs`,
    `Activity: ${p.activity_label ?? 'moderate'}`,
    `Daily calorie target: ${effectiveCalories} kcal`,
    `Protein/Carbs/Fat targets: ${effectiveProtein}g / ${p.carbs ?? '?'}g / ${p.fat ?? '?'}g`,
    `Meal-plan style: ${p.meal_plan ?? 'balanced'}`,
  ];

  if (glp1Context?.phase) {
    stats.push(
      `GLP-1 Muscle Armor active: medication=${glp1Context.medication ?? 'GLP-1'} (${glp1Context.doseMg ?? '?'} mg), shot-wave phase=${glp1Context.phase}, protein shield floor=${effectiveProtein}g`
    );
    if (glp1Context.trainingNote) {
      stats.push(`GLP-1 training directive: ${glp1Context.trainingNote}`);
    }
  }

  const statBlock = stats.join('\n');

  if (type === 'meal') {
    const glp1Guidance = glp1Context?.phase
      ? ' Prioritize small, easy-to-digest, low-grease, protein-first meals (4–5 micro-meals if appetite is suppressed) that strictly protect the protein shield floor.'
      : '';
    return `Create ONE full day of eating that hits the user's calorie and macro targets as closely as possible.
Use 3–5 meals with realistic whole foods.${glp1Guidance} Give 2–4 short practical tips.

User:
${statBlock}`;
  }

  const glp1LiftGuidance = glp1Context?.phase
    ? ' Focus on compound resistance movements to preserve lean muscle mass; if in peak suppression phase, keep working weight heavy on 2–3 core sets and skip unnecessary junk volume.'
    : '';
  return `Create ONE workout session appropriate for the user's goal and activity level.${glp1LiftGuidance}
Include a short warmup, 4–7 main exercises with sets/reps and brief form notes, a cooldown, and 2–4 tips.

User:
${statBlock}`;
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

    const { type, glp1Context } = await req.json();
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

    // Enforce per-user 24-hour generation cap to bound Anthropic API spend.
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from('generated_plans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', sinceIso);

    if (!countError && (count ?? 0) >= DAILY_LIMIT) {
      return json(
        { error: `Daily AI generation limit reached (${DAILY_LIMIT}/day). Try again tomorrow.` },
        429
      );
    }

    const toolName = type === 'meal' ? 'save_meal_plan' : 'save_workout_plan';
    const anthropic = new Anthropic({ apiKey });
    const response: any = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      tools: [
        {
          name: toolName,
          description: `Persist the generated ${type} plan for the user.`,
          input_schema: type === 'meal' ? MEAL_SCHEMA : WORKOUT_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
      messages: [{ role: 'user', content: buildPrompt(type, profile, glp1Context) }],
    });

    if (response.stop_reason === 'refusal') {
      return json({ error: 'Could not generate that plan. Please try again.' }, 422);
    }

    const toolBlock = (response.content ?? []).find(
      (b: any) => b.type === 'tool_use' && b.name === toolName
    );
    const plan = toolBlock?.input;
    if (!plan || typeof plan !== 'object') {
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
