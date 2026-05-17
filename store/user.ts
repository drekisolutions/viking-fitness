import { create } from 'zustand';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  sex: 'male' | 'female';
  heightFt: number;
  heightIn: number;
  weightLbs: number;
  goal: string;
  mealPlan: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onboardingComplete: boolean;
}

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  setOnboardingComplete: (complete: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),

  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),

  clearProfile: () => set({ profile: null }),

  setOnboardingComplete: (complete) =>
    set((state) => ({
      profile: state.profile
        ? { ...state.profile, onboardingComplete: complete }
        : null,
    })),
}));
