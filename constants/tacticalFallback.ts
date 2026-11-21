import { CURATED_FOODS } from './foods.ts';
import type { WorkoutTemplate, WorkoutExerciseTemplate } from './workouts.ts';

export type PivotConstraint =
  | '25_min'
  | 'hotel_db'
  | 'low_energy'
  | 'lower_back'
  | 'busy_gym';

export const PIVOT_CONSTRAINTS: {
  key: PivotConstraint;
  label: string;
  shortDesc: string;
}[] = [
  { key: '25_min', label: '25 Min Rush', shortDesc: 'Top compounds, short rest' },
  { key: 'hotel_db', label: 'Hotel / DB Only', shortDesc: 'Dumbbells & bodyweight swaps' },
  { key: 'low_energy', label: 'Low Energy / GLP-1', shortDesc: 'Trim junk sets, keep top weight' },
  { key: 'lower_back', label: 'Back-Safe', shortDesc: 'Zero axial spinal loading' },
  { key: 'busy_gym', label: 'Busy Gym', shortDesc: 'Zero-wait bench/rack alternatives' },
];

export interface WorkoutPivotPlan {
  title: string;
  focus: string;
  durationMin: number;
  rationale: string;
  exercises: WorkoutExerciseTemplate[];
}

const HOTEL_DB_SWAPS: { match: RegExp; name: string; muscle?: string }[] = [
  { match: /back squat|goblet/i, name: 'Dumbbell Goblet Squat' },
  { match: /deadlift|romanian/i, name: 'Dumbbell Romanian Deadlift' },
  { match: /leg press/i, name: 'Dumbbell Bulgarian Split Squat' },
  { match: /leg curl/i, name: 'Dumbbell Hamstring Floor Curl / Bridge' },
  { match: /calf/i, name: 'Single-Leg Dumbbell Calf Raise' },
  { match: /barbell bench/i, name: 'Flat Dumbbell Press' },
  { match: /pulldown|pull-up/i, name: 'Bent-Over Two-Arm Dumbbell Row' },
  { match: /cable row|chest-supported|bent-over row/i, name: 'Single-Arm Dumbbell Row' },
  { match: /rope pushdown|pushdown/i, name: 'Overhead Dumbbell Tricep Ext.' },
  { match: /ez-bar|curl/i, name: 'Alternating Dumbbell Curl' },
  { match: /face pull/i, name: 'Rear Delt Dumbbell Fly' },
];

const LOWER_BACK_SWAPS: { match: RegExp; name: string; muscle?: string }[] = [
  { match: /back squat|goblet/i, name: 'Leg Press or Belt Squat' },
  { match: /trap bar|barbell deadlift|deadlift/i, name: 'Dumbbell Hip Thrust' },
  { match: /romanian/i, name: 'Seated Leg Curl' },
  { match: /bent-over row/i, name: 'Chest-Supported Machine / DB Row' },
  { match: /overhead press|ohp/i, name: 'Seated Back-Supported DB Press' },
];

const BUSY_GYM_SWAPS: { match: RegExp; name: string }[] = [
  { match: /barbell bench/i, name: 'Seated Chest Press Machine or DB Press' },
  { match: /back squat/i, name: 'Hack Squat or Dumbbell Split Squat' },
  { match: /barbell deadlift|trap bar/i, name: '45° Back Extension + Dumbbell RDL' },
  { match: /cable row/i, name: 'Chest-Supported DB Row' },
];

function swapExerciseName(
  name: string,
  rules: { match: RegExp; name: string }[]
): string {
  for (const rule of rules) {
    if (rule.match.test(name)) return rule.name;
  }
  return name;
}

