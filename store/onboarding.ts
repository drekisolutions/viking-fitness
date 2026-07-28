import { create } from 'zustand';
import {
  calculateBMI,
  calculateTDEE,
  getCalorieTarget,
  adjustCaloriesForPlan,
  getMacros,
} from '@/constants/calculations';

interface OnboardingState {
  name: string;
  age: number;
  sex: 'male' | 'female';
  heightFt: number;
  heightIn: number;
  weightLbs: number;
  activityLevel: number;
  activityLabel: string;
  goal: string;
  mealPlan: string;
  bmi: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  setField: (key: keyof Omit<OnboardingState, 'setField' | 'calculateResults' | 'initFromProfile'>, value: unknown) => void;
  calculateResults: () => void;
  /** Re-seed the store from a saved Supabase profile (called on every app start) */
  initFromProfile: (p: {
    name?: string; age?: number; sex?: 'male' | 'female';
    heightFt?: number; heightIn?: number; weightLbs?: number;
    goal?: string; mealPlan?: string;
    calories?: number; protein?: number; carbs?: number; fat?: number;
    bmi?: number;
  }) => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  name: '',
  age: 25,
  sex: 'male',
  heightFt: 5,
  heightIn: 10,
  weightLbs: 180,
  activityLevel: 1.375,
  activityLabel: 'Lightly Active',
  goal: 'build',
  mealPlan: 'balanced',
  bmi: 0,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,

  setField: (key, value) => set({ [key]: value } as Partial<OnboardingState>),

  initFromProfile: (p) =>
    set((state) => ({
      name:      p.name      ?? state.name,
      age:       p.age       ?? state.age,
      sex:       p.sex       ?? state.sex,
      heightFt:  p.heightFt  ?? state.heightFt,
      heightIn:  p.heightIn  ?? state.heightIn,
      weightLbs: p.weightLbs ?? state.weightLbs,
      goal:      p.goal      ?? state.goal,
      mealPlan:  p.mealPlan  ?? state.mealPlan,
      calories:  p.calories  ?? state.calories,
      protein:   p.protein   ?? state.protein,
      carbs:     p.carbs     ?? state.carbs,
      fat:       p.fat       ?? state.fat,
      bmi:       p.bmi       ?? state.bmi,
    })),

  calculateResults: () => {
    const state = get();
    const heightInches = state.heightFt * 12 + state.heightIn;
    const bmi = calculateBMI(state.weightLbs, heightInches);
    const tdee = calculateTDEE(
      state.weightLbs,
      heightInches,
      state.age,
      state.sex,
      state.activityLevel
    );
    const rawCalories = getCalorieTarget(tdee, state.goal);
    const calories = adjustCaloriesForPlan(rawCalories, state.mealPlan);
    const macros = getMacros(calories, state.mealPlan);

    set({
      bmi: Math.round(bmi * 10) / 10,
      calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    });
  },
}));
