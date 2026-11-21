import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBMI,
  getBMICategory,
  calculateTDEE,
  getCalorieTarget,
  adjustCaloriesForPlan,
  getMacros,
  calculateEpley1RM,
  calculateRelativeStrength,
  calculateTrendWeightEMA,
  scaleMealToTarget,
  computeWarriorRank,
} from '../constants/calculations.ts';

test('BMI calculation and category classification', () => {
  const bmi = calculateBMI(180, 70);
  assert.ok(Math.abs(bmi - 25.82) < 0.05);
  assert.equal(getBMICategory(17.9), 'Underweight');
  assert.equal(getBMICategory(22.4), 'Healthy');
  assert.equal(getBMICategory(27.0), 'Overweight');
  assert.equal(getBMICategory(31.5), 'Obese');
  assert.equal(calculateBMI(180, 0), 0);
});

test('Mifflin-St Jeor TDEE and goal targets', () => {
  const maleTdee = calculateTDEE(180, 70, 30, 'male', 1.55);
  const femaleTdee = calculateTDEE(150, 65, 30, 'female', 1.375);
  assert.ok(maleTdee > 2600 && maleTdee < 2900);
  assert.ok(femaleTdee > 1800 && femaleTdee < 2100);

  assert.equal(getCalorieTarget(2500, 'cut'), 2000);
  assert.equal(getCalorieTarget(2500, 'build'), 2750);
  assert.equal(getCalorieTarget(2500, 'recomp'), 2500);
  assert.equal(getCalorieTarget(2500, 'maintain'), 2500);
});

test('GLP-1 calorie clamp stays strictly within 900–1200 kcal', () => {
  assert.equal(adjustCaloriesForPlan(1200, 'glp1'), 900);
  assert.equal(adjustCaloriesForPlan(1800, 'glp1'), 1080);
  assert.equal(adjustCaloriesForPlan(3000, 'glp1'), 1200);
  assert.equal(adjustCaloriesForPlan(2400, 'high-protein'), 2400);
});

test('Macro splits match target percentages', () => {
  const hp = getMacros(2000, 'high-protein');
  assert.equal(hp.protein, 200);
  assert.equal(hp.carbs, 175);
  assert.equal(hp.fat, 56);

  const glp1 = getMacros(1200, 'glp1');
  assert.equal(glp1.protein, 126);
  assert.equal(glp1.carbs, 84);
  assert.equal(glp1.fat, 40);
});

test('Epley 1RM and Relative Strength calculation', () => {
  assert.equal(calculateEpley1RM(225, 1), 225);
  assert.equal(calculateEpley1RM(225, 5), 263);
  assert.equal(calculateEpley1RM(0, 10), 0);
  assert.equal(calculateEpley1RM(225, 0), 0);
  assert.equal(calculateRelativeStrength(270, 180), 1.5);
});

test('EMA trend weight smooths noisy daily fluctuations and sorts by date', () => {
  const result = calculateTrendWeightEMA(
    [
      { date: '2026-11-03', weightLbs: 199.0 },
      { date: '2026-11-01', weightLbs: 200.0 },
      { date: '2026-11-02', weightLbs: 202.0 },
    ],
    0.25
  );
  assert.equal(result.length, 3);
  assert.equal(result[0].date, '2026-11-01');
  assert.equal(result[0].trend, 200);
  // Day 2: 0.25 * 202 + 0.75 * 200 = 200.5
  assert.equal(result[1].trend, 200.5);
  // Day 3: 0.25 * 199 + 0.75 * 200.5 = 200.125 -> 200.13
  assert.equal(result[2].trend, 200.13);
});

test('Meal scaling clamps scale factor between 0.6 and 1.8', () => {
  const base = { calories: 500, protein: 40, carbs: 50, fat: 15 };
  const down = scaleMealToTarget(base, 0.3);
  assert.equal(down.factor, 0.6);
  assert.equal(down.calories, 300);
  assert.equal(down.protein, 24);

  const up = scaleMealToTarget(base, 2.5);
  assert.equal(up.factor, 1.8);
  assert.equal(up.calories, 900);
});

test('Warrior rank progression scales cleanly from Thrall to Odinborn', () => {
  const start = computeWarriorRank({ totalWorkouts: 0, proteinShieldDays: 0, totalVolumeLbs: 0 });
  assert.equal(start.rank, 'Thrall');
  assert.equal(start.nextRank, 'Raider');
  assert.equal(start.xp, 0);

  const mid = computeWarriorRank({ totalWorkouts: 10, proteinShieldDays: 10, totalVolumeLbs: 50000 });
  // 1200 + 600 + 500 = 2300 XP -> Berserker (>= 1500, < 3500)
  assert.equal(mid.rank, 'Berserker');
  assert.equal(mid.nextRank, 'Jarl');
  assert.equal(mid.xpToNext, 1200);

  const max = computeWarriorRank({ totalWorkouts: 100, proteinShieldDays: 100, totalVolumeLbs: 500000 });
  assert.equal(max.rank, 'Odinborn');
  assert.equal(max.nextRank, null);
  assert.equal(max.progress, 1);
});
