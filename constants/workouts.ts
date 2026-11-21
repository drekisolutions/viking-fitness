export type SplitKey = 'GLP-1 Armor' | 'PPL' | 'Upper/Lower' | 'Full Body';

export interface WorkoutExerciseTemplate {
  name: string;
  muscle: string;
  sets: number;
  glp1PeakSets: number;
  reps: string;
  restSec: number;
}

export interface WorkoutTemplate {
  id: string;
  split: SplitKey;
  dayLabel: string;
  name: string;
  muscleFocus: string;
  durationMin: number;
  accentColor: string;
  exercises: WorkoutExerciseTemplate[];
}

export const SPLITS: SplitKey[] = ['GLP-1 Armor', 'PPL', 'Upper/Lower', 'Full Body'];

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  // ── GLP-1 Armor (3-Day Strength & Lean-Mass Preservation) ────────────────────
  {
    id: 'glp1-day-1',
    split: 'GLP-1 Armor',
    dayLabel: 'DAY 1',
    name: 'FORGE LOWER & CORE',
    muscleFocus: 'Quads · Glutes · Hamstrings · Core',
    durationMin: 40,
    accentColor: '#AB47BC',
    exercises: [
      { name: 'Goblet or Barbell Squat', muscle: 'Quads & Glutes', sets: 3, glp1PeakSets: 2, reps: '6–8', restSec: 150 },
      { name: 'Romanian Deadlift', muscle: 'Hamstrings & Glutes', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 120 },
      { name: 'Leg Press or Split Squat', muscle: 'Quads', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 90 },
      { name: 'Seated Leg Curl', muscle: 'Hamstrings', sets: 2, glp1PeakSets: 2, reps: '10–12', restSec: 90 },
      { name: 'Pallof Press / Plank', muscle: 'Core', sets: 2, glp1PeakSets: 2, reps: '30–45s', restSec: 60 },
    ],
  },
  {
    id: 'glp1-day-2',
    split: 'GLP-1 Armor',
    dayLabel: 'DAY 2',
    name: 'SHIELD UPPER PUSH/PULL',
    muscleFocus: 'Chest · Back · Shoulders · Arms',
    durationMin: 42,
    accentColor: '#AB47BC',
    exercises: [
      { name: 'Incline DB or Barbell Bench', muscle: 'Chest & Front Delts', sets: 3, glp1PeakSets: 2, reps: '6–8', restSec: 150 },
      { name: 'Chest-Supported Row', muscle: 'Mid Back & Lats', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 120 },
      { name: 'Overhead DB Press', muscle: 'Shoulders', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 120 },
      { name: 'Lat Pulldown', muscle: 'Lats', sets: 3, glp1PeakSets: 2, reps: '8–12', restSec: 90 },
      { name: 'Face Pulls', muscle: 'Rear Delts', sets: 2, glp1PeakSets: 2, reps: '12–15', restSec: 60 },
    ],
  },
  {
    id: 'glp1-day-3',
    split: 'GLP-1 Armor',
    dayLabel: 'DAY 3',
    name: 'FULL-BODY COMPOUND ARMOR',
    muscleFocus: 'Posterior Chain · Push · Pull',
    durationMin: 40,
    accentColor: '#AB47BC',
    exercises: [
      { name: 'Trap Bar or Barbell Deadlift', muscle: 'Full Posterior Chain', sets: 3, glp1PeakSets: 2, reps: '5–6', restSec: 180 },
      { name: 'Flat Dumbbell Press', muscle: 'Chest & Triceps', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 120 },
      { name: 'Single-Arm DB Row', muscle: 'Back', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 90 },
      { name: 'Lateral Raises', muscle: 'Side Delts', sets: 3, glp1PeakSets: 2, reps: '12–15', restSec: 60 },
      { name: 'Farmer Carry', muscle: 'Grip & Core', sets: 2, glp1PeakSets: 2, reps: '40 yds', restSec: 90 },
    ],
  },

  // ── PPL ────────────────────────────────────────────────────────────────────
  {
    id: 'ppl-push',
    split: 'PPL',
    dayLabel: 'DAY 1',
    name: 'PUSH DAY A',
    muscleFocus: 'Chest · Shoulders · Triceps',
    durationMin: 52,
    accentColor: '#D6A756',
    exercises: [
      { name: 'Barbell Bench Press', muscle: 'Chest', sets: 4, glp1PeakSets: 3, reps: '6–8', restSec: 180 },
      { name: 'Incline DB Press', muscle: 'Upper Chest', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 120 },
      { name: 'Overhead Press', muscle: 'Shoulders', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 150 },
      { name: 'Lateral Raises', muscle: 'Side Delts', sets: 4, glp1PeakSets: 3, reps: '12–15', restSec: 75 },
      { name: 'Tricep Rope Pushdown', muscle: 'Triceps', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 75 },
    ],
  },
  {
    id: 'ppl-pull',
    split: 'PPL',
    dayLabel: 'DAY 2',
    name: 'PULL DAY A',
    muscleFocus: 'Back · Biceps · Rear Delts',
    durationMin: 55,
    accentColor: '#4BA3FF',
    exercises: [
      { name: 'Weighted Pull-Ups / Pulldown', muscle: 'Lats', sets: 4, glp1PeakSets: 3, reps: '6–10', restSec: 150 },
      { name: 'Barbell Bent-Over Row', muscle: 'Mid Back', sets: 4, glp1PeakSets: 3, reps: '8–10', restSec: 150 },
      { name: 'Seated Cable Row', muscle: 'Rhomboids & Lats', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 90 },
      { name: 'Face Pulls', muscle: 'Rear Delts', sets: 3, glp1PeakSets: 2, reps: '15', restSec: 60 },
      { name: 'Incline DB Curl', muscle: 'Biceps', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 75 },
    ],
  },
  {
    id: 'ppl-legs',
    split: 'PPL',
    dayLabel: 'DAY 3',
    name: 'LEG DAY A',
    muscleFocus: 'Quads · Hamstrings · Calves',
    durationMin: 60,
    accentColor: '#3FB950',
    exercises: [
      { name: 'Barbell Back Squat', muscle: 'Quads & Glutes', sets: 4, glp1PeakSets: 3, reps: '6–8', restSec: 180 },
      { name: 'Romanian Deadlift', muscle: 'Hamstrings', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 150 },
      { name: 'Leg Press', muscle: 'Quads', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 120 },
      { name: 'Lying Leg Curl', muscle: 'Hamstrings', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 90 },
      { name: 'Standing Calf Raise', muscle: 'Calves', sets: 4, glp1PeakSets: 3, reps: '12–15', restSec: 60 },
    ],
  },

  // ── Upper / Lower ──────────────────────────────────────────────────────────
  {
    id: 'ul-upper-a',
    split: 'Upper/Lower',
    dayLabel: 'DAY 1',
    name: 'UPPER STRENGTH',
    muscleFocus: 'Chest · Back · Shoulders · Arms',
    durationMin: 50,
    accentColor: '#D6A756',
    exercises: [
      { name: 'Barbell Bench Press', muscle: 'Chest', sets: 4, glp1PeakSets: 3, reps: '5–8', restSec: 180 },
      { name: 'Chest-Supported Row', muscle: 'Back', sets: 4, glp1PeakSets: 3, reps: '6–10', restSec: 120 },
      { name: 'Overhead DB Press', muscle: 'Shoulders', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 120 },
      { name: 'Lat Pulldown', muscle: 'Lats', sets: 3, glp1PeakSets: 2, reps: '8–12', restSec: 90 },
      { name: 'EZ-Bar Curl & Pushdown Superset', muscle: 'Arms', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 75 },
    ],
  },
  {
    id: 'ul-lower-a',
    split: 'Upper/Lower',
    dayLabel: 'DAY 2',
    name: 'LOWER POWER',
    muscleFocus: 'Quads · Hamstrings · Glutes · Core',
    durationMin: 50,
    accentColor: '#4BA3FF',
    exercises: [
      { name: 'Barbell Back Squat', muscle: 'Quads & Glutes', sets: 4, glp1PeakSets: 3, reps: '5–8', restSec: 180 },
      { name: 'Romanian Deadlift', muscle: 'Hamstrings', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 150 },
      { name: 'Bulgarian Split Squat', muscle: 'Quads & Glutes', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 90 },
      { name: 'Seated Leg Curl', muscle: 'Hamstrings', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 75 },
      { name: 'Hanging Knee Raise', muscle: 'Core', sets: 3, glp1PeakSets: 2, reps: '10–15', restSec: 60 },
    ],
  },

  // ── Full Body ──────────────────────────────────────────────────────────────
  {
    id: 'fb-odin-a',
    split: 'Full Body',
    dayLabel: 'DAY 1',
    name: 'VALHALLA FULL BODY A',
    muscleFocus: 'Squat · Bench · Row · Delts',
    durationMin: 45,
    accentColor: '#D6A756',
    exercises: [
      { name: 'Barbell Back Squat', muscle: 'Quads & Glutes', sets: 3, glp1PeakSets: 2, reps: '6–8', restSec: 150 },
      { name: 'Barbell Bench Press', muscle: 'Chest', sets: 3, glp1PeakSets: 2, reps: '6–8', restSec: 150 },
      { name: 'Single-Arm DB Row', muscle: 'Back', sets: 3, glp1PeakSets: 2, reps: '8–10', restSec: 90 },
      { name: 'Lateral Raises', muscle: 'Side Delts', sets: 3, glp1PeakSets: 2, reps: '12–15', restSec: 60 },
    ],
  },
  {
    id: 'fb-odin-b',
    split: 'Full Body',
    dayLabel: 'DAY 2',
    name: 'VALHALLA FULL BODY B',
    muscleFocus: 'Deadlift · OHP · Pulldown · Quads',
    durationMin: 45,
    accentColor: '#4BA3FF',
    exercises: [
      { name: 'Deadlift', muscle: 'Posterior Chain', sets: 3, glp1PeakSets: 2, reps: '5–6', restSec: 180 },
      { name: 'Overhead Press', muscle: 'Shoulders', sets: 3, glp1PeakSets: 2, reps: '6–8', restSec: 120 },
      { name: 'Lat Pulldown', muscle: 'Lats', sets: 3, glp1PeakSets: 2, reps: '8–12', restSec: 90 },
      { name: 'Leg Press', muscle: 'Quads', sets: 3, glp1PeakSets: 2, reps: '10–12', restSec: 90 },
    ],
  },
];

export function getWorkoutsForSplit(split: SplitKey): WorkoutTemplate[] {
  return WORKOUT_TEMPLATES.filter((w) => w.split === split);
}

export function getWorkoutById(id: string): WorkoutTemplate {
  return WORKOUT_TEMPLATES.find((w) => w.id === id) ?? WORKOUT_TEMPLATES[0];
}
