export function calculateBMI(weightLbs: number, heightInches: number): number {
  if (heightInches === 0) return 0;
  return (weightLbs / (heightInches * heightInches)) * 703;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function calculateTDEE(
  weightLbs: number,
  heightInches: number,
  age: number,
  sex: 'male' | 'female',
  activityMultiplier: number
): number {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;

  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  return Math.round(bmr * activityMultiplier);
}

export function getCalorieTarget(tdee: number, goal: string): number {
  switch (goal) {
    case 'cut':
      return Math.round(tdee * 0.8);
    case 'build':
      return Math.round(tdee * 1.1);
    case 'recomp':
      return Math.round(tdee);
    case 'maintain':
    default:
      return Math.round(tdee);
  }
}

/**
 * GLP-1 calorie adjustment.
 * Users on semaglutide/tirzepatide (Ozempic, Wegovy, Mounjaro, Zepbound)
 * typically eat 1,000–1,200 kcal/day due to appetite suppression.
 * We cap at 1,200 and floor at 900 to prevent unsafe restriction.
 */
export function adjustCaloriesForPlan(calories: number, planType: string): number {
  if (planType === 'glp1') {
    return Math.max(900, Math.min(1200, Math.round(calories * 0.60)));
  }
  return calories;
}

export function getMacros(
  calories: number,
  planType: string
): { protein: number; carbs: number; fat: number } {
  switch (planType) {
    case 'high-protein':
      return {
        protein: Math.round((calories * 0.40) / 4),
        carbs: Math.round((calories * 0.35) / 4),
        fat: Math.round((calories * 0.25) / 9),
      };
    case 'keto':
      return {
        protein: Math.round((calories * 0.30) / 4),
        carbs: Math.round((calories * 0.05) / 4),
        fat: Math.round((calories * 0.65) / 9),
      };
    case 'mediterranean':
      return {
        protein: Math.round((calories * 0.20) / 4),
        carbs: Math.round((calories * 0.45) / 4),
        fat: Math.round((calories * 0.35) / 9),
      };
    case 'carnivore':
      return {
        protein: Math.round((calories * 0.45) / 4),
        carbs: Math.round((calories * 0.02) / 4),
        fat: Math.round((calories * 0.53) / 9),
      };
    case 'vegan':
      return {
        protein: Math.round((calories * 0.20) / 4),
        carbs: Math.round((calories * 0.55) / 4),
        fat: Math.round((calories * 0.25) / 9),
      };
    // GLP-1: high protein to preserve muscle during aggressive weight loss
    case 'glp1':
      return {
        protein: Math.round((calories * 0.42) / 4),
        carbs: Math.round((calories * 0.28) / 4),
        fat: Math.round((calories * 0.30) / 9),
      };
    case 'balanced':
    default:
      return {
        protein: Math.round((calories * 0.30) / 4),
        carbs: Math.round((calories * 0.40) / 4),
        fat: Math.round((calories * 0.30) / 9),
      };
  }
}

export function calculateEpley1RM(weightLbs: number, reps: number): number {
  if (reps <= 0 || weightLbs <= 0) return 0;
  if (reps === 1) return Math.round(weightLbs);
  return Math.round(weightLbs * (1 + reps / 30));
}

export function calculateRelativeStrength(oneRmLbs: number, bodyweightLbs: number): number {
  if (oneRmLbs <= 0 || bodyweightLbs <= 0) return 0;
  return Math.round((oneRmLbs / bodyweightLbs) * 100) / 100;
}

export function calculateTrendWeightEMA(
  entries: { date: string; weightLbs: number }[],
  alpha = 0.2
): { date: string; raw: number; trend: number }[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const clampedAlpha = Math.min(1, Math.max(0.01, alpha));
  let ema = sorted[0].weightLbs;

  return sorted.map((entry, idx) => {
    if (idx === 0) {
      ema = entry.weightLbs;
    } else {
      ema = clampedAlpha * entry.weightLbs + (1 - clampedAlpha) * ema;
    }
    return {
      date: entry.date,
      raw: Math.round(entry.weightLbs * 10) / 10,
      trend: Math.round(ema * 100) / 100,
    };
  });
}

export function scaleMealToTarget(
  meal: { calories: number; protein: number; carbs: number; fat: number },
  scaleFactor: number
): { calories: number; protein: number; carbs: number; fat: number; factor: number } {
  const factor = Math.min(1.8, Math.max(0.6, Number.isFinite(scaleFactor) ? scaleFactor : 1));
  return {
    calories: Math.round(meal.calories * factor),
    protein: Math.round(meal.protein * factor),
    carbs: Math.round(meal.carbs * factor),
    fat: Math.round(meal.fat * factor),
    factor: Math.round(factor * 100) / 100,
  };
}

export const WARRIOR_RANKS = [
  { name: 'Thrall', minXp: 0 },
  { name: 'Raider', minXp: 500 },
  { name: 'Berserker', minXp: 1500 },
  { name: 'Jarl', minXp: 3500 },
  { name: 'Warchief', minXp: 7500 },
  { name: 'Odinborn', minXp: 15000 },
] as const;

export function computeWarriorRank(stats: {
  totalWorkouts: number;
  proteinShieldDays: number;
  totalVolumeLbs: number;
}): {
  rank: string;
  rankIndex: number;
  xp: number;
  nextRank: string | null;
  xpToNext: number;
  progress: number;
  nextRankTotal: number;
} {
  const xp = Math.max(
    0,
    Math.round(
      stats.totalWorkouts * 120 +
        stats.proteinShieldDays * 60 +
        stats.totalVolumeLbs / 100
    )
  );

  let rankIndex = 0;
  for (let i = WARRIOR_RANKS.length - 1; i >= 0; i--) {
    if (xp >= WARRIOR_RANKS[i].minXp) {
      rankIndex = i;
      break;
    }
  }

  const current = WARRIOR_RANKS[rankIndex];
  const next = rankIndex < WARRIOR_RANKS.length - 1 ? WARRIOR_RANKS[rankIndex + 1] : null;

  if (!next) {
    return {
      rank: current.name,
      rankIndex,
      xp,
      nextRank: null,
      xpToNext: 0,
      progress: 1,
      nextRankTotal: current.minXp,
    };
  }

  const span = next.minXp - current.minXp;
  const progress = Math.min(1, Math.max(0, (xp - current.minXp) / span));

  return {
    rank: current.name,
    rankIndex,
    xp,
    nextRank: next.name,
    xpToNext: next.minXp - xp,
    progress,
    nextRankTotal: next.minXp,
  };
}
