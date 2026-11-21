import { supabase } from '@/lib/supabase';
import {
  buildLocalWorkoutPivot,
  buildLocalSalvageOptions,
  parseFoodTextLocally,
  type PivotConstraint,
  type WorkoutPivotPlan,
  type SalvageOption,
  type ParsedFoodItem,
} from '@/constants/tacticalFallback';
import type { WorkoutTemplate } from '@/constants/workouts';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

async function callTacticalEdge<T>(
  mode: 'pivot_workout' | 'salvage_day' | 'parse_food_text',
  payload: unknown
): Promise<T | null> {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tactical-adapt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ mode, payload }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return (data?.result as T) ?? null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export async function getWorkoutPivot(
  template: WorkoutTemplate,
  constraint: PivotConstraint,
  useAi: boolean
): Promise<{ plan: WorkoutPivotPlan; source: 'ai' | 'local' }> {
  if (useAi) {
    const aiResult = await callTacticalEdge<WorkoutPivotPlan>('pivot_workout', {
      template,
      constraint,
    });
    if (aiResult && Array.isArray(aiResult.exercises) && aiResult.exercises.length > 0) {
      return { plan: aiResult, source: 'ai' };
    }
  }
  return { plan: buildLocalWorkoutPivot(template, constraint), source: 'local' };
}

export async function getSalvageDayOptions(
  params: {
    remainingCalories: number;
    remainingProtein: number;
    remainingCarbs: number;
    remainingFat: number;
    isGlp1: boolean;
  },
  useAi: boolean
): Promise<{ options: SalvageOption[]; source: 'ai' | 'local' }> {
  if (useAi) {
    const aiResult = await callTacticalEdge<{ options?: SalvageOption[] }>('salvage_day', params);
    if (aiResult && Array.isArray(aiResult.options) && aiResult.options.length > 0) {
      return { options: aiResult.options, source: 'ai' };
    }
  }
  return { options: buildLocalSalvageOptions(params), source: 'local' };
}

export async function parseFoodTextSmart(
  text: string,
  useAi: boolean
): Promise<{ items: ParsedFoodItem[]; source: 'ai' | 'local' }> {
  if (useAi && text.trim().length > 3) {
    const aiResult = await callTacticalEdge<{
      items?: {
        name: string;
        portion: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }[];
    }>('parse_food_text', { text });
    if (aiResult && Array.isArray(aiResult.items) && aiResult.items.length > 0) {
      return {
        items: aiResult.items.map((item, idx) => ({
          id: `ai-parsed-${idx}-${Date.now()}`,
          rawText: item.name,
          name: item.name,
          portion: item.portion,
          calories: Math.round(item.calories),
          protein: Math.round(item.protein * 10) / 10,
          carbs: Math.round(item.carbs * 10) / 10,
          fat: Math.round(item.fat * 10) / 10,
          confidence: 'high',
          selected: true,
        })),
        source: 'ai',
      };
    }
  }
  return { items: parseFoodTextLocally(text), source: 'local' };
}
