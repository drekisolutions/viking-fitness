export type Glp1MedicationKey = 'semaglutide' | 'tirzepatide' | 'liraglutide' | 'retatrutide';

export type Glp1PhaseMode = 'active' | 'tapering' | 'maintenance';

export type ShotWavePhase = 'peak' | 'moderate' | 'rebound' | 'off-ramp' | 'inactive';

export interface Glp1MedicationSpec {
  key: Glp1MedicationKey;
  label: string;
  brands: string;
  halfLifeDays: number;
  tmaxDays: number;
  defaultIntervalDays: number;
  doses: number[];
}

export const GLP1_MEDICATIONS: Record<Glp1MedicationKey, Glp1MedicationSpec> = {
  semaglutide: {
    key: 'semaglutide',
    label: 'Semaglutide',
    brands: 'Ozempic / Wegovy',
    halfLifeDays: 7.0,
    tmaxDays: 2.0,
    defaultIntervalDays: 7,
    doses: [0.25, 0.5, 1.0, 1.7, 2.4],
  },
  tirzepatide: {
    key: 'tirzepatide',
    label: 'Tirzepatide',
    brands: 'Mounjaro / Zepbound',
    halfLifeDays: 5.0,
    tmaxDays: 1.5,
    defaultIntervalDays: 7,
    doses: [2.5, 5.0, 7.5, 10.0, 12.5, 15.0],
  },
  liraglutide: {
    key: 'liraglutide',
    label: 'Liraglutide',
    brands: 'Saxenda / Victoza',
    halfLifeDays: 0.54,
    tmaxDays: 0.45,
    defaultIntervalDays: 1,
    doses: [0.6, 1.2, 1.8, 2.4, 3.0],
  },
  retatrutide: {
    key: 'retatrutide',
    label: 'Retatrutide',
    brands: 'Triple Agonist (Trial)',
    halfLifeDays: 6.0,
    tmaxDays: 1.75,
    defaultIntervalDays: 7,
    doses: [1.0, 2.0, 4.0, 8.0, 12.0],
  },
};

export interface InjectionSite {
  key: string;
  label: string;
  shortLabel: string;
}

export const INJECTION_SITES: InjectionSite[] = [
  { key: 'left_abdomen', label: 'Left Abdomen', shortLabel: 'L Abdomen' },
  { key: 'right_abdomen', label: 'Right Abdomen', shortLabel: 'R Abdomen' },
  { key: 'left_thigh', label: 'Left Thigh', shortLabel: 'L Thigh' },
  { key: 'right_thigh', label: 'Right Thigh', shortLabel: 'R Thigh' },
  { key: 'left_arm', label: 'Left Upper Arm', shortLabel: 'L Arm' },
  { key: 'right_arm', label: 'Right Upper Arm', shortLabel: 'R Arm' },
];

export interface Glp1ProfileConfig {
  enabled: boolean;
  medication: Glp1MedicationKey;
  brandName: string;
  currentDoseMg: number;
  shotIntervalDays: number;
  phaseMode: Glp1PhaseMode;
  reverseDietStartDate: string | null;
  reverseDietWeeklyBumpKcal: number;
  proteinFloorG: number;
}

export interface Glp1ShotEntry {
  id: string;
  medication: Glp1MedicationKey;
  doseMg: number;
  injectionSite: string;
  injectedAt: string; // ISO timestamp
  nauseaLevel: number; // 0-3
  fatigueLevel: number; // 0-3
  appetiteLevel: number; // 0-3
  notes?: string;
}

