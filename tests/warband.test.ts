import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCurrentBoss,
  getWeekStartKey,
  computeMemberWeeklyRaidDamage,
  computeRaidProgress,
  STRENGTH_STANDARDS,
  getStrengthTier,
  evaluateCampaignWeek,
} from '../constants/warband.ts';

test('Weekly raid boss rotates deterministically by week', () => {
  const w1 = getCurrentBoss(Date.parse('2026-11-16T12:00:00Z'));
  const w1Same = getCurrentBoss(Date.parse('2026-11-20T12:00:00Z'));
  const w2 = getCurrentBoss(Date.parse('2026-11-23T12:00:00Z'));

  assert.equal(w1.id, w1Same.id);
  assert.notEqual(w1.id, w2.id);
  assert.equal(getWeekStartKey(new Date(2026, 10, 20)), '2026-11-16');
});

test('Warband raid damage is bodyweight-normalized and defeats boss at 1000+ DMG per member', () => {
  const dmg = computeMemberWeeklyRaidDamage({
    workoutsThisWeek: 3,
    prCountThisWeek: 1,
    proteinShieldDaysThisWeek: 5,
    electrolyteDaysThisWeek: 2,
  });
  // 3*180 (540) + 1*40 (40) + 5*90 (450) + 2*30 (60) = 1090
  assert.equal(dmg, 1090);

  const raid = computeRaidProgress([
    {
      userId: 'u1',
      displayName: 'Bjorn',
      weeklyDamage: dmg,
      weeklyWorkouts: 3,
      weeklyProteinDays: 5,
    },
    {
      userId: 'u2',
      displayName: 'Freya',
      weeklyDamage: 950,
      weeklyWorkouts: 3,
      weeklyProteinDays: 4,
    },
  ]);

  assert.equal(raid.maxHp, 2000);
  assert.equal(raid.totalDamage, 2040);
  assert.equal(raid.defeated, true);
  assert.equal(raid.progressPct, 100);
});

test('Bodyweight strength standards assign accurate Norse ranks', () => {
  const bench = STRENGTH_STANDARDS.find((s) => s.key === 'bench')!;
  const jarlBench = getStrengthTier(bench, 225, 180); // 1.25x BW -> Warchief threshold
  assert.equal(jarlBench.ratio, 1.25);
  assert.equal(jarlBench.tier, 'Warchief');

  const odinBench = getStrengthTier(bench, 280, 180); // 1.56x BW >= 1.5x
  assert.equal(odinBench.tier, 'Odinborn');
  assert.equal(odinBench.progress, 1);
});

test('Shield Wall Pass evaluation protects weeks and caps stored passes at 3', () => {
  const protectedEval = evaluateCampaignWeek({
    workoutsThisWeek: 1,
    proteinShieldDaysThisWeek: 2,
    weekStartKey: '2026-11-16',
    protectedWeeks: ['2026-11-16'],
    claimedWeeks: [],
    currentPasses: 1,
  });
  assert.equal(protectedEval.quotaMet, false);
  assert.equal(protectedEval.isProtected, true);
  assert.equal(protectedEval.weekSecured, true);

  const earnedEval = evaluateCampaignWeek({
    workoutsThisWeek: 3,
    proteinShieldDaysThisWeek: 5,
    weekStartKey: '2026-11-16',
    protectedWeeks: [],
    claimedWeeks: [],
    currentPasses: 2,
  });
  assert.equal(earnedEval.eligibleForNewPass, true);
  assert.equal(earnedEval.nextPassesAfterClaim, 3);
});
