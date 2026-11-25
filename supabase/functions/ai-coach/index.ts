// Supabase Edge Function — Mimir 24/7 AI Coach (Viking Pro feature)
// Required secrets: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SYSTEM = `You are Mimir, the Norse strength, nutrition, and GLP-1 muscle-preservation coach inside Viking Fitness Pro.
Be direct, practical, encouraging, and concise (under 180 words unless asked for detail).
Ground your advice in the user's live stats, Muscle Armor score, adaptive TDEE, and GLP-1 Shot Wave phase when provided.
Never prescribe or adjust medication doses, never make medical diagnoses, and recommend consulting a clinician for medical symptoms.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { messages, context } = (await req.json()) as {
      messages?: ChatMessage[];
      context?: Record<string, unknown>;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Messages are required' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('plan, name, goal, meal_plan, calories, protein, carbs, fat, weight_lbs')
      .eq('id', user.id)
      .single();

    if (!profile) return json({ error: 'Profile not found' }, 404);
    if (profile.plan !== 'pro') {
      return json({ error: 'Mimir 24/7 AI Coach requires Viking Fitness Pro.' }, 403);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'AI service is not configured.' }, 500);

    const trimmedHistory = messages.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(m.content).slice(0, 1500),
    }));

    const contextHeader = `User Context: ${JSON.stringify({
      name: profile.name,
      goal: profile.goal,
      mealPlan: profile.meal_plan,
      weightLbs: profile.weight_lbs,
      targets: {
        calories: profile.calories,
        protein: profile.protein,
        carbs: profile.carbs,
        fat: profile.fat,
      },
      ...(context ?? {}),
    })}`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: `${SYSTEM}\n\n${contextHeader}`,
      messages: trimmedHistory,
    });

    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return json({ reply: reply || 'Keep forging ahead—ask me anything about your training or nutrition.' });
  } catch (err: any) {
    console.error('ai-coach error:', err);
    return json({ error: err?.message ?? 'AI Coach failed to respond.' }, 500);
  }
});
