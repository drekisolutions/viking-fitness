// Supabase Edge Function — Plate Photo Macro Scan (Viking Pro feature)
// Uses Claude Vision on a base64 meal image to estimate calories, macros, and GLP-1 tolerance.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SCAN_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    meal_name: { type: 'string' },
    portion: { type: 'string' },
    calories: { type: 'integer' },
    protein_g: { type: 'integer' },
    carbs_g: { type: 'integer' },
    fat_g: { type: 'integer' },
    glp1_tolerance_score: { type: 'integer', minimum: 1, maximum: 10 },
    glp1_note: { type: 'string' },
  },
  required: [
    'meal_name',
    'portion',
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
    'glp1_tolerance_score',
    'glp1_note',
  ],
};

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

    const { imageBase64, mediaType } = (await req.json()) as {
      imageBase64?: string;
      mediaType?: string;
    };
    if (!imageBase64 || imageBase64.length > 6_000_000) {
      return json({ error: 'Valid meal photo under 4MB is required' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (!profile) return json({ error: 'Profile not found' }, 404);
    if (profile.plan !== 'pro') {
      return json({ error: 'Plate Photo Macro Scan requires Viking Fitness Pro.' }, 403);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'AI service is not configured.' }, 500);

    const allowedMediaType =
      mediaType === 'image/png' || mediaType === 'image/webp' ? mediaType : 'image/jpeg';

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      tools: [
        {
          name: 'return_meal_scan',
          description: 'Return estimated meal macros and GLP-1 tolerance score.',
          input_schema: SCAN_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'return_meal_scan' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: allowedMediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Identify the food on this plate, estimate total calories, protein, carbs, and fat in grams, and rate GLP-1 stomach tolerance from 1 (very greasy/heavy) to 10 (lean, easy to digest, high protein).',
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return json({ error: 'Could not analyze meal photo.' }, 502);
    }

    return json({ scan: toolUse.input });
  } catch (err: any) {
    console.error('analyze-meal-photo error:', err);
    return json({ error: err?.message ?? 'Photo scan failed.' }, 500);
  }
});
