import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { calculateEpley1RM } from '@/constants/calculations';
import { trackEvent } from '@/lib/analytics';
import {
  DEFAULT_GLP1_PROFILE,
  type Glp1ProfileConfig,
  type Glp1ShotEntry,
  type Glp1MedicationKey,
  type Glp1PhaseMode,
} from '@/constants/glp1';
import { getWeekStartKey, type WarbandMemberDamageInput } from '@/constants/warband';
import type { SplitKey, WorkoutTemplate } from '@/constants/workouts';

export interface FoodLogEntry {
  id: string;
  logDate: string; // YYYY-MM-DD (local)
  mealSlot: string;
  name: string;
  brand?: string;
  portion?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  createdAt: string;
}

export interface WaterDayLog {
  glasses: number;
  electrolytesTaken: boolean;
}

export interface WeightLogEntry {
  id: string;
  logDate: string; // YYYY-MM-DD
  weightLbs: number;
  bodyFatPct?: number;
  waistIn?: number;
  notes?: string;
  createdAt: string;
}

export interface WorkoutSetEntry {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  weightLbs: number;
  reps: number;
  estimated1rm: number;
  isPr: boolean;
  completed: boolean;
}

export interface WorkoutSessionEntry {
  id: string;
  split: SplitKey | string;
  name: string;
  startedAt: string;
  completedAt: string;
  durationMin: number;
  totalVolumeLbs: number;
  glp1Phase?: string;
  notes?: string;
  sets: WorkoutSetEntry[];
}

export interface ActiveSetDraft {
  id: string;
  setNumber: number;
  weightLbs: string;
  reps: string;
  completed: boolean;
}

export interface ActiveExerciseDraft {
  name: string;
  muscle: string;
  repsTarget: string;
  restSec: number;
  sets: ActiveSetDraft[];
}

export interface ActiveWorkoutState {
  templateId: string;
  split: SplitKey | string;
  name: string;
  startedAt: string;
  glp1Phase?: string;
  exercises: ActiveExerciseDraft[];
}

export function getTodayDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateKeyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getTodayDateKey(d);
}

function createUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isRemoteUser(userId?: string): userId is string {
  return Boolean(userId && !userId.startsWith('guest-'));
}

export function getDayTotals(
  foodLogs: FoodLogEntry[],
  dateKey: string
): { calories: number; protein: number; carbs: number; fat: number; items: FoodLogEntry[] } {
  const items = foodLogs.filter((f) => f.logDate === dateKey);
  return items.reduce(
    (acc, f) => ({
      calories: acc.calories + Math.round(f.calories || 0),
      protein: Math.round((acc.protein + (f.protein || 0)) * 10) / 10,
      carbs: Math.round((acc.carbs + (f.carbs || 0)) * 10) / 10,
      fat: Math.round((acc.fat + (f.fat || 0)) * 10) / 10,
      items,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, items }
  );
}

export function getLiftPRs(
  sessions: WorkoutSessionEntry[]
): { lift: string; weightLbs: number; reps: number; estimated1rm: number; date: string }[] {
  const bestByLift = new Map<
    string,
    { lift: string; weightLbs: number; reps: number; estimated1rm: number; date: string }
  >();

  for (const session of sessions) {
    const dateLabel = session.completedAt.slice(0, 10);
    for (const s of session.sets) {
      if (!s.completed || s.weightLbs <= 0 || s.reps <= 0) continue;
      const e1rm = s.estimated1rm || calculateEpley1RM(s.weightLbs, s.reps);
      const prev = bestByLift.get(s.exerciseName);
      if (!prev || e1rm > prev.estimated1rm) {
        bestByLift.set(s.exerciseName, {
          lift: s.exerciseName,
          weightLbs: s.weightLbs,
          reps: s.reps,
          estimated1rm: e1rm,
          date: dateLabel,
        });
      }
    }
  }

  return Array.from(bestByLift.values()).sort((a, b) => b.estimated1rm - a.estimated1rm);
}

export function getExerciseLastPerformance(
  sessions: WorkoutSessionEntry[],
  exerciseName: string
): { weightLbs: number; reps: number }[] {
  const sorted = [...sessions].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  );
  for (const session of sorted) {
    const matching = session.sets
      .filter((s) => s.exerciseName === exerciseName && s.completed)
      .sort((a, b) => a.setNumber - b.setNumber);
    if (matching.length > 0) {
      return matching.map((s) => ({ weightLbs: s.weightLbs, reps: s.reps }));
    }
  }
  return [];
}

