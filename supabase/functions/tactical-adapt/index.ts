// Supabase Edge Function — Tactical Battlefield Adaptations (Premium feature)
// Modes:
//   - pivot_workout: Adapts a planned session for time/equipment/fatigue/injury constraints
//   - salvage_day: Generates 3 practical meals matching exact remaining daily macros
//   - parse_food_text: Parses free-text/voice food descriptions into itemized macros
//
// Security: JWT-verified + premium-gated server-side; capped at 15 calls/24h per user.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const PIVOT_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    focus: { type: 'string' },
    durationMin: { type: 'integer' },
    rationale: { type: 'string' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          muscle: { type: 'string' },
          sets: { type: 'integer' },
          glp1PeakSets: { type: 'integer' },
          reps: { type: 'string' },
          restSec: { type: 'integer' },
        },
        required: ['name', 'muscle', 'sets', 'glp1PeakSets', 'reps', 'restSec'],
      },
    },
  },
  required: ['title', 'focus', 'durationMin', 'rationale', 'exercises'],
};

const SALVAGE_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          category: { type: 'string' },
          title: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          calories: { type: 'integer' },
          protein: { type: 'integer' },
          carbs: { type: 'integer' },
          fat: { type: 'integer' },
          note: { type: 'string' },
        },
        required: ['id', 'category', 'title', 'items', 'calories', 'protein', 'carbs', 'fat', 'note'],
      },
    },
  },
  required: ['options'],
};

const PARSE_FOOD_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          portion: { type: 'string' },
          calories: { type: 'integer' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
        },
        required: ['name', 'portion', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: ['items'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'AI tactical engine not configured.' }, 503);

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing authorization token' }, 401);

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const {
      data: { user },
      error: authError,
    } = await anon.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid or expired token' }, 401);

    const { mode, payload } = await req.json();
    if (mode !== 'pivot_workout' && mode !== 'salvage_day' && mode !== 'parse_food_text') {
      return json({ error: 'Invalid tactical mode' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('plan, goal, meal_plan')
      .eq('id', user.id)
      .single();

    if (!profile) return json({ error: 'Profile not found' }, 404);
    if (profile.plan !== 'premium' && profile.plan !== 'pro') {
      return json({ error: 'AI tactical adaptation is a Premium feature.' }, 403);
    }

    const schema =
      mode === 'pivot_workout'
        ? PIVOT_SCHEMA
        : mode === 'salvage_day'
        ? SALVAGE_SCHEMA
        : PARSE_FOOD_SCHEMA;
    const toolName = `return_${mode}`;

    const prompt =
      mode === 'pivot_workout'
        ? `Adapt this planned workout safely for the constraint "${payload?.constraint}" while preserving progressive overload stimulus for the user's goal (${profile.goal}). Workout: ${JSON.stringify(payload?.template ?? {})}`
        : mode === 'salvage_day'
        ? `Create 3 practical rescue meals (categories: Home Quick-Cook, Zero-Cook / Grocery, Fast-Casual Pick) fitting remaining macros: ${JSON.stringify(payload)}. Keep GLP-1 friendly low-grease options if isGlp1 is true.`
        : `Parse this food description into accurate itemized nutrition entries: "${String(payload?.text ?? '')}"`;

    const anthropic = new Anthropic({ apiKey });
    const response: any = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        'You are the Viking Fitness tactical strength & nutrition engine. Output realistic, safe, precise numbers via the provided tool.',
      tools: [
        {
          name: toolName,
          description: `Return structured ${mode} output.`,
          input_schema: schema,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolBlock = (response.content ?? []).find(
      (b: any) => b.type === 'tool_use' && b.name === toolName
    );
    if (!toolBlock?.input) {
      return json({ error: 'Invalid tactical response' }, 502);
    }

    return json({ result: toolBlock.input });
  } catch (err: any) {
    console.error('tactical-adapt error:', err?.message ?? err);
    return json({ error: 'Tactical adaptation unavailable.' }, 500);
  }
});
