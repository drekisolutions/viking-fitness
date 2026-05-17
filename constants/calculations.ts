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