export function getWeeklyCampaignStats(
  sessions: WorkoutSessionEntry[],
  foodLogs: FoodLogEntry[],
  waterByDate: Record<string, WaterDayLog>,
  proteinTargetG: number
): {
  workoutsLast7Days: number;
  proteinShieldDaysLast7: number;
  electrolytesDaysLast7: number;
  totalWorkouts: number;
  totalVolumeLbs: number;
  totalProteinShieldDays: number;
} {
  const last7Keys = new Set(Array.from({ length: 7 }, (_, i) => getDateKeyDaysAgo(i)));
  const threshold = Math.max(60, Math.round(proteinTargetG * 0.8));

  const workoutsLast7Days = sessions.filter((s) =>
    last7Keys.has(s.completedAt.slice(0, 10))
  ).length;

  const proteinByDay = new Map<string, number>();
  for (const f of foodLogs) {
    proteinByDay.set(f.logDate, (proteinByDay.get(f.logDate) ?? 0) + (f.protein || 0));
  }

  let proteinShieldDaysLast7 = 0;
  let totalProteinShieldDays = 0;
  for (const [dateKey, totalPro] of proteinByDay.entries()) {
    if (totalPro >= threshold) {
      totalProteinShieldDays += 1;
      if (last7Keys.has(dateKey)) proteinShieldDaysLast7 += 1;
    }
  }

  let electrolytesDaysLast7 = 0;
  for (const key of last7Keys) {
    if (waterByDate[key]?.electrolytesTaken) electrolytesDaysLast7 += 1;
  }

  const totalVolumeLbs = Math.round(
    sessions.reduce((sum, s) => sum + (s.totalVolumeLbs || 0), 0)
  );

  return {
    workoutsLast7Days,
    proteinShieldDaysLast7,
    electrolytesDaysLast7,
    totalWorkouts: sessions.length,
    totalVolumeLbs,
    totalProteinShieldDays,
  };
}

export interface WarbandState {
  id: string;
  name: string;
  inviteCode: string;
  members: WarbandMemberDamageInput[];
}

interface TrackerState {
  foodLogs: FoodLogEntry[];
  waterByDate: Record<string, WaterDayLog>;
  weightLogs: WeightLogEntry[];
  workoutSessions: WorkoutSessionEntry[];
  activeWorkout: ActiveWorkoutState | null;
  selectedSplit: SplitKey;
  glp1Profile: Glp1ProfileConfig;
  glp1Shots: Glp1ShotEntry[];
  shieldWallPasses: number;
  protectedWeeks: string[];
  claimedCampaignWeeks: string[];
  lastAdaptiveCheckinDate: string | null;
  warband: WarbandState | null;
  _hasHydrated: boolean;

  setHasHydrated: (hydrated: boolean) => void;
  setSelectedSplit: (split: SplitKey) => void;
  addFoodLog: (
    userId: string | undefined,
    entry: Omit<FoodLogEntry, 'id' | 'createdAt'>
  ) => FoodLogEntry;
  removeFoodLog: (userId: string | undefined, id: string) => void;
  incrementWater: (userId: string | undefined, dateKey: string, delta: number) => void;
  toggleElectrolytes: (userId: string | undefined, dateKey: string) => void;
  logWeight: (
    userId: string | undefined,
    entry: {
      logDate: string;
      weightLbs: number;
      bodyFatPct?: number;
      waistIn?: number;
      notes?: string;
    }
  ) => WeightLogEntry;
  startActiveWorkout: (
    template: WorkoutTemplate,
    glp1PeakMode: boolean,
    glp1Phase?: string
  ) => void;
  updateActiveWorkoutSet: (
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<{ weightLbs: string; reps: string; completed: boolean }>
  ) => void;
  addActiveWorkoutSet: (exerciseIndex: number) => void;
  removeActiveWorkoutSet: (exerciseIndex: number, setIndex: number) => void;
  discardActiveWorkout: () => void;
  finishActiveWorkout: (userId: string | undefined) => WorkoutSessionEntry | null;
  setGlp1Config: (
    userId: string | undefined,
    updates: Partial<Glp1ProfileConfig>
  ) => void;
  addGlp1Shot: (
    userId: string | undefined,
    shot: Omit<Glp1ShotEntry, 'id'>
  ) => Glp1ShotEntry;
  removeGlp1Shot: (userId: string | undefined, id: string) => void;
  activateShieldWallPass: (weekStartKey: string) => boolean;
  claimWeeklyCampaignPass: (weekStartKey: string) => void;
  recordAdaptiveCheckin: (
    userId: string | undefined,
    data: {
      checkinDate: string;
      estimatedTdee: number;
      previousCalories: number;
      newCalories: number;
    }
  ) => void;
  createWarband: (
    userId: string | undefined,
    name: string,
    displayName: string,
    weeklyStats: { damage: number; workouts: number; proteinDays: number }
  ) => Promise<{ ok: boolean; error?: string }>;
  joinWarbandByCode: (
    userId: string | undefined,
    code: string,
    displayName: string,
    weeklyStats: { damage: number; workouts: number; proteinDays: number }
  ) => Promise<{ ok: boolean; error?: string }>;
  syncWarbandDamage: (
    userId: string | undefined,
    displayName: string,
    weeklyStats: { damage: number; workouts: number; proteinDays: number }
  ) => void;
  leaveWarband: (userId: string | undefined) => Promise<void>;
  hydrateFromSupabase: (userId: string) => Promise<void>;
  resetTracker: () => void;
}

