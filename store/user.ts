import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';

export interface UserProfile {
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
  bmi: number;
  plan: 'free' | 'premium';
  onboardingComplete: boolean;
}

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  setOnboardingComplete: (complete: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

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
    }),
    {
      name: 'viking-user-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
