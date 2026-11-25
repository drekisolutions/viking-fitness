import { supabase } from '@/lib/supabase';
import type { UserProfile, PlanTier } from '@/store/user';

/**
 * Fetch the signed-in user's `profiles` row and map it to the app's
 * UserProfile shape with sensible defaults. Returns null when no profile row
 * exists yet (e.g. a brand-new auth user who hasn't completed onboarding).
 *
 * Single source of truth for the DB→client profile mapping, shared by the
 * cold-start session check (app/index.tsx), the post-checkout sync
 * (app/success.tsx), and the sign-in screen (app/signin.tsx).
 */
export async function fetchAppProfile(
  userId: string,
  email: string,
): Promise<UserProfile | null> {
  const { data: dbProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!dbProfile) return null;

  return {
    id: userId,
    name: dbProfile.name || 'Warrior',
    email: email || '',
    age: dbProfile.age || 25,
    sex: (dbProfile.sex as 'male' | 'female') || 'male',
    heightFt: dbProfile.height_ft || 5,
    heightIn: dbProfile.height_in || 10,
    weightLbs: dbProfile.weight_lbs || 180,
    goal: dbProfile.goal || 'build',
    mealPlan: dbProfile.meal_plan || 'balanced',
    calories: dbProfile.calories || 0,
    protein: dbProfile.protein || 0,
    carbs: dbProfile.carbs || 0,
    fat: dbProfile.fat || 0,
    bmi: dbProfile.bmi || 0,
    plan: (dbProfile.plan as PlanTier) || 'free',
    onboardingComplete: dbProfile.onboarding_complete ?? false,
  };
}