export function buildLocalWorkoutPivot(
  template: WorkoutTemplate,
  constraint: PivotConstraint
): WorkoutPivotPlan {
  const baseExercises = template.exercises;

  if (constraint === '25_min') {
    const trimmed = baseExercises.slice(0, 4).map((ex, idx) => ({
      ...ex,
      sets: idx < 2 ? Math.min(3, ex.sets) : 2,
      glp1PeakSets: 2,
      restSec: Math.min(75, ex.restSec),
    }));
    return {
      title: `${template.name} · 25m BLITZ`,
      focus: template.muscleFocus,
      durationMin: 25,
      rationale:
        'Keeps your top compound movements with crisp 60–75s rest intervals to finish strong in 25 minutes.',
      exercises: trimmed,
    };
  }

  if (constraint === 'hotel_db') {
    const swapped = baseExercises.map((ex) => ({
      ...ex,
      name: swapExerciseName(ex.name, HOTEL_DB_SWAPS),
    }));
    return {
      title: `${template.name} · HOTEL DB`,
      focus: template.muscleFocus,
      durationMin: Math.max(30, template.durationMin - 5),
      rationale:
        'Every barbell and cable lift converted to dumbbells or bodyweight so you never miss a session while traveling.',
      exercises: swapped,
    };
  }

  if (constraint === 'low_energy') {
    const preserved = baseExercises.map((ex) => ({
      ...ex,
      sets: ex.glp1PeakSets,
      glp1PeakSets: ex.glp1PeakSets,
      restSec: ex.restSec + 15,
    }));
    return {
      title: `${template.name} · SHIELD PRESERVE`,
      focus: template.muscleFocus,
      durationMin: Math.max(25, template.durationMin - 15),
      rationale:
        'Drops fatiguing back-off sets while keeping heavy working stimulus intact to guard lean muscle on low energy.',
      exercises: preserved,
    };
  }

  if (constraint === 'lower_back') {
    const safe = baseExercises.map((ex) => ({
      ...ex,
      name: swapExerciseName(ex.name, LOWER_BACK_SWAPS),
      restSec: ex.restSec,
    }));
    return {
      title: `${template.name} · BACK-SAFE`,
      focus: template.muscleFocus,
      durationMin: template.durationMin,
      rationale:
        'Eliminates axial spinal compression while keeping targeted chest, quad, hamstring, and back tension high.',
      exercises: safe,
    };
  }

  // busy_gym
  const agile = baseExercises.map((ex) => ({
    ...ex,
    name: swapExerciseName(ex.name, BUSY_GYM_SWAPS),
  }));
  return {
    title: `${template.name} · AGILE GYM`,
    focus: template.muscleFocus,
    durationMin: template.durationMin,
    rationale:
      'Replaces high-wait squat racks and flat benches with faster machine/dumbbell alternatives.',
    exercises: agile,
  };
}

export interface SalvageOption {
  id: string;
  category: string;
  title: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string;
}

export function buildLocalSalvageOptions(params: {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  isGlp1: boolean;
}): SalvageOption[] {
  const remCal = Math.max(200, Math.round(params.remainingCalories));
  const remPro = Math.max(20, Math.round(params.remainingProtein));

  // Option 1: Zero-Cook Protein Shield Rescue
  const needDoubleShake = remPro >= 45;
  const zeroCookCal = needDoubleShake ? 360 : 250;
  const zeroCookPro = needDoubleShake ? 50 : 48;
  const zeroCookCarb = needDoubleShake ? 12 : 10;
  const zeroCookFat = needDoubleShake ? 5 : 1;

  // Option 2: Home Quick-Cook Skillet / Bowl
  const extraCarbMode = remCal >= 550 && !params.isGlp1;
  const homeCal = extraCarbMode ? Math.min(remCal, 580) : Math.min(remCal, 390);
  const homePro = Math.min(remPro + 8, extraCarbMode ? 56 : 45);
  const homeCarb = extraCarbMode ? 48 : 22;
  const homeFat = extraCarbMode ? 12 : 8;

  // Option 3: Fast-Casual Clean Pick
  const fcCal = Math.min(remCal, params.isGlp1 ? 420 : 620);
  const fcPro = Math.min(remPro + 10, params.isGlp1 ? 44 : 58);
  const fcCarb = params.isGlp1 ? 26 : 52;
  const fcFat = params.isGlp1 ? 12 : 18;

  return [
    {
      id: 'salvage-zerocook',
      category: 'Zero-Cook / Grocery',
      title: 'Protein Shield Micro-Stack',
      items: needDoubleShake
        ? ['1 Fairlife Core Power Shake', '1 cup 0% Greek Yogurt + berries']
        : ['1 scoop Whey Isolate in water', '1 cup 0% Nonfat Greek Yogurt'],
      calories: zeroCookCal,
      protein: zeroCookPro,
      carbs: zeroCookCarb,
      fat: zeroCookFat,
      note: `Hits ${zeroCookPro}g protein with minimal calories/fat — ideal when you have ${remCal} kcal left.`,
    },
    {
      id: 'salvage-home',
      category: 'Home 10-Min Cook',
      title: extraCarbMode ? 'Lean Chicken & Jasmine Rice Bowl' : 'Egg White & Chicken Skillet',
      items: extraCarbMode
        ? ['6 oz grilled chicken breast', '1 cup jasmine rice', '2 cups steamed broccoli']
        : ['1 cup egg whites + 3 oz chicken breast', '½ cup mashed sweet potato'],
      calories: homeCal,
      protein: homePro,
      carbs: homeCarb,
      fat: homeFat,
      note: 'High-satiety whole foods tuned to close your remaining macro gap cleanly.',
    },
    {
      id: 'salvage-fastcasual',
      category: 'Fast-Casual Order',
      title: params.isGlp1
        ? 'Double-Chicken Salad (Light Dressing)'
        : 'Double-Chicken Burrito Bowl (No Queso/Sour Cream)',
      items: params.isGlp1
        ? ['Double grilled chicken', 'Romaine + tomato salsa', 'Skip heavy oils/cream']
        : ['Double grilled chicken', '½ rice + black beans', 'Fajita veggies + pico de gallo'],
      calories: fcCal,
      protein: fcPro,
      carbs: fcCarb,
      fat: fcFat,
      note: 'Order out without blowing the day — skips hidden oils while locking in protein.',
    },
  ];
}