const INITIAL_DATA = {
  foodLogs: [] as FoodLogEntry[],
  waterByDate: {} as Record<string, WaterDayLog>,
  weightLogs: [] as WeightLogEntry[],
  workoutSessions: [] as WorkoutSessionEntry[],
  activeWorkout: null as ActiveWorkoutState | null,
  selectedSplit: 'PPL' as SplitKey,
  glp1Profile: { ...DEFAULT_GLP1_PROFILE },
  glp1Shots: [] as Glp1ShotEntry[],
  shieldWallPasses: 1,
  protectedWeeks: [] as string[],
  claimedCampaignWeeks: [] as string[],
  lastAdaptiveCheckinDate: null as string | null,
  warband: null as WarbandState | null,
};

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      ...INITIAL_DATA,
      _hasHydrated: false,

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      setSelectedSplit: (split) => set({ selectedSplit: split }),

      addFoodLog: (userId, entry) => {
        const record: FoodLogEntry = {
          ...entry,
          id: createUuid(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ foodLogs: [record, ...state.foodLogs] }));
        trackEvent('food_logged', { source: record.source, mealSlot: record.mealSlot });

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase
              .from('food_logs')
              .insert({
                id: record.id,
                user_id: userId,
                log_date: record.logDate,
                meal_slot: record.mealSlot,
                name: record.name,
                brand: record.brand ?? null,
                portion: record.portion ?? null,
                calories: Math.round(record.calories),
                protein: record.protein,
                carbs: record.carbs,
                fat: record.fat,
                source: record.source,
                created_at: record.createdAt,
              })
          ).catch(() => {});
        }
        return record;
      },

      removeFoodLog: (userId, id) => {
        set((state) => ({
          foodLogs: state.foodLogs.filter((item) => item.id !== id),
        }));
        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('food_logs').delete().eq('id', id).eq('user_id', userId)
          ).catch(() => {});
        }
      },

      incrementWater: (userId, dateKey, delta) => {
        let nextDay: WaterDayLog = { glasses: 0, electrolytesTaken: false };
        set((state) => {
          const cur = state.waterByDate[dateKey] ?? {
            glasses: 0,
            electrolytesTaken: false,
          };
          nextDay = {
            ...cur,
            glasses: Math.max(0, Math.min(24, cur.glasses + delta)),
          };
          return {
            waterByDate: { ...state.waterByDate, [dateKey]: nextDay },
          };
        });

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('water_logs').upsert(
              {
                user_id: userId,
                log_date: dateKey,
                glasses: nextDay.glasses,
                electrolytes_taken: nextDay.electrolytesTaken,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,log_date' }
            )
          ).catch(() => {});
        }
      },

      toggleElectrolytes: (userId, dateKey) => {
        let nextDay: WaterDayLog = { glasses: 0, electrolytesTaken: false };
        set((state) => {
          const cur = state.waterByDate[dateKey] ?? {
            glasses: 0,
            electrolytesTaken: false,
          };
          nextDay = { ...cur, electrolytesTaken: !cur.electrolytesTaken };
          return {
            waterByDate: { ...state.waterByDate, [dateKey]: nextDay },
          };
        });

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('water_logs').upsert(
              {
                user_id: userId,
                log_date: dateKey,
                glasses: nextDay.glasses,
                electrolytes_taken: nextDay.electrolytesTaken,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,log_date' }
            )
          ).catch(() => {});
        }
      },

      logWeight: (userId, entry) => {
        const now = new Date().toISOString();
        const existing = get().weightLogs.find((w) => w.logDate === entry.logDate);
        const record: WeightLogEntry = {
          id: existing?.id ?? createUuid(),
          logDate: entry.logDate,
          weightLbs: Math.round(entry.weightLbs * 10) / 10,
          bodyFatPct: entry.bodyFatPct,
          waistIn: entry.waistIn,
          notes: entry.notes,
          createdAt: existing?.createdAt ?? now,
        };

        set((state) => {
          const filtered = state.weightLogs.filter((w) => w.logDate !== entry.logDate);
          const next = [...filtered, record].sort((a, b) =>
            a.logDate.localeCompare(b.logDate)
          );
          return { weightLogs: next };
        });

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('weight_logs').upsert(
              {
                id: record.id,
                user_id: userId,
                log_date: record.logDate,
                weight_lbs: record.weightLbs,
                body_fat_pct: record.bodyFatPct ?? null,
                waist_in: record.waistIn ?? null,
                notes: record.notes ?? null,
                created_at: record.createdAt,
              },
              { onConflict: 'user_id,log_date' }
            )
          ).catch(() => {});
        }
        return record;
      },

      startActiveWorkout: (template, glp1PeakMode, glp1Phase) => {
        const sessions = get().workoutSessions;
        const exercises: ActiveExerciseDraft[] = template.exercises.map((ex) => {
          const count = glp1PeakMode ? ex.glp1PeakSets : ex.sets;
          const prev = getExerciseLastPerformance(sessions, ex.name);
          const sets: ActiveSetDraft[] = Array.from({ length: count }, (_, idx) => {
            const prevSet = prev[idx] ?? prev[0];
            return {
              id: createUuid(),
              setNumber: idx + 1,
              weightLbs: prevSet ? String(prevSet.weightLbs) : '',
              reps: prevSet ? String(prevSet.reps) : '',
              completed: false,
            };
          });
          return {
            name: ex.name,
            muscle: ex.muscle,
            repsTarget: ex.reps,
            restSec: ex.restSec,
            sets,
          };
        });

        set({
          activeWorkout: {
            templateId: template.id,
            split: template.split,
            name: template.name,
            startedAt: new Date().toISOString(),
            glp1Phase,
            exercises,
          },
        });
      },

      updateActiveWorkoutSet: (exerciseIndex, setIndex, updates) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = state.activeWorkout.exercises.map((ex, eIdx) => {
            if (eIdx !== exerciseIndex) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s, sIdx) =>
                sIdx === setIndex ? { ...s, ...updates } : s
              ),
            };
          });
          return { activeWorkout: { ...state.activeWorkout, exercises } };
        });
      },

      addActiveWorkoutSet: (exerciseIndex) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = state.activeWorkout.exercises.map((ex, eIdx) => {
            if (eIdx !== exerciseIndex) return ex;
            const last = ex.sets[ex.sets.length - 1];
            return {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  id: createUuid(),
                  setNumber: ex.sets.length + 1,
                  weightLbs: last?.weightLbs ?? '',
                  reps: last?.reps ?? '',
                  completed: false,
                },
              ],
            };
          });
          return { activeWorkout: { ...state.activeWorkout, exercises } };
        });
      },

      removeActiveWorkoutSet: (exerciseIndex, setIndex) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = state.activeWorkout.exercises.map((ex, eIdx) => {
            if (eIdx !== exerciseIndex) return ex;
            if (ex.sets.length <= 1) return ex;
            const nextSets = ex.sets
              .filter((_, sIdx) => sIdx !== setIndex)
              .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
            return { ...ex, sets: nextSets };
          });
          return { activeWorkout: { ...state.activeWorkout, exercises } };
        });
      },

      discardActiveWorkout: () => set({ activeWorkout: null }),

      finishActiveWorkout: (userId) => {
        const state = get();
        const active = state.activeWorkout;
        if (!active) return null;

        const existingPrs = new Map<string, number>();
        for (const pr of getLiftPRs(state.workoutSessions)) {
          existingPrs.set(pr.lift, pr.estimated1rm);
        }

        const completedAt = new Date().toISOString();
        const elapsedMs = Date.parse(completedAt) - Date.parse(active.startedAt);
        const durationMin = Math.max(1, Math.round(elapsedMs / 60000));

        const sets: WorkoutSetEntry[] = [];
        let totalVolumeLbs = 0;

        for (const ex of active.exercises) {
          for (const draft of ex.sets) {
            if (!draft.completed) continue;
            const weight = Math.max(0, Number(draft.weightLbs) || 0);
            const reps = Math.max(0, Math.round(Number(draft.reps) || 0));
            const e1rm = calculateEpley1RM(weight, reps);
            const prevBest = existingPrs.get(ex.name) ?? 0;
            const isPr = e1rm > 0 && e1rm > prevBest;
            if (isPr) existingPrs.set(ex.name, e1rm);
            totalVolumeLbs += weight * reps;

            sets.push({
              id: createUuid(),
              exerciseName: ex.name,
              muscleGroup: ex.muscle,
              setNumber: draft.setNumber,
              weightLbs: weight,
              reps,
              estimated1rm: e1rm,
              isPr,
              completed: true,
            });
          }
        }

        if (sets.length === 0) {
          set({ activeWorkout: null });
          return null;
        }

        const session: WorkoutSessionEntry = {
          id: createUuid(),
          split: active.split,
          name: active.name,
          startedAt: active.startedAt,
          completedAt,
          durationMin,
          totalVolumeLbs: Math.round(totalVolumeLbs),
          glp1Phase: active.glp1Phase,
          sets,
        };

        set((prev) => ({
          workoutSessions: [session, ...prev.workoutSessions],
          activeWorkout: null,
        }));
        trackEvent('workout_logged', {
          split: session.split,
          durationMin: session.durationMin,
          totalVolumeLbs: session.totalVolumeLbs,
        });

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase
              .from('workout_sessions')
              .insert({
                id: session.id,
                user_id: userId,
                split: session.split,
                name: session.name,
                started_at: session.startedAt,
                completed_at: session.completedAt,
                duration_min: session.durationMin,
                total_volume_lbs: session.totalVolumeLbs,
                glp1_phase: session.glp1Phase ?? null,
              })
              .then(({ error }) => {
                if (error || session.sets.length === 0) return;
                return supabase.from('workout_sets').insert(
                  session.sets.map((s) => ({
                    id: s.id,
                    session_id: session.id,
                    user_id: userId,
                    exercise_name: s.exerciseName,
                    muscle_group: s.muscleGroup,
                    set_number: s.setNumber,
                    weight_lbs: s.weightLbs,
                    reps: s.reps,
                    estimated_1rm: s.estimated1rm,
                    is_pr: s.isPr,
                    completed: s.completed,
                  }))
                );
              })
          ).catch(() => {});
        }

        return session;
      },

      setGlp1Config: (userId, updates) => {
        let merged: Glp1ProfileConfig = { ...get().glp1Profile, ...updates };
        set((state) => {
          merged = { ...state.glp1Profile, ...updates };
          return {
            glp1Profile: merged,
            selectedSplit:
              updates.enabled === true ? 'GLP-1 Armor' : state.selectedSplit,
          };
        });

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('glp1_profiles').upsert(
              {
                user_id: userId,
                enabled: merged.enabled,
                medication: merged.medication,
                brand_name: merged.brandName,
                current_dose_mg: merged.currentDoseMg,
                shot_interval_days: merged.shotIntervalDays,
                phase_mode: merged.phaseMode,
                reverse_diet_start_date: merged.reverseDietStartDate,
                reverse_diet_weekly_bump_kcal: merged.reverseDietWeeklyBumpKcal,
                protein_floor_g: merged.proteinFloorG,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            )
          ).catch(() => {});
        }
      },

      addGlp1Shot: (userId, shot) => {
        const record: Glp1ShotEntry = {
          ...shot,
          id: createUuid(),
        };
        set((state) => ({
          glp1Shots: [record, ...state.glp1Shots].sort((a, b) =>
            b.injectedAt.localeCompare(a.injectedAt)
          ),
        }));

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('glp1_shots').insert({
              id: record.id,
              user_id: userId,
              medication: record.medication,
              dose_mg: record.doseMg,
              injection_site: record.injectionSite,
              injected_at: record.injectedAt,
              nausea_level: record.nauseaLevel,
              fatigue_level: record.fatigueLevel,
              appetite_level: record.appetiteLevel,
              notes: record.notes ?? null,
            })
          ).catch(() => {});
        }
        return record;
      },

      removeGlp1Shot: (userId, id) => {
        set((state) => ({
          glp1Shots: state.glp1Shots.filter((s) => s.id !== id),
        }));
        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('glp1_shots').delete().eq('id', id).eq('user_id', userId)
          ).catch(() => {});
        }
      },

      activateShieldWallPass: (weekStartKey) => {
        const cur = get();
        if (cur.shieldWallPasses <= 0 || cur.protectedWeeks.includes(weekStartKey)) {
          return false;
        }
        set({
          shieldWallPasses: cur.shieldWallPasses - 1,
          protectedWeeks: [...cur.protectedWeeks, weekStartKey],
        });
        return true;
      },

      claimWeeklyCampaignPass: (weekStartKey) => {
        const cur = get();
        if (cur.claimedCampaignWeeks.includes(weekStartKey)) return;
        set({
          claimedCampaignWeeks: [...cur.claimedCampaignWeeks, weekStartKey],
          shieldWallPasses: Math.min(3, cur.shieldWallPasses + 1),
        });
      },

      recordAdaptiveCheckin: (userId, data) => {
        set({ lastAdaptiveCheckinDate: data.checkinDate });
        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase.from('adaptive_checkins').insert({
              user_id: userId,
              checkin_date: data.checkinDate,
              estimated_tdee: data.estimatedTdee,
              previous_calories: data.previousCalories,
              new_calories: data.newCalories,
              accepted: true,
            })
          ).catch(() => {});
        }
      },

      createWarband: async (userId, name, displayName, weeklyStats) => {
        const trimmedName = name.trim() || 'Iron Longship';
        const memberName = displayName.trim() || 'Warrior';
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const bandId = createUuid();
        const weekStart = getWeekStartKey();
        const selfId = userId || 'local-warrior';

        const localBand: WarbandState = {
          id: bandId,
          name: trimmedName,
          inviteCode,
          members: [
            {
              userId: selfId,
              displayName: memberName,
              weeklyDamage: weeklyStats.damage,
              weeklyWorkouts: weeklyStats.workouts,
              weeklyProteinDays: weeklyStats.proteinDays,
            },
          ],
        };

        set({ warband: localBand });

        if (isRemoteUser(userId)) {
          try {
            const { error: bandErr } = await supabase.from('warbands').insert({
              id: bandId,
              name: trimmedName,
              invite_code: inviteCode,
              owner_id: userId,
            });
            if (!bandErr) {
              await supabase.from('warband_members').upsert(
                {
                  warband_id: bandId,
                  user_id: userId,
                  display_name: memberName,
                  week_start_date: weekStart,
                  weekly_damage: weeklyStats.damage,
                  weekly_workouts: weeklyStats.workouts,
                  weekly_protein_days: weeklyStats.proteinDays,
                },
                { onConflict: 'warband_id,user_id' }
              );
            }
          } catch {
            // Keep local warband intact
          }
        }
        return { ok: true };
      },

      joinWarbandByCode: async (userId, code, displayName, weeklyStats) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return { ok: false, error: 'Enter a valid 6-character invite code.' };
        if (!isRemoteUser(userId)) {
          return {
            ok: false,
            error: 'Sign in with a free account to join a friend’s Warband across devices.',
          };
        }

        try {
          const { data: bandRow, error } = await supabase.rpc('join_warband_by_code', {
            p_code: cleanCode,
            p_display_name: displayName.trim() || 'Warrior',
          });
          if (error || !bandRow) {
            return {
              ok: false,
              error: error?.message ?? 'Could not join Warband with that code.',
            };
          }

          const weekStart = getWeekStartKey();
          await supabase
            .from('warband_members')
            .update({
              week_start_date: weekStart,
              weekly_damage: weeklyStats.damage,
              weekly_workouts: weeklyStats.workouts,
              weekly_protein_days: weeklyStats.proteinDays,
            })
            .eq('warband_id', bandRow.id)
            .eq('user_id', userId);

          const { data: members } = await supabase
            .from('warband_members')
            .select('*')
            .eq('warband_id', bandRow.id);

          set({
            warband: {
              id: bandRow.id,
              name: bandRow.name,
              inviteCode: bandRow.invite_code,
              members: Array.isArray(members)
                ? members.map((m: any) => ({
                    userId: m.user_id,
                    displayName: m.display_name,
                    weeklyDamage: m.week_start_date === weekStart ? Number(m.weekly_damage) || 0 : 0,
                    weeklyWorkouts: m.week_start_date === weekStart ? Number(m.weekly_workouts) || 0 : 0,
                    weeklyProteinDays: m.week_start_date === weekStart ? Number(m.weekly_protein_days) || 0 : 0,
                  }))
                : [],
            },
          });
          return { ok: true };
        } catch (err: any) {
          return { ok: false, error: err?.message ?? 'Unable to join Warband right now.' };
        }
      },

      syncWarbandDamage: (userId, displayName, weeklyStats) => {
        const cur = get().warband;
        if (!cur) return;
        const selfId = userId || 'local-warrior';
        const weekStart = getWeekStartKey();

        const updatedMembers = cur.members.some((m) => m.userId === selfId)
          ? cur.members.map((m) =>
              m.userId === selfId
                ? {
                    ...m,
                    displayName: displayName || m.displayName,
                    weeklyDamage: weeklyStats.damage,
                    weeklyWorkouts: weeklyStats.workouts,
                    weeklyProteinDays: weeklyStats.proteinDays,
                  }
                : m
            )
          : [
              ...cur.members,
              {
                userId: selfId,
                displayName: displayName || 'Warrior',
                weeklyDamage: weeklyStats.damage,
                weeklyWorkouts: weeklyStats.workouts,
                weeklyProteinDays: weeklyStats.proteinDays,
              },
            ];

        set({ warband: { ...cur, members: updatedMembers } });

        if (isRemoteUser(userId)) {
          Promise.resolve(
            supabase
              .from('warband_members')
              .update({
                display_name: displayName || 'Warrior',
                week_start_date: weekStart,
                weekly_damage: weeklyStats.damage,
                weekly_workouts: weeklyStats.workouts,
                weekly_protein_days: weeklyStats.proteinDays,
              })
              .eq('warband_id', cur.id)
              .eq('user_id', userId)
          ).catch(() => {});
        }
      },

      leaveWarband: async (userId) => {
        const cur = get().warband;
        set({ warband: null });
        if (cur && isRemoteUser(userId)) {
          try {
            await supabase
              .from('warband_members')
              .delete()
              .eq('warband_id', cur.id)
              .eq('user_id', userId);
          } catch {
            // ignore
          }
        }
      },

      hydrateFromSupabase: async (userId) => {
        if (!isRemoteUser(userId)) return;
        try {
          const [foodsRes, waterRes, weightsRes, sessionsRes, setsRes, glp1ProfRes, shotsRes] =
            await Promise.all([
              supabase
                .from('food_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(200),
              supabase
                .from('water_logs')
                .select('*')
                .eq('user_id', userId)
                .limit(30),
              supabase
                .from('weight_logs')
                .select('*')
                .eq('user_id', userId)
                .order('log_date', { ascending: true }),
              supabase
                .from('workout_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('completed_at', { ascending: false })
                .limit(60),
              supabase
                .from('workout_sets')
                .select('*')
                .eq('user_id', userId)
                .order('set_number', { ascending: true })
                .limit(500),
              supabase
                .from('glp1_profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle(),
              supabase
                .from('glp1_shots')
                .select('*')
                .eq('user_id', userId)
                .order('injected_at', { ascending: false })
                .limit(60),
            ]);

          const cur = get();
          const updates: Partial<TrackerState> = {};

          if (!foodsRes.error && Array.isArray(foodsRes.data) && foodsRes.data.length > 0) {
            const remoteFoods: FoodLogEntry[] = foodsRes.data.map((r: any) => ({
              id: r.id,
              logDate: r.log_date,
              mealSlot: r.meal_slot,
              name: r.name,
              brand: r.brand ?? undefined,
              portion: r.portion ?? undefined,
              calories: Number(r.calories) || 0,
              protein: Number(r.protein) || 0,
              carbs: Number(r.carbs) || 0,
              fat: Number(r.fat) || 0,
              source: r.source ?? 'manual',
              createdAt: r.created_at,
            }));
            const remoteIds = new Set(remoteFoods.map((f) => f.id));
            const localOnly = cur.foodLogs.filter((f) => !remoteIds.has(f.id));
            updates.foodLogs = [...remoteFoods, ...localOnly].sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt)
            );
          }

          if (!waterRes.error && Array.isArray(waterRes.data) && waterRes.data.length > 0) {
            const waterMap: Record<string, WaterDayLog> = { ...cur.waterByDate };
            for (const w of waterRes.data as any[]) {
              waterMap[w.log_date] = {
                glasses: Number(w.glasses) || 0,
                electrolytesTaken: Boolean(w.electrolytes_taken),
              };
            }
            updates.waterByDate = waterMap;
          }

          if (!weightsRes.error && Array.isArray(weightsRes.data) && weightsRes.data.length > 0) {
            const byDate = new Map<string, WeightLogEntry>();
            for (const lw of cur.weightLogs) byDate.set(lw.logDate, lw);
            for (const r of weightsRes.data as any[]) {
              byDate.set(r.log_date, {
                id: r.id,
                logDate: r.log_date,
                weightLbs: Number(r.weight_lbs),
                bodyFatPct: r.body_fat_pct != null ? Number(r.body_fat_pct) : undefined,
                waistIn: r.waist_in != null ? Number(r.waist_in) : undefined,
                notes: r.notes ?? undefined,
                createdAt: r.created_at,
              });
            }
            updates.weightLogs = Array.from(byDate.values()).sort((a, b) =>
              a.logDate.localeCompare(b.logDate)
            );
          }

          if (!sessionsRes.error && Array.isArray(sessionsRes.data) && sessionsRes.data.length > 0) {
            const setsBySession = new Map<string, WorkoutSetEntry[]>();
            if (!setsRes.error && Array.isArray(setsRes.data)) {
              for (const s of setsRes.data as any[]) {
                const list = setsBySession.get(s.session_id) ?? [];
                list.push({
                  id: s.id,
                  exerciseName: s.exercise_name,
                  muscleGroup: s.muscle_group,
                  setNumber: Number(s.set_number) || 1,
                  weightLbs: Number(s.weight_lbs) || 0,
                  reps: Number(s.reps) || 0,
                  estimated1rm: Number(s.estimated_1rm) || 0,
                  isPr: Boolean(s.is_pr),
                  completed: Boolean(s.completed),
                });
                setsBySession.set(s.session_id, list);
              }
            }
            const remoteSessions: WorkoutSessionEntry[] = sessionsRes.data.map((r: any) => ({
              id: r.id,
              split: r.split,
              name: r.name,
              startedAt: r.started_at,
              completedAt: r.completed_at,
              durationMin: Number(r.duration_min) || 0,
              totalVolumeLbs: Number(r.total_volume_lbs) || 0,
              glp1Phase: r.glp1_phase ?? undefined,
              notes: r.notes ?? undefined,
              sets: setsBySession.get(r.id) ?? [],
            }));
            const remoteIds = new Set(remoteSessions.map((s) => s.id));
            const localOnly = cur.workoutSessions.filter((s) => !remoteIds.has(s.id));
            updates.workoutSessions = [...remoteSessions, ...localOnly].sort((a, b) =>
              b.completedAt.localeCompare(a.completedAt)
            );
          }

          if (!glp1ProfRes.error && glp1ProfRes.data) {
            const p: any = glp1ProfRes.data;
            updates.glp1Profile = {
              enabled: Boolean(p.enabled),
              medication: (p.medication as Glp1MedicationKey) || 'semaglutide',
              brandName: p.brand_name || 'Ozempic / Wegovy',
              currentDoseMg: Number(p.current_dose_mg) || 0.5,
              shotIntervalDays: Number(p.shot_interval_days) || 7,
              phaseMode: (p.phase_mode as Glp1PhaseMode) || 'active',
              reverseDietStartDate: p.reverse_diet_start_date ?? null,
              reverseDietWeeklyBumpKcal: Number(p.reverse_diet_weekly_bump_kcal) || 75,
              proteinFloorG: Number(p.protein_floor_g) || 120,
            };
            if (p.enabled) updates.selectedSplit = 'GLP-1 Armor';
          }

          if (!shotsRes.error && Array.isArray(shotsRes.data) && shotsRes.data.length > 0) {
            const remoteShots: Glp1ShotEntry[] = shotsRes.data.map((r: any) => ({
              id: r.id,
              medication: (r.medication as Glp1MedicationKey) || 'semaglutide',
              doseMg: Number(r.dose_mg) || 0.25,
              injectionSite: r.injection_site,
              injectedAt: r.injected_at,
              nauseaLevel: Number(r.nausea_level) || 0,
              fatigueLevel: Number(r.fatigue_level) || 0,
              appetiteLevel: Number(r.appetite_level) || 2,
              notes: r.notes ?? undefined,
            }));
            const remoteIds = new Set(remoteShots.map((s) => s.id));
            const localOnly = cur.glp1Shots.filter((s) => !remoteIds.has(s.id));
            updates.glp1Shots = [...remoteShots, ...localOnly].sort((a, b) =>
              b.injectedAt.localeCompare(a.injectedAt)
            );
          }

          // Hydrate Warband membership if user joined one
          try {
            const { data: myMembership } = await supabase
              .from('warband_members')
              .select('warband_id')
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle();

            if (myMembership?.warband_id) {
              const [{ data: band }, { data: squad }] = await Promise.all([
                supabase
                  .from('warbands')
                  .select('id, name, invite_code')
                  .eq('id', myMembership.warband_id)
                  .single(),
                supabase
                  .from('warband_members')
                  .select('*')
                  .eq('warband_id', myMembership.warband_id),
              ]);
              if (band && Array.isArray(squad)) {
                const weekStart = getWeekStartKey();
                updates.warband = {
                  id: band.id,
                  name: band.name,
                  inviteCode: band.invite_code,
                  members: squad.map((m: any) => ({
                    userId: m.user_id,
                    displayName: m.display_name,
                    weeklyDamage: m.week_start_date === weekStart ? Number(m.weekly_damage) || 0 : 0,
                    weeklyWorkouts: m.week_start_date === weekStart ? Number(m.weekly_workouts) || 0 : 0,
                    weeklyProteinDays: m.week_start_date === weekStart ? Number(m.weekly_protein_days) || 0 : 0,
                  })),
                };
              }
            }
          } catch {
            // Warband migration optional
          }

          if (Object.keys(updates).length > 0) {
            set(updates);
          }
        } catch {
          // Migration might not be deployed yet — keep local state intact silently
        }
      },

      resetTracker: () => set({ ...INITIAL_DATA }),
    }),
    {
      name: 'viking-tracker-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        foodLogs: state.foodLogs,
        waterByDate: state.waterByDate,
        weightLogs: state.weightLogs,
        workoutSessions: state.workoutSessions,
        activeWorkout: state.activeWorkout,
        selectedSplit: state.selectedSplit,
        glp1Profile: state.glp1Profile,
        glp1Shots: state.glp1Shots,
        shieldWallPasses: state.shieldWallPasses,
        protectedWeeks: state.protectedWeeks,
        claimedCampaignWeeks: state.claimedCampaignWeeks,
        lastAdaptiveCheckinDate: state.lastAdaptiveCheckinDate,
        warband: state.warband,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
