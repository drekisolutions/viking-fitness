import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdaptiveTDEE,
  getIronRationsCoupling,
} from '../constants/adaptive.ts';
import {
  buildLocalWorkoutPivot,
  buildLocalSalvageOptions,
  parseFoodTextLocally,
} from '../constants/tacticalFallback.ts';
import { WORKOUT_TEMPLATES } from '../constants/workouts.ts';

test('Adaptive TDEE reports calibrating before 7 days of weigh-ins & food logs', () => {
  const res = calculateAdaptiveTDEE({
    weightLogs: [
      { logDate: '2026-11-18', weightLbs: 185 },
      { logDate: '2026-11-19', weightLbs: 184.5 },
    ],
    foodLogs: [{ logDate: '2026-11-19', calories: 1900 }],
    staticTdee: 2400,
    goal: 'cut',
    currentTargetCalories: 1920,
    isGlp1: false,
  });

  assert.equal(res.ready, false);
  assert.equal(res.confidence, 'calibrating');
  assert.equal(res.weightDaysLogged, 2);
  assert.equal(res.foodDaysLogged, 1);
  assert.equal(res.suggestedCalories, 1920);
});

test('Adaptive TDEE detects higher expenditure when user loses faster than intake implies, clamped to ±150 kcal', () => {
  // Eating 2000 kcal/day over 14 days while dropping 2.0 lbs -> ~500 kcal/day deficit -> TDEE ~2500 (higher than 2200 static)
  const weightLogs = Array.from({ length: 14 }, (_, i) => ({
    logDate: `2026-11-${String(i + 1).padStart(2, '0')}`,
    weightLbs: 200 - (i * 2.0) / 13,
  }));
  const foodLogs = Array.from({ length: 14 }, (_, i) => ({
    logDate: `2026-11-${String(i + 1).padStart(2, '0')}`,
    calories: 2000,
  }));

  const res = calculateAdaptiveTDEE({
    weightLogs,
    foodLogs,
    staticTdee: 2200,
    goal: 'cut',
    currentTargetCalories: 1760,
    isGlp1: false,
    windowEndDateKey: '2026-11-14',
  });

  assert.equal(res.ready, true);
  assert.equal(res.confidence, 'high');
  assert.ok(res.estimatedTdee > 2350);
  assert.ok(Math.abs(res.deltaKcal) <= 150);
  assert.ok(res.suggestedCalories > 1760);
});

test('Iron <-> Rations coupling boosts carbs on heavy leg days unless GLP-1 Peak Phase suppresses it', () => {
  const heavyLegDay = getIronRationsCoupling({
    todayDateKey: '2026-11-20',
    todaySessions: [
      {
        name: 'LEG DAY A',
        totalVolumeLbs: 9500,
        sets: [
          { exerciseName: 'Barbell Back Squat', completed: true },
          { exerciseName: 'Romanian Deadlift', completed: true },
        ],
      },
    ],
    activeWorkout: null,
    recentFoodLogs: [],
    baseCalories: 2200,
    baseProtein: 160,
    baseCarbs: 220,
    baseFat: 70,
  });

  assert.equal(heavyLegDay.trainingLoad, 'heavy');
  assert.equal(heavyLegDay.bonusKcal, 220);
  assert.equal(heavyLegDay.bonusCarbsG, 55);
  assert.equal(heavyLegDay.adaptedCalories, 2420);

  const glp1Peak = getIronRationsCoupling({
    todayDateKey: '2026-11-20',
    todaySessions: [
      {
        name: 'FORGE LOWER & CORE',
        totalVolumeLbs: 8500,
        sets: [{ exerciseName: 'Goblet or Barbell Squat', completed: true }],
      },
    ],
    activeWorkout: null,
    recentFoodLogs: [],
    baseCalories: 1050,
    baseProtein: 120,
    baseCarbs: 90,
    baseFat: 18,
    glp1Phase: 'peak',
  });

  assert.equal(glp1Peak.bonusKcal, 0);
  assert.equal(glp1Peak.adaptedCalories, 1050);
});

test('Iron <-> Rations raises Low Rations Fatigue Guard after 2+ underfueled prior days', () => {
  const coupled = getIronRationsCoupling({
    todayDateKey: '2026-11-20',
    todaySessions: [],
    activeWorkout: null,
    recentFoodLogs: [
      { logDate: '2026-11-19', calories: 1100, protein: 70 },
      { logDate: '2026-11-18', calories: 1200, protein: 80 },
      { logDate: '2026-11-17', calories: 2200, protein: 160 },
    ],
    baseCalories: 2200,
    baseProtein: 160,
    baseCarbs: 220,
    baseFat: 70,
  });

  assert.equal(coupled.lowRationsWarning, true);
  assert.equal(coupled.underfueledDays, 2);
  assert.ok(coupled.liftingDirective && coupled.liftingDirective.includes('Low Rations Detected'));
});

test('Battlefield tactical fallbacks adapt workouts, salvage meals, and parse multi-food text', () => {
  const pplLegs = WORKOUT_TEMPLATES.find((w) => w.id === 'ppl-legs')!;

  const rush = buildLocalWorkoutPivot(pplLegs, '25_min');
  assert.equal(rush.durationMin, 25);
  assert.ok(rush.exercises.length <= 4);

  const hotel = buildLocalWorkoutPivot(pplLegs, 'hotel_db');
  assert.ok(hotel.exercises.some((e) => /dumbbell/i.test(e.name)));

  const backSafe = buildLocalWorkoutPivot(pplLegs, 'lower_back');
  assert.ok(!backSafe.exercises.some((e) => /barbell back squat/i.test(e.name)));

  const salvage = buildLocalSalvageOptions({
    remainingCalories: 500,
    remainingProtein: 55,
    remainingCarbs: 40,
    remainingFat: 12,
    isGlp1: true,
  });
  assert.equal(salvage.length, 3);
  assert.ok(salvage[0].protein >= 40);

  const parsed = parseFoodTextLocally('2 eggs, 1 cup Greek yogurt, 1 banana');
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].calories, 144); // 2 * 72
  assert.equal(parsed[1].protein, 23);
  assert.equal(parsed[2].calories, 105);
});