export interface ParsedFoodItem {
  id: string;
  rawText: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'high' | 'medium' | 'estimated';
  selected: boolean;
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  half: 0.5,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

const FOOD_SYNONYMS: {
  match: RegExp;
  name: string;
  unitPortion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}[] = [
  { match: /egg\s*white/i, name: 'Egg Whites (1/2 cup)', unitPortion: '½ cup', calories: 63, protein: 13, carbs: 1, fat: 0 },
  { match: /\beggs?\b/i, name: 'Large Egg', unitPortion: '1 large egg', calories: 72, protein: 6.3, carbs: 0.5, fat: 5 },
  { match: /fairlife/i, name: 'Fairlife Core Power Shake', unitPortion: '1 bottle', calories: 170, protein: 26, carbs: 5, fat: 4.5 },
  { match: /whey|protein\s*shake|protein\s*powder/i, name: 'Whey Isolate Scoop', unitPortion: '1 scoop', calories: 120, protein: 25, carbs: 2, fat: 1 },
  { match: /greek\s*yogurt|yogurt/i, name: '0% Nonfat Greek Yogurt', unitPortion: '1 cup', calories: 130, protein: 23, carbs: 8, fat: 0 },
  { match: /cottage\s*cheese/i, name: 'Low-Fat Cottage Cheese', unitPortion: '¾ cup', calories: 120, protein: 21, carbs: 4, fat: 3 },
  { match: /chicken/i, name: 'Grilled Chicken Breast (4 oz)', unitPortion: '4 oz', calories: 185, protein: 35, carbs: 0, fat: 4 },
  { match: /turkey/i, name: 'Lean Ground / Deli Turkey', unitPortion: '4 oz', calories: 170, protein: 26, carbs: 1, fat: 6 },
  { match: /steak|sirloin|ribeye|beef/i, name: 'Lean Beef / Steak', unitPortion: '5 oz', calories: 270, protein: 36, carbs: 0, fat: 13 },
  { match: /salmon/i, name: 'Atlantic Salmon', unitPortion: '5 oz', calories: 290, protein: 32, carbs: 0, fat: 18 },
  { match: /tuna/i, name: 'Light Tuna Pouch', unitPortion: '1 pouch', calories: 70, protein: 17, carbs: 0, fat: 0.5 },
  { match: /shrimp/i, name: 'Steamed Shrimp', unitPortion: '5 oz', calories: 140, protein: 30, carbs: 0, fat: 1.5 },
  { match: /cod|tilapia|fish/i, name: 'Baked White Fish', unitPortion: '5 oz', calories: 120, protein: 26, carbs: 0, fat: 1 },
  { match: /bone\s*broth/i, name: 'Bone Broth', unitPortion: '1 cup', calories: 45, protein: 10, carbs: 1, fat: 0 },
  { match: /tofu/i, name: 'Firm Tofu', unitPortion: '6 oz', calories: 150, protein: 16, carbs: 3, fat: 9 },
  { match: /oats|oatmeal/i, name: 'Rolled Oats (1/2 cup dry)', unitPortion: '½ cup dry', calories: 150, protein: 5, carbs: 27, fat: 3 },
  { match: /rice/i, name: 'Cooked Rice', unitPortion: '1 cup', calories: 205, protein: 4, carbs: 45, fat: 0.5 },
  { match: /sourdough|toast|bread/i, name: 'Sourdough / Whole Toast', unitPortion: '1 slice', calories: 120, protein: 4, carbs: 24, fat: 0.5 },
  { match: /banana/i, name: 'Medium Banana', unitPortion: '1 banana', calories: 105, protein: 1, carbs: 27, fat: 0.4 },
  { match: /berr(y|ies)/i, name: 'Mixed Berries', unitPortion: '1 cup', calories: 80, protein: 1, carbs: 19, fat: 0.5 },
  { match: /sweet\s*potato/i, name: 'Sweet Potato', unitPortion: '1 medium', calories: 115, protein: 2, carbs: 26, fat: 0 },
  { match: /avocado/i, name: 'Avocado', unitPortion: '½ avocado', calories: 120, protein: 1.5, carbs: 6, fat: 11 },
  { match: /peanut\s*butter/i, name: 'Peanut Butter', unitPortion: '1 tbsp', calories: 95, protein: 3.5, carbs: 3.5, fat: 8 },
  { match: /olive\s*oil/i, name: 'Olive Oil', unitPortion: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14 },
  { match: /butter/i, name: 'Butter', unitPortion: '1 tbsp', calories: 100, protein: 0, carbs: 0, fat: 11 },
  { match: /broccoli|veggie|greens/i, name: 'Steamed Vegetables', unitPortion: '1.5 cups', calories: 50, protein: 3.5, carbs: 10, fat: 0.5 },
  { match: /bacon/i, name: 'Bacon Strip', unitPortion: '1 strip', calories: 43, protein: 3, carbs: 0, fat: 3.3 },
];

export function parseFoodTextLocally(inputText: string): ParsedFoodItem[] {
  const chunks = inputText
    .split(/,|\band\b|\+|\n/gi)
    .map((c) => c.trim())
    .filter(Boolean);

  return chunks.map((rawText, idx) => {
    let qty = 1;
    const numMatch = rawText.match(/^(\d+(?:\.\d+)?)\s+/);
    if (numMatch) {
      qty = Math.min(12, Math.max(0.25, Number(numMatch[1]) || 1));
    } else {
      const firstWord = rawText.split(/\s+/)[0]?.toLowerCase() ?? '';
      if (WORD_NUMBERS[firstWord] != null) {
        qty = WORD_NUMBERS[firstWord];
      }
    }

    // 1. Check rich synonym table first
    for (const syn of FOOD_SYNONYMS) {
      if (syn.match.test(rawText)) {
        return {
          id: `parsed-${idx}-${Date.now()}`,
          rawText,
          name: syn.name,
          portion: qty === 1 ? syn.unitPortion : `${qty} × ${syn.unitPortion}`,
          calories: Math.round(syn.calories * qty),
          protein: Math.round(syn.protein * qty * 10) / 10,
          carbs: Math.round(syn.carbs * qty * 10) / 10,
          fat: Math.round(syn.fat * qty * 10) / 10,
          confidence: 'high',
          selected: true,
        };
      }
    }

    // 2. Fallback match against CURATED_FOODS
    const lower = rawText.toLowerCase();
    const curatedMatch = CURATED_FOODS.find((f) =>
      lower.includes(f.name.toLowerCase().split(' ')[0])
    );
    if (curatedMatch) {
      return {
        id: `parsed-${idx}-${Date.now()}`,
        rawText,
        name: curatedMatch.name,
        portion: qty === 1 ? curatedMatch.portion : `${qty} × ${curatedMatch.portion}`,
        calories: Math.round(curatedMatch.calories * qty),
        protein: Math.round(curatedMatch.protein * qty * 10) / 10,
        carbs: Math.round(curatedMatch.carbs * qty * 10) / 10,
        fat: Math.round(curatedMatch.fat * qty * 10) / 10,
        confidence: 'medium',
        selected: true,
      };
    }

    // 3. Conservative generic estimate so user can edit cleanly
    return {
      id: `parsed-${idx}-${Date.now()}`,
      rawText,
      name: rawText.replace(/^(\d+(?:\.\d+)?)\s+/, ''),
      portion: qty === 1 ? '1 serving (est.)' : `${qty} servings (est.)`,
      calories: Math.round(220 * qty),
      protein: Math.round(14 * qty),
      carbs: Math.round(22 * qty),
      fat: Math.round(8 * qty),
      confidence: 'estimated',
      selected: true,
    };
  });
}
