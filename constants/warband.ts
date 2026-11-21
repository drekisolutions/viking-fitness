export interface RaidBoss {
  id: string;
  name: string;
  title: string;
  lore: string;
  accentColor: string;
}

export const RAID_BOSSES: RaidBoss[] = [
  {
    id: 'fenrir',
    name: 'FENRIR THE UNBOUND',
    title: 'Devourer of Excuses',
    lore: 'Bind the great wolf through consistent iron and protein discipline.',
    accentColor: '#A12727',
  },
  {
    id: 'jormungandr',
    name: 'JÖRMUNGANDR',
    title: 'World Serpent of Endurance',
    lore: 'Outlast the serpent circling Midgard with steady weekly training volume.',
    accentColor: '#4BA3FF',
  },
  {
    id: 'ymir',
    name: 'YMIR THE FROST GIANT',
    title: 'Colossus of the Primordial Cold',
    lore: 'Shatter the frost titan with heavy compound lifts and recovery shield days.',
    accentColor: '#AB47BC',
  },
  {
    id: 'nidhoggr',
    name: 'NÍÐHÖGGR',
    title: 'Gnawer at Yggdrasil’s Roots',
    lore: 'Protect lean mass and starve stagnation with relentless weekly consistency.',
    accentColor: '#D6A756',
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns local Monday YYYY-MM-DD key for the week containing `date`. */
export function getWeekStartKey(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

export function getDaysRemainingInWeek(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const day = d.getDay(); // 0=Sun
  return day === 0 ? 1 : 8 - day;
}

export function getCurrentBoss(nowMs: number = Date.now()): RaidBoss {
  const weekStart = getWeekStartKey(new Date(nowMs));
  const weekEpoch = Math.floor(Date.parse(`${weekStart}T00:00:00Z`) / (7 * MS_PER_DAY));
  const idx = ((weekEpoch % RAID_BOSSES.length) + RAID_BOSSES.length) % RAID_BOSSES.length;
  return RAID_BOSSES[idx];
}

export interface WarbandMemberDamageInput {
  userId: string;
  displayName: string;
  weeklyDamage: number;
  weeklyWorkouts: number;
  weeklyProteinDays: number;
}

/**
 * Computes bodyweight-normalized weekly boss damage so beginners and heavier
 * lifters fight side-by-side based on personal consistency and PR execution.
 */
export function computeMemberWeeklyRaidDamage(params: {
  workoutsThisWeek: number;
  prCountThisWeek: number;
  proteinShieldDaysThisWeek: number;
  electrolyteDaysThisWeek: number;
}): number {
  return (
    Math.max(0, params.workoutsThisWeek) * 180 +
    Math.max(0, params.prCountThisWeek) * 40 +
    Math.max(0, params.proteinShieldDaysThisWeek) * 90 +
    Math.max(0, params.electrolyteDaysThisWeek) * 30
  );
}

export function computeRaidProgress(
  members: WarbandMemberDamageInput[],
  nowMs: number = Date.now()
): {
  boss: RaidBoss;
  totalDamage: number;
  maxHp: number;
  hpRemaining: number;
  progressPct: number;
  defeated: boolean;
  daysLeft: number;
  contributions: (WarbandMemberDamageInput & { sharePct: number })[];
} {
  const boss = getCurrentBoss(nowMs);
  const memberCount = Math.max(1, members.length);
  const maxHp = memberCount * 1000;
  const totalDamage = members.reduce((sum, m) => sum + Math.max(0, m.weeklyDamage), 0);
  const hpRemaining = Math.max(0, maxHp - totalDamage);
  const progressPct = Math.min(100, Math.round((totalDamage / maxHp) * 100));
  const defeated = totalDamage >= maxHp;

  const contributions = [...members]
    .sort((a, b) => b.weeklyDamage - a.weeklyDamage)
    .map((m) => ({
      ...m,
      sharePct: totalDamage > 0 ? Math.round((m.weeklyDamage / totalDamage) * 100) : 0,
    }));

  return {
    boss,
    totalDamage,
    maxHp,
    hpRemaining,
    progressPct,
    defeated,
    daysLeft: getDaysRemainingInWeek(nowMs),
    contributions,
  };
}

export interface StrengthStandardSpec {
  key: 'bench' | 'squat' | 'deadlift';
  label: string;
  matchTokens: string[];
  /** Bodyweight multiplier thresholds for Raider, Berserker, Jarl, Warchief, Odinborn */
  ratios: [number, number, number, number, number];
}

export const STRENGTH_STANDARDS: StrengthStandardSpec[] = [
  {
    key: 'bench',
    label: 'Bench Press',
    matchTokens: ['bench', 'chest press'],
    ratios: [0.5, 0.75, 1.0, 1.25, 1.5],
  },
  {
    key: 'squat',
    label: 'Squat',
    matchTokens: ['squat'],
    ratios: [0.75, 1.0, 1.25, 1.5, 1.75],
  },
  {
    key: 'deadlift',
    label: 'Deadlift',
    matchTokens: ['deadlift'],
    ratios: [1.0, 1.25, 1.5, 1.75, 2.25],
  },
];

const TIER_NAMES = ['Thrall', 'Raider', 'Berserker', 'Jarl', 'Warchief', 'Odinborn'] as const;

export function getStrengthTier(
  standard: StrengthStandardSpec,
  oneRmLbs: number,
  bodyweightLbs: number
): {
  tier: string;
  ratio: number;
  nextTier: string | null;
  nextTargetLbs: number | null;
  progress: number;
} {
  if (oneRmLbs <= 0 || bodyweightLbs <= 0) {
    return {
      tier: 'Thrall',
      ratio: 0,
      nextTier: 'Raider',
      nextTargetLbs: bodyweightLbs > 0 ? Math.round(bodyweightLbs * standard.ratios[0]) : null,
      progress: 0,
    };
  }

  const ratio = Math.round((oneRmLbs / bodyweightLbs) * 100) / 100;
  let tierIdx = 0;
  for (let i = 0; i < standard.ratios.length; i++) {
    if (ratio >= standard.ratios[i]) {
      tierIdx = i + 1;
    }
  }

  if (tierIdx >= TIER_NAMES.length - 1) {
    return {
      tier: 'Odinborn',
      ratio,
      nextTier: null,
      nextTargetLbs: null,
      progress: 1,
    };
  }

  const prevRatio = tierIdx === 0 ? 0 : standard.ratios[tierIdx - 1];
  const nextRatio = standard.ratios[tierIdx];
  const progress = Math.min(1, Math.max(0, (ratio - prevRatio) / Math.max(0.05, nextRatio - prevRatio)));

  return {
    tier: TIER_NAMES[tierIdx],
    ratio,
    nextTier: TIER_NAMES[tierIdx + 1],
    nextTargetLbs: Math.round(bodyweightLbs * nextRatio),
    progress,
  };
}

export function evaluateCampaignWeek(params: {
  workoutsThisWeek: number;
  proteinShieldDaysThisWeek: number;
  weekStartKey: string;
  protectedWeeks: string[];
  claimedWeeks: string[];
  currentPasses: number;
}): {
  quotaMet: boolean;
  isProtected: boolean;
  weekSecured: boolean;
  eligibleForNewPass: boolean;
  nextPassesAfterClaim: number;
} {
  const quotaMet =
    params.workoutsThisWeek >= 3 && params.proteinShieldDaysThisWeek >= 5;
  const isProtected = params.protectedWeeks.includes(params.weekStartKey);
  const weekSecured = quotaMet || isProtected;
  const alreadyClaimed = params.claimedWeeks.includes(params.weekStartKey);
  const eligibleForNewPass = quotaMet && !alreadyClaimed && params.currentPasses < 3;
  const nextPassesAfterClaim = eligibleForNewPass
    ? Math.min(3, params.currentPasses + 1)
    : params.currentPasses;

  return {
    quotaMet,
    isProtected,
    weekSecured,
    eligibleForNewPass,
    nextPassesAfterClaim,
  };
}