export const DEFAULT_GLP1_PROFILE: Glp1ProfileConfig = {
  enabled: false,
  medication: 'semaglutide',
  brandName: 'Ozempic / Wegovy',
  currentDoseMg: 0.5,
  shotIntervalDays: 7,
  phaseMode: 'active',
  reverseDietStartDate: null,
  reverseDietWeeklyBumpKcal: 75,
  proteinFloorG: 120,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Solve absorption constant ka > ke for Bateman 1-compartment tmax = ln(ka/ke)/(ka - ke). */
function solveAbsorptionRate(halfLifeDays: number, tmaxDays: number): { ke: number; ka: number } {
  const ke = Math.LN2 / halfLifeDays;
  const maxPossibleTmax = 1 / ke;
  const safeTmax = Math.min(tmaxDays, maxPossibleTmax * 0.9);
  let low = ke * 1.01;
  let high = ke * 80;

  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    const tPeak = Math.log(mid / ke) / (mid - ke);
    if (tPeak > safeTmax) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return { ke, ka: (low + high) / 2 };
}

/**
 * Estimates active systemic medication equivalent (mg) at `atTimestampMs`
 * using Bateman one-compartment multi-dose superposition across the past 5 half-lives.
 */
export function estimateMedicationLevel(
  shots: Glp1ShotEntry[],
  medication: Glp1MedicationKey,
  atTimestampMs: number
): { activeMg: number; normalizedPct: number } {
  const spec = GLP1_MEDICATIONS[medication] ?? GLP1_MEDICATIONS.semaglutide;
  const { ke, ka } = solveAbsorptionRate(spec.halfLifeDays, spec.tmaxDays);
  const peakDenom = Math.exp(-ke * spec.tmaxDays) - Math.exp(-ka * spec.tmaxDays);
  const cutoffDays = spec.halfLifeDays * 5;

  let activeMg = 0;
  let maxDose = 0;

  for (const shot of shots) {
    const shotMs = Date.parse(shot.injectedAt);
    if (!Number.isFinite(shotMs)) continue;
    const dtDays = (atTimestampMs - shotMs) / MS_PER_DAY;
    if (dtDays <= 0 || dtDays > cutoffDays) continue;

    const unitConc =
      peakDenom > 0
        ? (Math.exp(-ke * dtDays) - Math.exp(-ka * dtDays)) / peakDenom
        : Math.exp(-ke * dtDays);
    activeMg += shot.doseMg * Math.max(0, unitConc);
    if (shot.doseMg > maxDose) maxDose = shot.doseMg;
  }

  const roundedMg = Math.round(activeMg * 1000) / 1000;
  if (maxDose <= 0) {
    return { activeMg: 0, normalizedPct: 0 };
  }

  // Approximate steady-state accumulation ceiling for normalization
  const accumulationFactor =
    1 / Math.max(0.15, 1 - Math.pow(2, -spec.defaultIntervalDays / spec.halfLifeDays));
  const referenceMax = maxDose * accumulationFactor;
  const normalizedPct = Math.min(100, Math.round((roundedMg / referenceMax) * 100));

  return { activeMg: roundedMg, normalizedPct };
}

export function generateMedicationCurve(
  shots: Glp1ShotEntry[],
  medication: Glp1MedicationKey,
  nowMs: number = Date.now()
): { dayOffset: number; label: string; timestampMs: number; activeMg: number; normalizedPct: number }[] {
  const points: {
    dayOffset: number;
    label: string;
    timestampMs: number;
    activeMg: number;
    normalizedPct: number;
  }[] = [];

  for (let offset = -7; offset <= 7; offset++) {
    const ts = nowMs + offset * MS_PER_DAY;
    const est = estimateMedicationLevel(shots, medication, ts);
    points.push({
      dayOffset: offset,
      label: offset === 0 ? 'Today' : offset > 0 ? `+${offset}d` : `${offset}d`,
      timestampMs: ts,
      activeMg: est.activeMg,
      normalizedPct: est.normalizedPct,
    });
  }

  // Scale relative to curve peak if shots exist so chart fills cleanly
  const peakMg = points.reduce((m, p) => Math.max(m, p.activeMg), 0);
  if (peakMg > 0) {
    return points.map((p) => ({
      ...p,
      normalizedPct: Math.min(100, Math.round((p.activeMg / peakMg) * 100)),
    }));
  }
  return points;
}

export function getNextRecommendedSite(shots: Glp1ShotEntry[]): InjectionSite {
  if (shots.length === 0) return INJECTION_SITES[0];

  const lastUsedMs: Record<string, number> = {};
  for (const s of shots) {
    const ts = Date.parse(s.injectedAt);
    if (!Number.isFinite(ts)) continue;
    if (lastUsedMs[s.injectionSite] == null || ts > lastUsedMs[s.injectionSite]) {
      lastUsedMs[s.injectionSite] = ts;
    }
  }

  // Prefer the first never-used site
  for (const site of INJECTION_SITES) {
    if (lastUsedMs[site.key] == null) return site;
  }

  // Otherwise pick the site used longest ago
  let oldestSite = INJECTION_SITES[0];
  let oldestTs = lastUsedMs[oldestSite.key] ?? Infinity;
  for (const site of INJECTION_SITES) {
    const ts = lastUsedMs[site.key] ?? 0;
    if (ts < oldestTs) {
      oldestTs = ts;
      oldestSite = site;
    }
  }
  return oldestSite;
}

export interface ShotWaveStatus {
  phase: ShotWavePhase;
  label: string;
  color: string;
  daysSinceLastShot: number | null;
  daysUntilNextShot: number | null;
  adaptedCalories: number;
  proteinFloorG: number;
  adaptedCarbsG: number;
  adaptedFatG: number;
  setMultiplier: number;
  nutritionNote: string;
  trainingNote: string;
}

function splitRemainingMacros(
  adaptedCalories: number,
  proteinG: number,
  carbShare: number
): { adaptedCarbsG: number; adaptedFatG: number } {
  const remainingKcal = Math.max(0, adaptedCalories - proteinG * 4);
  const adaptedCarbsG = Math.round((remainingKcal * carbShare) / 4);
  const adaptedFatG = Math.round((remainingKcal * (1 - carbShare)) / 9);
  return { adaptedCarbsG, adaptedFatG };
}

export function getShotWavePhase(
  profile: Glp1ProfileConfig,
  shots: Glp1ShotEntry[],
  baseCalories: number,
  baseProtein: number,
  tdee: number,
  nowMs: number = Date.now()
): ShotWaveStatus {
  const safeCalories = baseCalories > 0 ? baseCalories : 1200;
  const effectiveProtein = Math.max(profile.proteinFloorG || 0, baseProtein || 0, 100);

  if (!profile.enabled) {
    const inactiveProtein = baseProtein > 0 ? baseProtein : 150;
    const { adaptedCarbsG, adaptedFatG } = splitRemainingMacros(safeCalories, inactiveProtein, 0.55);
    return {
      phase: 'inactive',
      label: 'STANDARD PROTOCOL',
      color: '#4BA3FF',
      daysSinceLastShot: null,
      daysUntilNextShot: null,
      adaptedCalories: safeCalories,
      proteinFloorG: inactiveProtein,
      adaptedCarbsG,
      adaptedFatG,
      setMultiplier: 1,
      nutritionNote: 'Standard daily calorie and macro targets active.',
      trainingNote: 'Full prescribed training volume active.',
    };
  }

  const sortedShots = [...shots].sort(
    (a, b) => Date.parse(b.injectedAt) - Date.parse(a.injectedAt)
  );
  const latestShot = sortedShots[0];
  const latestMs = latestShot ? Date.parse(latestShot.injectedAt) : NaN;
  const interval = Math.max(1, profile.shotIntervalDays || 7);

  const daysSinceLastShot = Number.isFinite(latestMs)
    ? Math.max(0, Math.round(((nowMs - latestMs) / MS_PER_DAY) * 10) / 10)
    : null;
  const daysUntilNextShot =
    daysSinceLastShot !== null
      ? Math.max(0, Math.round((interval - daysSinceLastShot) * 10) / 10)
      : null;

  // Reverse-Diet / Maintenance Off-Ramp
  if (profile.phaseMode === 'tapering' || profile.phaseMode === 'maintenance') {
    const maintenanceTarget = tdee > safeCalories ? tdee : safeCalories + 400;
    let adaptedCalories = maintenanceTarget;

    if (profile.phaseMode === 'tapering') {
      const startMs = profile.reverseDietStartDate
        ? Date.parse(profile.reverseDietStartDate)
        : nowMs;
      const elapsedWeeks = Number.isFinite(startMs)
        ? Math.max(0, Math.floor((nowMs - startMs) / (7 * MS_PER_DAY)))
        : 0;
      const bump = Math.max(25, profile.reverseDietWeeklyBumpKcal || 75);
      adaptedCalories = Math.min(maintenanceTarget, safeCalories + elapsedWeeks * bump);
    }

    const roundedCalories = Math.round(adaptedCalories);
    const { adaptedCarbsG, adaptedFatG } = splitRemainingMacros(roundedCalories, effectiveProtein, 0.55);

    return {
      phase: 'off-ramp',
      label: profile.phaseMode === 'maintenance' ? 'MAINTENANCE SHIELD' : 'OFF-RAMP REVERSE DIET',
      color: '#D6A756',
      daysSinceLastShot,
      daysUntilNextShot,
      adaptedCalories: roundedCalories,
      proteinFloorG: effectiveProtein,
      adaptedCarbsG,
      adaptedFatG,
      setMultiplier: 1,
      nutritionNote:
        profile.phaseMode === 'maintenance'
          ? `Holding maintenance at ${roundedCalories} kcal with ${effectiveProtein}g protein shield to prevent rebound.`
          : `Stepping up +${profile.reverseDietWeeklyBumpKcal} kcal/wk toward ${Math.round(maintenanceTarget)} kcal maintenance while guarding lean mass.`,
      trainingNote:
        'Off-Ramp Protocol — Keep compound strength progression steady to lock in your lean metabolic rate.',
    };
  }

  // Active shot-wave cycling
  if (daysSinceLastShot === null) {
    const { adaptedCarbsG, adaptedFatG } = splitRemainingMacros(safeCalories, effectiveProtein, 0.55);
    return {
      phase: 'moderate',
      label: 'STEADY SHIELD',
      color: '#4BA3FF',
      daysSinceLastShot: null,
      daysUntilNextShot: null,
      adaptedCalories: safeCalories,
      proteinFloorG: effectiveProtein,
      adaptedCarbsG,
      adaptedFatG,
      setMultiplier: 1,
      nutritionNote:
        'Log your first GLP-1 shot to unlock automatic 7-day Peak Suppression & Refuel Wave cycling.',
      trainingNote: 'Full compound strength stimulus active — log your shot day to sync volume.',
    };
  }

  const cycleRatio = (daysSinceLastShot % interval) / interval;
  // Handle overdue shot (> interval days): user is in rebound / low-drug window
  const effectiveRatio = daysSinceLastShot >= interval ? 0.9 : cycleRatio;

  if (effectiveRatio < 0.36) {
    const adaptedCalories = Math.max(900, Math.round(safeCalories * 0.85));
    // Peak suppression: keep fat low (25% of remaining) and easy carbs (75%) to reduce nausea
    const { adaptedCarbsG, adaptedFatG } = splitRemainingMacros(adaptedCalories, effectiveProtein, 0.75);
    return {
      phase: 'peak',
      label: 'PEAK SHIELD (DAYS 1–2)',
      color: '#AB47BC',
      daysSinceLastShot,
      daysUntilNextShot,
      adaptedCalories,
      proteinFloorG: effectiveProtein,
      adaptedCarbsG,
      adaptedFatG,
      setMultiplier: 0.75,
      nutritionNote: `Appetite peak — ignore heavy meals and defend your ${effectiveProtein}g Protein Shield Floor with easy, low-grease micro-meals.`,
      trainingNote:
        'Peak Suppression — Keep top sets heavy to signal muscle retention, and trim 1 back-off set to protect recovery.',
    };
  }

  if (effectiveRatio < 0.65) {
    const { adaptedCarbsG, adaptedFatG } = splitRemainingMacros(safeCalories, effectiveProtein, 0.55);
    return {
      phase: 'moderate',
      label: 'STEADY CRUISE (DAYS 3–4)',
      color: '#4BA3FF',
      daysSinceLastShot,
      daysUntilNextShot,
      adaptedCalories: safeCalories,
      proteinFloorG: effectiveProtein,
      adaptedCarbsG,
      adaptedFatG,
      setMultiplier: 1,
      nutritionNote: `Appetite stabilizing — pace protein across ${effectiveProtein}g total and maintain hydration + electrolytes.`,
      trainingNote: 'Steady Shield — Run full prescribed working sets and aim for crisp form.',
    };
  }

  const adaptedCalories = Math.round(safeCalories * 1.15);
  // Rebound refuel: bias remaining calories toward complex carbs (70% carbs / 30% fat)
  const { adaptedCarbsG, adaptedFatG } = splitRemainingMacros(adaptedCalories, effectiveProtein, 0.70);
  return {
    phase: 'rebound',
    label: 'REFUEL & LIFT HEAVY (DAYS 5–7)',
    color: '#3FB950',
    daysSinceLastShot,
    daysUntilNextShot,
    adaptedCalories,
    proteinFloorG: effectiveProtein,
    adaptedCarbsG,
    adaptedFatG,
    setMultiplier: 1,
    nutritionNote: `Hunger returning — use the ${adaptedCalories} kcal refuel window for complex carbs + ${effectiveProtein}g protein around lifting.`,
    trainingNote:
      'Rebound Energy Window — Glycogen & energy peak. Ideal day for heavy compounds & PR attempts.',
  };
}

export function computeRelativeStrengthChangePct(
  sessions: {
    completedAt: string;
    sets: { exerciseName: string; estimated1rm: number; completed: boolean }[];
  }[],
  weightLogs: { logDate: string; weightLbs: number }[],
  fallbackWeightLbs: number
): { changePct: number; hasBaseline: boolean } {
  const validSessions = sessions
    .map((s) => ({
      completedAt: s.completedAt,
      dateKey: s.completedAt.slice(0, 10),
      completedSets: s.sets.filter((x) => x.completed && x.estimated1rm > 0),
    }))
    .filter((s) => s.completedSets.length > 0)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  if (validSessions.length < 2) {
    return { changePct: 0, hasBaseline: false };
  }

  const sortedWeights = [...weightLogs].sort((a, b) => a.logDate.localeCompare(b.logDate));
  const getWeightAtDate = (dateKey: string): number => {
    const safeFallback = fallbackWeightLbs > 0 ? fallbackWeightLbs : 180;
    if (sortedWeights.length === 0) return safeFallback;
    let best = sortedWeights[0].weightLbs;
    for (const w of sortedWeights) {
      if (w.logDate <= dateKey) best = w.weightLbs;
      else break;
    }
    return best > 0 ? best : safeFallback;
  };

  // Prefer comparing the strongest matching lift that appears in >= 2 sessions
  const historyByLift = new Map<string, { dateKey: string; rel: number; e1rm: number }[]>();
  for (const s of validSessions) {
    const bw = getWeightAtDate(s.dateKey);
    const maxByLiftInSession = new Map<string, number>();
    for (const st of s.completedSets) {
      const prev = maxByLiftInSession.get(st.exerciseName) ?? 0;
      if (st.estimated1rm > prev) maxByLiftInSession.set(st.exerciseName, st.estimated1rm);
    }
    for (const [lift, e1rm] of maxByLiftInSession.entries()) {
      const list = historyByLift.get(lift) ?? [];
      list.push({ dateKey: s.dateKey, rel: e1rm / bw, e1rm });
      historyByLift.set(lift, list);
    }
  }

  let bestMultiLift: { firstRel: number; lastRel: number; maxE1rm: number } | null = null;
  for (const entries of historyByLift.values()) {
    if (entries.length >= 2) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      if (!bestMultiLift || last.e1rm > bestMultiLift.maxE1rm) {
        bestMultiLift = { firstRel: first.rel, lastRel: last.rel, maxE1rm: last.e1rm };
      }
    }
  }

  if (bestMultiLift && bestMultiLift.firstRel > 0) {
    const pct = ((bestMultiLift.lastRel - bestMultiLift.firstRel) / bestMultiLift.firstRel) * 100;
    return { changePct: Math.round(pct * 10) / 10, hasBaseline: true };
  }

  // Fallback across distinct-lift sessions: compare earliest vs latest top relative strength
  const firstSession = validSessions[0];
  const lastSession = validSessions[validSessions.length - 1];
  const firstMax = Math.max(...firstSession.completedSets.map((s) => s.estimated1rm));
  const lastMax = Math.max(...lastSession.completedSets.map((s) => s.estimated1rm));
  const firstRel = firstMax / getWeightAtDate(firstSession.dateKey);
  const lastRel = lastMax / getWeightAtDate(lastSession.dateKey);
  if (firstRel <= 0) return { changePct: 0, hasBaseline: false };
  const pct = ((lastRel - firstRel) / firstRel) * 100;
  return { changePct: Math.round(pct * 10) / 10, hasBaseline: true };
}

