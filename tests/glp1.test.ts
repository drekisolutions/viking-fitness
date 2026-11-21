import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GLP1_PROFILE,
  INJECTION_SITES,
  estimateMedicationLevel,
  generateMedicationCurve,
  getNextRecommendedSite,
  getShotWavePhase,
  calculateMuscleArmorScore,
  computeRelativeStrengthChangePct,
  type Glp1ShotEntry,
} from '../constants/glp1.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_NOW = Date.parse('2026-11-20T12:00:00Z');

test('Bateman pharmacokinetics peaks near tmax and decays cleanly', () => {
  const shots: Glp1ShotEntry[] = [
    {
      id: 's1',
      medication: 'semaglutide',
      doseMg: 1.0,
      injectionSite: 'left_abdomen',
      injectedAt: new Date(BASE_NOW - 2.0 * DAY_MS).toISOString(),
      nauseaLevel: 1,
      fatigueLevel: 0,
      appetiteLevel: 1,
    },
  ];

  const atPeak = estimateMedicationLevel(shots, 'semaglutide', BASE_NOW);
  const afterHalfLife = estimateMedicationLevel(shots, 'semaglutide', BASE_NOW + 7 * DAY_MS);
  assert.ok(atPeak.activeMg > 0.9 && atPeak.activeMg <= 1.05);
  assert.ok(afterHalfLife.activeMg < atPeak.activeMg * 0.7);

  const curve = generateMedicationCurve(shots, 'semaglutide', BASE_NOW);
  assert.equal(curve.length, 15);
  assert.equal(curve[7].dayOffset, 0);
  assert.equal(curve[7].label, 'Today');
});

test('Injection site rotation picks unused sites first, then oldest site', () => {
  assert.equal(getNextRecommendedSite([]).key, INJECTION_SITES[0].key);

  const partialShots: Glp1ShotEntry[] = [
    {
      id: '1',
      medication: 'semaglutide',
      doseMg: 0.5,
      injectionSite: 'left_abdomen',
      injectedAt: new Date(BASE_NOW - 7 * DAY_MS).toISOString(),
      nauseaLevel: 0,
      fatigueLevel: 0,
      appetiteLevel: 1,
    },
  ];
  assert.equal(getNextRecommendedSite(partialShots).key, 'right_abdomen');

  // When all 6 sites used, oldest one wins
  const fullRotation: Glp1ShotEntry[] = INJECTION_SITES.map((site, idx) => ({
    id: `rot-${idx}`,
    medication: 'semaglutide',
    doseMg: 0.5,
    injectionSite: site.key,
    injectedAt: new Date(BASE_NOW - (idx + 1) * DAY_MS).toISOString(),
    nauseaLevel: 0,
    fatigueLevel: 0,
    appetiteLevel: 1,
  }));
  // INJECTION_SITES[5] was injected 6 days ago -> oldest
  assert.equal(getNextRecommendedSite(fullRotation).key, INJECTION_SITES[5].key);
});

test('Shot Wave cycles Peak -> Moderate -> Rebound calories and volume', () => {
  const profile = { ...DEFAULT_GLP1_PROFILE, enabled: true, proteinFloorG: 130 };

  const peakShot: Glp1ShotEntry[] = [
    {
      id: '1',
      medication: 'semaglutide',
      doseMg: 0.5,
      injectionSite: 'left_abdomen',
      injectedAt: new Date(BASE_NOW - 1.0 * DAY_MS).toISOString(),
      nauseaLevel: 1,
      fatigueLevel: 1,
      appetiteLevel: 0,
    },
  ];
  const peak = getShotWavePhase(profile, peakShot, 1200, 126, 2200, BASE_NOW);
  assert.equal(peak.phase, 'peak');
  assert.equal(peak.adaptedCalories, 1020);
  assert.equal(peak.setMultiplier, 0.75);
  assert.equal(peak.proteinFloorG, 130);

  const modShot: Glp1ShotEntry[] = [
    { ...peakShot[0], injectedAt: new Date(BASE_NOW - 3.5 * DAY_MS).toISOString() },
  ];
  const moderate = getShotWavePhase(profile, modShot, 1200, 126, 2200, BASE_NOW);
  assert.equal(moderate.phase, 'moderate');
  assert.equal(moderate.adaptedCalories, 1200);
  assert.equal(moderate.setMultiplier, 1);

  const reboundShot: Glp1ShotEntry[] = [
    { ...peakShot[0], injectedAt: new Date(BASE_NOW - 5.5 * DAY_MS).toISOString() },
  ];
  const rebound = getShotWavePhase(profile, reboundShot, 1200, 126, 2200, BASE_NOW);
  assert.equal(rebound.phase, 'rebound');
  assert.equal(rebound.adaptedCalories, 1380);
});

