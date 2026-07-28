import { supabase } from '@/lib/supabase';

// Client for the AI plan generator. The Claude call happens server-side in the
// generate-plan edge function (which also enforces the premium gate); this just
// invokes it with the user's JWT and reads persisted plans.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type PlanType = 'meal' | 'workout';

export interface MealItem {
  name: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: string[];
}

export interface MealPlan {
  title: string;
  total_calories: number;
  meals: MealItem[];
  tips: string[];
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  notes: string;
}

export interface WorkoutPlan {
  title: string;
  focus: string;
  duration_min: number;
  warmup: string[];
  exercises: WorkoutExercise[];
  cooldown: string[];
  tips: string[];
}

export type PlanContent = MealPlan | WorkoutPlan;

export async function generatePlan(
  type: PlanType
): Promise<{ plan?: PlanContent; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Sign in to generate AI plans.' };

    // Model calls can take several seconds — allow a generous timeout.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_URL}/functions/v1/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey':        ANON_KEY,
        },
        body: JSON.stringify({ type }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await res.json();
    if (!res.ok) return { error: data?.error ?? 'Could not generate a plan.' };
    return { plan: data.plan as PlanContent };
  } catch (err: any) {
    const message = err?.name === 'AbortError'
      ? 'Generation timed out. Please try again.'
      : err?.message ?? 'Could not generate a plan.';
    return { error: message };
  }
}

/** Latest persisted plan of this type for the signed-in user (RLS-scoped), or null. */
export async function getLatestPlan(type: PlanType): Promise<PlanContent | null> {
  const { data } = await supabase
    .from('generated_plans')
    .select('content')
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.content as PlanContent) ?? null;
}
