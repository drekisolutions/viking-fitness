import {
  calculateTrendWeightEMA,
  getCalorieTarget,
  adjustCaloriesForPlan,
} from './calculations.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateKey(dt);
}

function daysBetween(startDateKey: string, endDateKey: string): number {
  const a = Date.parse(`${startDateKey}T00:00:00Z`);
  const b = Date.parse(`${endDateKey}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

export interface AdaptiveTDEEResult {
  ready: boolean;
  weightDaysLogged: number;
  foodDaysLogged: number;
  requiredDays: number;
  estimatedTdee: number;
  suggestedCalories: number;
  deltaKcal: number;
  confidence: 'calibrating' | 'medium' | 'high';
  reason: string;
}

export function calculateAdaptiveTDEE(params: {
  weightLogs: { logDate: string; weightLbs: number }[];
  foodLogs: { logDate: string; calories: number }[];
  staticTdee: number;
  goal: string;
  currentTargetCalories: number;
  isGlp1: boolean;
  windowEndDateKey?: string;
}): AdaptiveTDEEResult {
  const requiredDays = 7;
  const safeStatic = params.staticTdee > 0 ? params.staticTdee : 2200;
  const safeCurrent = params.currentTargetCalories > 0 ? params.currentTargetCalories : safeStatic;

  let endKey = params.windowEndDateKey;
  if (!endKey) {
    const allDates = [
      ...params.weightLogs.map((w) => w.logDate),
      ...params.foodLogs.map((f) => f.logDate),
    ].sort();
    endKey = allDates.length > 0 ? allDates[allDates.length - 1] : localDateKey();
  }
  const startKey = shiftDateKey(endKey, -20);

  // Deduplicate & sort weight entries inside 21-day window
  const weightByDate = new Map<string, number>();
  for (const w of params.weightLogs) {
    if (w.logDate >= startKey && w.logDate <= endKey && w.weightLbs > 0) {
      weightByDate.set(w.logDate, w.weightLbs);
    }
  }
  const windowWeights = Array.from(weightByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, weightLbs]) => ({ date, weightLbs }));

  // Aggregate food logs by date; ignore sparse incomplete logs (< 500 kcal)
  const calByDate = new Map<string, number>();
  for (const f of params.foodLogs) {
    if (f.logDate >= startKey && f.logDate <= endKey && f.calories > 0) {
      calByDate.set(f.logDate, (calByDate.get(f.logDate) ?? 0) + f.calories);
    }
  }
  const validCalDays = Array.from(calByDate.values()).filter((c) => c >= 500);

  const weightDaysLogged = windowWeights.length;
  const foodDaysLogged = validCalDays.length;
  const elapsedDays =
    weightDaysLogged >= 2
      ? daysBetween(windowWeights[0].date, windowWeights[windowWeights.length - 1].date)
      : 0;

  if (weightDaysLogged < requiredDays || foodDaysLogged < requiredDays || elapsedDays < 7) {
    return {
      ready: false,
      weightDaysLogged,
      foodDaysLogged,
      requiredDays,
      estimatedTdee: safeStatic,
      suggestedCalories: safeCurrent,
      deltaKcal: 0,
      confidence: 'calibrating',
      reason: `Log at least ${requiredDays} weigh-ins and ${requiredDays} full food days over 7+ days to calibrate true metabolism.`,
    };
  }

  const ema = calculateTrendWeightEMA(windowWeights, 0.2);
  const trendDeltaLbs = ema[ema.length - 1].trend - ema[0].trend;
  const dailyBalanceKcal = (trendDeltaLbs * 3500) / Math.max(7, elapsedDays);
  const avgDailyIntake =
    validCalDays.reduce((sum, c) => sum + c, 0) / validCalDays.length;

  const rawEstimatedTdee = Math.round(avgDailyIntake - dailyBalanceKcal);
  const estimatedTdee = Math.min(
    Math.round(safeStatic * 1.32),
    Math.max(Math.round(safeStatic * 0.72), rawEstimatedTdee)
  );

  const goalTarget = getCalorieTarget(estimatedTdee, params.goal);
  const idealTarget = adjustCaloriesForPlan(
    goalTarget,
    params.isGlp1 ? 'glp1' : 'balanced'
  );

  const floor = params.isGlp1 ? 900 : 1200;
  const clampedStep = Math.max(-150, Math.min(150, idealTarget - safeCurrent));
  const suggestedCalories = Math.max(floor, safeCurrent + clampedStep);
  const deltaKcal = suggestedCalories - safeCurrent;
  const confidence = foodDaysLogged >= 14 ? 'high' : 'medium';

  const trendLabel =
    trendDeltaLbs < -0.15
      ? `${Math.abs(Math.round(trendDeltaLbs * 10) / 10)} lbs down`
      : trendDeltaLbs > 0.15
      ? `${Math.round(trendDeltaLbs * 10) / 10} lbs up`
      : 'weight steady';

  const reason =
    deltaKcal === 0
      ? `Based on ${Math.round(avgDailyIntake)} avg kcal and ${trendLabel} over ${elapsedDays} days, your target is already dialed in.`
      : `Averaging ${Math.round(avgDailyIntake)} kcal/day with ${trendLabel} over ${elapsedDays}d estimates true TDEE at ${estimatedTdee} kcal (${deltaKcal > 0 ? `+${deltaKcal}` : deltaKcal} kcal step).`;

  return {
    ready: true,
    weightDaysLogged,
    foodDaysLogged,
    requiredDays,
    estimatedTdee,
    suggestedCalories,
    deltaKcal,
    confidence,
    reason,
  };
}

export interface IronRationsResult {
  trainingLoad: 'heavy' | 'moderate' | 'rest';
  bonusKcal: number;
  bonusCarbsG: number;
  adaptedCalories: number;
  adaptedCarbsG: number;
  nutritionBadge: string | null;
  lowRationsWarning: boolean;
  underfueledDays: number;
  liftingDirective: string | null;
}

export function getIronRationsCoupling(params: {
  todayDateKey?: string;
  todaySessions: {
    name: string;
    totalVolumeLbs: number;
    sets: { exerciseName: string; completed: boolean }[];
  }[];
  activeWorkout: {
    name: string;
    exercises: { name: string }[];
  } | null;
  recentFoodLogs: { logDate: string; calories: number; protein: number }[];
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  glp1Phase?: string;
}): IronRationsResult {
  const todayKey = params.todayDateKey ?? localDateKey();
  const safeCalories = params.baseCalories > 0 ? params.baseCalories : 2000;
  const safeProtein = params.baseProtein > 0 ? params.baseProtein : 140;
  const safeCarbs = params.baseCarbs > 0 ? params.baseCarbs : 180;

  const heavyPattern = /squat|deadlift|leg|lower|posterior|full[\s-]*body|armor/i;

  let trainingLoad: 'heavy' | 'moderate' | 'rest' = 'rest';
  for (const s of params.todaySessions) {
    const completedSets = s.sets.filter((x) => x.completed).length;
    const hasHeavyLift =
      heavyPattern.test(s.name) || s.sets.some((x) => heavyPattern.test(x.exerciseName));
    if (s.totalVolumeLbs >= 8000 || completedSets >= 12 || hasHeavyLift) {
      trainingLoad = 'heavy';
      break;
    }
    trainingLoad = 'moderate';
  }

  if (trainingLoad === 'rest' && params.activeWorkout) {
    const activeHeavy =
      heavyPattern.test(params.activeWorkout.name) ||
      params.activeWorkout.exercises.some((ex) => heavyPattern.test(ex.name));
    trainingLoad = activeHeavy ? 'heavy' : 'moderate';
  }

  let bonusKcal = 0;
  if (params.glp1Phase !== 'peak') {
    if (trainingLoad === 'heavy') {
      bonusKcal = Math.min(250, Math.round(safeCalories * 0.10));
    } else if (trainingLoad === 'moderate') {
      bonusKcal = Math.min(125, Math.round(safeCalories * 0.05));
    }
  }
  const bonusCarbsG = Math.round(bonusKcal / 4);

  const nutritionBadge =
    bonusKcal > 0
      ? `⚔ ${trainingLoad === 'heavy' ? 'Heavy Lift' : 'Training'} Refuel: +${bonusKcal} kcal / +${bonusCarbsG}g Carbs`
      : null;

  // Eating -> Lifting: check 3 calendar days prior to today
  const priorKeys = new Set([
    shiftDateKey(todayKey, -1),
    shiftDateKey(todayKey, -2),
    shiftDateKey(todayKey, -3),
  ]);
  const totalsByDay = new Map<string, { calories: number; protein: number }>();
  for (const f of params.recentFoodLogs) {
    if (!priorKeys.has(f.logDate)) continue;
    const prev = totalsByDay.get(f.logDate) ?? { calories: 0, protein: 0 };
    totalsByDay.set(f.logDate, {
      calories: prev.calories + (f.calories || 0),
      protein: prev.protein + (f.protein || 0),
    });
  }

  let underfueledDays = 0;
  for (const day of totalsByDay.values()) {
    if (day.calories < 300) continue; // ignore unlogged days
    if (day.protein < safeProtein * 0.75 || day.calories < safeCalories - 600) {
      underfueledDays += 1;
    }
  }

  const lowRationsWarning = underfueledDays >= 2;
  const liftingDirective = lowRationsWarning
    ? `Low Rations Detected (${underfueledDays}/3 prior days under target): keep working weight heavy on top sets, trim 1 back-off set to guard recovery.`
    : null;

  return {
    trainingLoad,
    bonusKcal,
    bonusCarbsG,
    adaptedCalories: safeCalories + bonusKcal,
    adaptedCarbsG: safeCarbs + bonusCarbsG,
    nutritionBadge,
    lowRationsWarning,
    underfueledDays,
    liftingDirective,
  };
}
