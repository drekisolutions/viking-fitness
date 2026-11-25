import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MealPhotoScan {
  meal_name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  glp1_tolerance_score: number;
  glp1_note: string;
}

async function callProFunction<T>(name: string, body: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Please sign in to use Viking Pro features.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? `${name} failed`);
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function askMimirCoach(
  messages: CoachMessage[],
  context?: Record<string, unknown>
): Promise<string> {
  const res = await callProFunction<{ reply: string }>('ai-coach', { messages, context });
  return res.reply;
}

export async function analyzeMealPhoto(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<MealPhotoScan> {
  const res = await callProFunction<{ scan: MealPhotoScan }>('analyze-meal-photo', {
    imageBase64,
    mediaType,
  });
  return res.scan;
}
