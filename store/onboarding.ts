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
  setField: (key: keyof Omit<OnboardingState, 'setField' | 'calculateResults'>, value: unknown) => void;
  calculateResults: () => void;
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