export function calculateMuscleArmorScore(params: {
  workoutsLast7Days: number;
  proteinShieldDaysLast7: number;
  relativeStrengthChangePct: number;
  electrolytesDaysLast7: number;
}): {
  score: number;
  status: 'FORTRESS' | 'SHIELDED' | 'EXPOSED' | 'AT RISK';
  headline: string;
  guidance: string;
} {
  const liftPts = Math.min(35, Math.round((Math.max(0, params.workoutsLast7Days) / 3) * 35));
  const proteinPts = Math.min(
    40,
    Math.round((Math.max(0, params.proteinShieldDaysLast7) / 6) * 40)
  );
  const strengthPts =
    params.relativeStrengthChangePct >= 0
      ? 15
      : params.relativeStrengthChangePct >= -3
      ? 10
      : params.relativeStrengthChangePct >= -8
      ? 5
      : 0;
  const hydroPts = Math.min(
    10,
    Math.round((Math.max(0, params.electrolytesDaysLast7) / 5) * 10)
  );

  const score = Math.min(100, Math.max(0, liftPts + proteinPts + strengthPts + hydroPts));

  if (score >= 85) {
    return {
      score,
      status: 'FORTRESS',
      headline: 'Lean Mass Locked In',
      guidance: 'Your lifting stimulus and Protein Shield are aggressively protecting muscle while fat drops.',
    };
  }
  if (score >= 65) {
    return {
      score,
      status: 'SHIELDED',
      headline: 'Armor Holding Strong',
      guidance: 'Solid muscle defense. One more protein-floor day or heavy session pushes you to Fortress.',
    };
  }
  if (score >= 40) {
    return {
      score,
      status: 'EXPOSED',
      headline: 'Gaps in the Shield Wall',
      guidance: 'Hit your protein shake micro-meals and anchor 2–3 compound lifting sessions this week.',
    };
  }
  return {
    score,
    status: 'AT RISK',
    headline: 'Muscle Loss Risk Elevated',
    guidance: 'Prioritize your daily Protein Shield Floor and complete at least 2 resistance sessions this week.',
  };
}