test('Reverse-Diet Off-Ramp increments calories weekly toward TDEE', () => {
  const profile = {
    ...DEFAULT_GLP1_PROFILE,
    enabled: true,
    phaseMode: 'tapering' as const,
    reverseDietStartDate: '2026-11-06', // 14 days = 2 weeks before BASE_NOW
    reverseDietWeeklyBumpKcal: 75,
    proteinFloorG: 135,
  };

  const wave = getShotWavePhase(profile, [], 1200, 120, 2200, BASE_NOW);
  assert.equal(wave.phase, 'off-ramp');
  assert.equal(wave.adaptedCalories, 1350); // 1200 + 2 * 75
  assert.equal(wave.proteinFloorG, 135);
});

test('Muscle Armor Score classifies risk tiers accurately', () => {
  const fortress = calculateMuscleArmorScore({
    workoutsLast7Days: 3,
    proteinShieldDaysLast7: 6,
    relativeStrengthChangePct: 1.5,
    electrolytesDaysLast7: 5,
  });
  assert.equal(fortress.score, 100);
  assert.equal(fortress.status, 'FORTRESS');

  const atRisk = calculateMuscleArmorScore({
    workoutsLast7Days: 0,
    proteinShieldDaysLast7: 1,
    relativeStrengthChangePct: -10,
    electrolytesDaysLast7: 0,
  });
  assert.ok(atRisk.score < 40);
  assert.equal(atRisk.status, 'AT RISK');
});

test('GLP-1 wave adaptedCarbsG and adaptedFatG align with calories and keep fat lower on peak', () => {
  const profile = { ...DEFAULT_GLP1_PROFILE, enabled: true, proteinFloorG: 130 };
  const peakShot: Glp1ShotEntry[] = [
    {
      id: 'w1',
      medication: 'semaglutide',
      doseMg: 0.5,
      injectionSite: 'left_abdomen',
      injectedAt: new Date(BASE_NOW - 1.0 * DAY_MS).toISOString(),
      nauseaLevel: 1,
      fatigueLevel: 0,
      appetiteLevel: 0,
    },
  ];
  const reboundShot: Glp1ShotEntry[] = [
    { ...peakShot[0], injectedAt: new Date(BASE_NOW - 5.5 * DAY_MS).toISOString() },
  ];

  const peak = getShotWavePhase(profile, peakShot, 1200, 120, 2200, BASE_NOW);
  const rebound = getShotWavePhase(profile, reboundShot, 1200, 120, 2200, BASE_NOW);

  const peakKcalSum = peak.proteinFloorG * 4 + peak.adaptedCarbsG * 4 + peak.adaptedFatG * 9;
  const reboundKcalSum =
    rebound.proteinFloorG * 4 + rebound.adaptedCarbsG * 4 + rebound.adaptedFatG * 9;

  assert.ok(Math.abs(peakKcalSum - peak.adaptedCalories) <= 15);
  assert.ok(Math.abs(reboundKcalSum - rebound.adaptedCalories) <= 15);
  assert.ok(peak.adaptedFatG < rebound.adaptedFatG);
});

test('Relative strength change tracks lean-mass preservation when bodyweight drops', () => {
  const noBaseline = computeRelativeStrengthChangePct(
    [
      {
        completedAt: '2026-11-10T10:00:00Z',
        sets: [{ exerciseName: 'Back Squat', estimated1rm: 200, completed: true }],
      },
    ],
    [{ logDate: '2026-11-10', weightLbs: 200 }],
    200
  );
  assert.equal(noBaseline.hasBaseline, false);
  assert.equal(noBaseline.changePct, 0);

  // Same 200 lb 1RM while bodyweight dropped from 200 -> 180 (+11.1% relative strength)
  const preserved = computeRelativeStrengthChangePct(
    [
      {
        completedAt: '2026-11-01T10:00:00Z',
        sets: [{ exerciseName: 'Back Squat', estimated1rm: 200, completed: true }],
      },
      {
        completedAt: '2026-11-20T10:00:00Z',
        sets: [{ exerciseName: 'Back Squat', estimated1rm: 200, completed: true }],
      },
    ],
    [
      { logDate: '2026-11-01', weightLbs: 200 },
      { logDate: '2026-11-20', weightLbs: 180 },
    ],
    180
  );
  assert.equal(preserved.hasBaseline, true);
  assert.ok(Math.abs(preserved.changePct - 11.1) < 0.2);
});
