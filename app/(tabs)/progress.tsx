import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Plus,
  Shield,
  X,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts, radius } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import {
  useTrackerStore,
  getTodayDateKey,
  getDateKeyDaysAgo,
  getLiftPRs,
  getWeeklyCampaignStats,
} from '@/store/tracker';
import {
  calculateBMI,
  calculateRelativeStrength,
  calculateTrendWeightEMA,
  calculateTDEE,
  getMacros,
} from '@/constants/calculations';
import {
  calculateMuscleArmorScore,
  computeRelativeStrengthChangePct,
} from '@/constants/glp1';
import { calculateAdaptiveTDEE } from '@/constants/adaptive';
import { getWeekStartKey } from '@/constants/warband';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/confirm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PERIODS = [
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '6M', days: 180 },
  { key: 'ALL', days: 3650 },
] as const;

export default function ProgressScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const onboarding = useOnboardingStore();
  const {
    weightLogs,
    workoutSessions,
    foodLogs,
    waterByDate,
    glp1Profile,
    shieldWallPasses,
    protectedWeeks,
    logWeight,
    recordAdaptiveCheckin,
  } = useTrackerStore();

  const [activePeriod, setActivePeriod] = useState<'1W' | '1M' | '3M' | '6M' | 'ALL'>('1M');
  const [chartWidth, setChartWidth] = useState(Math.min(540, SCREEN_WIDTH - 76));
  const [weightModalOpen, setWeightModalOpen] = useState(false);

  const latestWeightEntry = weightLogs[weightLogs.length - 1];
  const currentWeight = latestWeightEntry?.weightLbs ?? onboarding.weightLbs ?? 180;

  const [inputWeight, setInputWeight] = useState(String(currentWeight));
  const [inputBodyFat, setInputBodyFat] = useState('');
  const [inputWaist, setInputWaist] = useState('');

  const periodDays = PERIODS.find((p) => p.key === activePeriod)?.days ?? 30;
  const cutoffDate = getDateKeyDaysAgo(periodDays);

  const filteredWeightEntries = useMemo(() => {
    const base =
      weightLogs.length > 0
        ? weightLogs.map((w) => ({ date: w.logDate, weightLbs: w.weightLbs }))
        : [{ date: getTodayDateKey(), weightLbs: currentWeight }];
    const scoped =
      activePeriod === 'ALL' ? base : base.filter((e) => e.date >= cutoffDate);
    return scoped.length > 0 ? scoped : base.slice(-1);
  }, [weightLogs, currentWeight, activePeriod, cutoffDate]);

  const emaSeries = useMemo(
    () => calculateTrendWeightEMA(filteredWeightEntries, 0.25),
    [filteredWeightEntries]
  );

  const firstRaw = emaSeries[0]?.raw ?? currentWeight;
  const latestTrend = emaSeries[emaSeries.length - 1]?.trend ?? currentWeight;
  const periodChange = Math.round((currentWeight - firstRaw) * 10) / 10;

  const proteinTarget = Math.max(
    glp1Profile.enabled ? glp1Profile.proteinFloorG : 0,
    onboarding.protein || 140
  );

  const weeklyStats = useMemo(
    () => getWeeklyCampaignStats(workoutSessions, foodLogs, waterByDate, proteinTarget),
    [workoutSessions, foodLogs, waterByDate, proteinTarget]
  );

  const prs = useMemo(() => getLiftPRs(workoutSessions), [workoutSessions]);
  const relStrengthDelta = useMemo(
    () =>
      computeRelativeStrengthChangePct(
        workoutSessions,
        weightLogs,
        currentWeight
      ),
    [workoutSessions, weightLogs, currentWeight]
  );

  const armor = useMemo(
    () =>
      calculateMuscleArmorScore({
        workoutsLast7Days: weeklyStats.workoutsLast7Days,
        proteinShieldDaysLast7: weeklyStats.proteinShieldDaysLast7,
        relativeStrengthChangePct: relStrengthDelta.hasBaseline
          ? relStrengthDelta.changePct
          : 0,
        electrolytesDaysLast7: weeklyStats.electrolytesDaysLast7,
      }),
    [weeklyStats, relStrengthDelta]
  );

  const lastBodyFat = useMemo(
    () => [...weightLogs].reverse().find((w) => w.bodyFatPct != null)?.bodyFatPct,
    [weightLogs]
  );
  const lastWaist = useMemo(
    () => [...weightLogs].reverse().find((w) => w.waistIn != null)?.waistIn,
    [weightLogs]
  );

  const heightIn = onboarding.heightFt * 12 + onboarding.heightIn;
  const staticTdee = calculateTDEE(
    currentWeight || 180,
    heightIn || 70,
    onboarding.age || 30,
    onboarding.sex || 'male',
    onboarding.activityLevel || 1.375
  );

  const adaptive = useMemo(
    () =>
      calculateAdaptiveTDEE({
        weightLogs,
        foodLogs,
        staticTdee,
        goal: onboarding.goal || 'build',
        currentTargetCalories: onboarding.calories || staticTdee,
        isGlp1: glp1Profile.enabled || onboarding.mealPlan === 'glp1',
      }),
    [
      weightLogs,
      foodLogs,
      staticTdee,
      onboarding.goal,
      onboarding.calories,
      onboarding.mealPlan,
      glp1Profile.enabled,
    ]
  );

  const handleApplyAdaptive = () => {
    if (!adaptive.ready) return;
    const prevCalories = onboarding.calories || staticTdee;
    const nextCalories = adaptive.suggestedCalories;
    const nextMacros = getMacros(nextCalories, onboarding.mealPlan || 'balanced');

    onboarding.setField('calories', nextCalories);
    onboarding.setField('protein', nextMacros.protein);
    onboarding.setField('carbs', nextMacros.carbs);
    onboarding.setField('fat', nextMacros.fat);
    updateProfile({
      calories: nextCalories,
      protein: nextMacros.protein,
      carbs: nextMacros.carbs,
      fat: nextMacros.fat,
    });

    recordAdaptiveCheckin(profile?.id, {
      checkinDate: getTodayDateKey(),
      estimatedTdee: adaptive.estimatedTdee,
      previousCalories: prevCalories,
      newCalories: nextCalories,
    });

    if (profile?.id && !profile.id.startsWith('guest-')) {
      Promise.resolve(
        supabase
          .from('profiles')
          .update({
            calories: nextCalories,
            protein: nextMacros.protein,
            carbs: nextMacros.carbs,
            fat: nextMacros.fat,
          })
          .eq('id', profile.id)
      ).catch(() => { });
    }

    showAlert(
      'Metabolism Target Updated',
      `Daily target updated to ${nextCalories} kcal based on your true estimated TDEE (${adaptive.estimatedTdee} kcal).`
    );
  };

  const currentWeekKey = getWeekStartKey();
  const isCurrentWeekProtected = protectedWeeks.includes(currentWeekKey);

  const currentBmi = useMemo(() => {
    const heightIn = onboarding.heightFt * 12 + onboarding.heightIn;
    return heightIn > 0
      ? Math.round(calculateBMI(currentWeight, heightIn) * 10) / 10
      : onboarding.bmi;
  }, [currentWeight, onboarding.heightFt, onboarding.heightIn, onboarding.bmi]);

  // 7-day anti-fragile campaign grid
  const campaignDays = useMemo(() => {
    const workoutDates = new Set(workoutSessions.map((s) => s.completedAt.slice(0, 10)));
    const proteinMap = new Map<string, number>();
    for (const f of foodLogs) {
      proteinMap.set(f.logDate, (proteinMap.get(f.logDate) ?? 0) + f.protein);
    }
    return Array.from({ length: 7 }, (_, idx) => {
      const dateKey = getDateKeyDaysAgo(6 - idx);
      const hitLift = workoutDates.has(dateKey);
      const hitProtein = (proteinMap.get(dateKey) ?? 0) >= proteinTarget * 0.8;
      return {
        dateKey,
        dayLabel: new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
        }),
        hitLift,
        hitProtein,
      };
    });
  }, [workoutSessions, foodLogs, proteinTarget]);

  const handleSaveWeight = () => {
    const w = Number(inputWeight);
    if (!Number.isFinite(w) || w < 60 || w > 700) {
      showAlert('Invalid weight', 'Please enter a weight between 60 and 700 lbs.');
      return;
    }
    const bf = inputBodyFat.trim() ? Number(inputBodyFat) : undefined;
    const waist = inputWaist.trim() ? Number(inputWaist) : undefined;
    const todayKey = getTodayDateKey();

    logWeight(profile?.id, {
      logDate: todayKey,
      weightLbs: w,
      bodyFatPct: bf && bf > 0 ? bf : undefined,
      waistIn: waist && waist > 0 ? waist : undefined,
    });

    onboarding.setField('weightLbs', w);
    onboarding.calculateResults();
    const nextBmi = calculateBMI(w, onboarding.heightFt * 12 + onboarding.heightIn);
    const roundedBmi = Math.round(nextBmi * 10) / 10;
    updateProfile({ weightLbs: w, bmi: roundedBmi });

    if (profile?.id && !profile.id.startsWith('guest-')) {
      Promise.resolve(
        supabase
          .from('profiles')
          .update({ weight_lbs: w, bmi: roundedBmi })
          .eq('id', profile.id)
      ).catch(() => { });
    }

    setWeightModalOpen(false);
    setInputBodyFat('');
    setInputWaist('');
  };

  // Chart coordinates
  const chartH = 110;
  const padX = 12;
  const padY = 14;
  const rawVals = emaSeries.map((p) => p.raw);
  const trendVals = emaSeries.map((p) => p.trend);
  const allVals = [...rawVals, ...trendVals];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const span = maxVal - minVal || 2;

  const toCoords = (vals: number[]) =>
    vals.map((val, idx) => {
      const x =
        vals.length === 1
          ? chartWidth / 2
          : padX + (idx / (vals.length - 1)) * (chartWidth - padX * 2);
      const y = chartH - padY - ((val - minVal) / span) * (chartH - padY * 2);
      return { x, y };
    });

  const rawCoords = toCoords(rawVals);
  const trendCoords = toCoords(trendVals);
  const trendLineStr = trendCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>PROGRESS</Text>
            <Text style={styles.headerSub}>Track Your Gains</Text>
          </View>
          <TouchableOpacity
            style={styles.logWeightBtn}
            onPress={() => {
              setInputWeight(String(currentWeight));
              setWeightModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={14} color={colors.black} />
            <Text style={styles.logWeightBtnText}>LOG WEIGHT</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Trend (EMA) Card */}
        <Card glowColor="blue" style={styles.weightCard}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={styles.cardLabel}>CURRENT WEIGHT · TREND {latestTrend.toFixed(1)}</Text>
              <Text style={styles.bigValue}>
                {currentWeight} <Text style={styles.bigUnit}>lbs</Text>
              </Text>
            </View>
            <View style={styles.changeBadge}>
              {periodChange <= 0 ? (
                <TrendingDown size={14} color="#4CAF50" />
              ) : (
                <TrendingUp size={14} color={colors.gold} />
              )}
              <Text
                style={[
                  styles.changeText,
                  { color: periodChange <= 0 ? '#4CAF50' : colors.gold },
                ]}
              >
                {periodChange > 0 ? `+${periodChange}` : periodChange} lbs
              </Text>
              <Text style={styles.changePeriod}>{activePeriod}</Text>
            </View>
          </View>

          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodChip, activePeriod === p.key && styles.periodChipActive]}
                onPress={() => setActivePeriod(p.key)}
              >
                <Text
                  style={[
                    styles.periodText,
                    activePeriod === p.key && styles.periodTextActive,
                  ]}
                >
                  {p.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 120) setChartWidth(w);
            }}
          >
            <Svg width={chartWidth} height={chartH}>
              <Line
                x1={padX}
                y1={chartH - padY}
                x2={chartWidth - padX}
                y2={chartH - padY}
                stroke={colors.border}
                strokeWidth={1}
              />
              {trendCoords.length > 1 && (
                <Polyline
                  points={trendLineStr}
                  fill="none"
                  stroke={colors.blue}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {rawCoords.map((pt, i) => (
                <Circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={3.5}
                  fill={i === rawCoords.length - 1 ? colors.gold : `${colors.blue}70`}
                />
              ))}
            </Svg>
          </View>
          <View style={styles.chartFooter}>
            <Text style={styles.chartLegend}>● Raw weigh-ins  — Smoothed EMA trend</Text>
            <Text style={styles.chartLegend}>{emaSeries.length} entries</Text>
          </View>
        </Card>

        {/* Adaptive TDEE Check-In */}
        <Text style={styles.sectionTitle}>ADAPTIVE METABOLISM CHECK-IN</Text>
        <Card style={styles.adaptiveCard}>
          <View style={styles.adaptiveTop}>
            <Text style={styles.adaptiveHeading}>
              {adaptive.ready ? `TRUE EST. TDEE: ${adaptive.estimatedTdee} KCAL` : 'CALIBRATING METABOLISM'}
            </Text>
            <Text style={styles.adaptiveBadge}>
              {adaptive.confidence.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.adaptiveDesc}>{adaptive.reason}</Text>
          {!adaptive.ready ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={styles.adaptiveCalRow}>
                Weigh-ins: {adaptive.weightDaysLogged}/{adaptive.requiredDays} days · Food Logs: {adaptive.foodDaysLogged}/{adaptive.requiredDays} days
              </Text>
              <ProgressBar
                value={Math.min(
                  1,
                  (adaptive.weightDaysLogged + adaptive.foodDaysLogged) /
                  (adaptive.requiredDays * 2)
                )}
                color={colors.blue}
                height={5}
              />
            </View>
          ) : (
            adaptive.deltaKcal !== 0 && (
              <TouchableOpacity style={styles.applyAdaptiveBtn} onPress={handleApplyAdaptive}>
                <Text style={styles.applyAdaptiveText}>
                  APPLY WEEKLY ADJUSTMENT ({adaptive.deltaKcal > 0 ? `+${adaptive.deltaKcal}` : adaptive.deltaKcal} KCAL → {adaptive.suggestedCalories})
                </Text>
              </TouchableOpacity>
            )
          )}
        </Card>

        {/* Muscle Armor Index */}
        <Text style={styles.sectionTitle}>MUSCLE ARMOR INDEX</Text>
        <TouchableOpacity onPress={() => router.push('/glp1')} activeOpacity={0.85}>
          <Card glowColor="gold" style={styles.armorCard}>
            <View style={styles.armorTop}>
              <View style={styles.armorIcon}>
                <Shield size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.armorStatus}>{armor.status}</Text>
                <Text style={styles.armorHeadline}>{armor.headline}</Text>
              </View>
              <Text style={styles.armorScore}>{armor.score}</Text>
            </View>
            <ProgressBar
              value={armor.score / 100}
              color={colors.gold}
              height={5}
              style={{ marginVertical: 10 }}
            />
            <Text style={styles.armorGuidance}>
              {armor.guidance}
              {relStrengthDelta.hasBaseline
                ? ` Relative strength: ${relStrengthDelta.changePct >= 0 ? '+' : ''}${relStrengthDelta.changePct}%.`
                : ''}
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Body Measurements */}
        <Text style={styles.sectionTitle}>BODY MEASUREMENTS</Text>
        <View style={styles.measureGrid}>
          {[
            { label: 'EMA Trend', value: `${latestTrend.toFixed(1)} lbs` },
            { label: 'BMI', value: currentBmi > 0 ? String(currentBmi) : '—' },
            { label: 'Body Fat', value: lastBodyFat != null ? `${lastBodyFat}%` : '—' },
            { label: 'Waist', value: lastWaist != null ? `${lastWaist} in` : '—' },
          ].map((m) => (
            <Card key={m.label} style={styles.measureCard}>
              <Text style={styles.measureLabel}>{m.label}</Text>
              <Text style={styles.measureValue}>{m.value}</Text>
            </Card>
          ))}
        </View>

        {/* Strength Records */}
        <Text style={styles.sectionTitle}>STRENGTH RECORDS (EST. 1RM & ×BW)</Text>
        <Card style={styles.prsCard}>
          {prs.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyPrs}
              onPress={() => router.push('/(tabs)/training')}
            >
              <Text style={styles.emptyPrsText}>
                Complete your first workout to unlock estimated 1RM & relative strength records →
              </Text>
            </TouchableOpacity>
          ) : (
            prs.slice(0, 6).map((pr, idx) => {
              const rel = calculateRelativeStrength(pr.estimated1rm, currentWeight);
              return (
                <React.Fragment key={pr.lift}>
                  <View style={styles.prRow}>
                    <View style={styles.prIcon}>
                      <Award size={18} color={colors.gold} />
                    </View>
                    <View style={styles.prInfo}>
                      <Text style={styles.prLift}>{pr.lift}</Text>
                      <Text style={styles.prDate}>
                        {pr.date} · {pr.weightLbs} lbs × {pr.reps}
                      </Text>
                    </View>
                    <View style={styles.prResult}>
                      <Text style={styles.prWeight}>{pr.estimated1rm} lbs</Text>
                      <Text style={styles.prReps}>{rel}× BW</Text>
                    </View>
                  </View>
                  {idx < Math.min(prs.length, 6) - 1 && <View style={styles.divider} />}
                </React.Fragment>
              );
            })
          )}
        </Card>

        {/* Anti-Fragile Weekly Campaign */}
        <Text style={styles.sectionTitle}>7-DAY WEEKLY CAMPAIGN (NO STREAK ANXIETY)</Text>
        <TouchableOpacity onPress={() => router.push('/warband')} activeOpacity={0.85}>
          <Card glowColor="gold" style={styles.streakCard}>
            <View style={styles.campaignHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.campaignBig}>
                  {weeklyStats.workoutsLast7Days}/3 <Text style={styles.campaignUnit}>lifts</Text>
                </Text>
                <Text style={styles.shieldLink}>
                  {isCurrentWeekProtected
                    ? '🛡 PASS ACTIVE'
                    : `🛡 ${shieldWallPasses}/3 Passes · Warband →`}
                </Text>
              </View>
              <Text style={styles.campaignSub}>
                {weeklyStats.proteinShieldDaysLast7}/7 Protein Shield days hit this week
              </Text>
            </View>
            <View style={styles.campaignRow}>
              {campaignDays.map((d) => (
                <View key={d.dateKey} style={styles.campaignDayCol}>
                  <View
                    style={[
                      styles.campaignBadge,
                      d.hitLift && styles.campaignBadgeLift,
                      !d.hitLift && d.hitProtein && styles.campaignBadgeProtein,
                    ]}
                  >
                    <Text style={styles.campaignBadgeText}>
                      {d.hitLift ? '⚔' : d.hitProtein ? '🥩' : '·'}
                    </Text>
                  </View>
                  <Text style={styles.campaignDayLbl}>{d.dayLabel}</Text>
                </View>
              ))}
            </View>
          </Card>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Log Weight Modal */}
      <Modal
        visible={weightModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWeightModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LOG CHECK-IN</Text>
              <TouchableOpacity onPress={() => setWeightModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>WEIGHT (LBS)</Text>
            <TextInput
              style={styles.modalInput}
              value={inputWeight}
              onChangeText={setInputWeight}
              keyboardType="decimal-pad"
              placeholder="180.0"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.fieldLabel}>BODY FAT % (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              value={inputBodyFat}
              onChangeText={setInputBodyFat}
              keyboardType="decimal-pad"
              placeholder="e.g. 18.5"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.fieldLabel}>WAIST INCHES (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              value={inputWaist}
              onChangeText={setInputWaist}
              keyboardType="decimal-pad"
              placeholder="e.g. 34.0"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWeight}>
              <Text style={styles.saveBtnText}>SAVE CHECK-IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 40, color: colors.white, letterSpacing: 2, lineHeight: 40 },
  headerSub: { fontFamily: fonts.headingLight, fontSize: 13, color: colors.muted, letterSpacing: 3 },
  logWeightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  logWeightBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  weightCard: { marginBottom: 20 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 4 },
  bigValue: { fontFamily: fonts.display, fontSize: 46, color: colors.white, lineHeight: 48 },
  bigUnit: { fontSize: 20, color: colors.muted },
  changeBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.25)',
    borderRadius: radius.sm,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  changeText: { fontFamily: fonts.heading, fontSize: 15 },
  changePeriod: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  periodRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  periodChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  periodChipActive: { borderColor: colors.blue, backgroundColor: 'rgba(75,163,255,0.12)' },
  periodText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },
  periodTextActive: { color: colors.blue },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  chartLegend: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },

  adaptiveCard: { marginBottom: 20 },
  adaptiveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  adaptiveHeading: { fontFamily: fonts.heading, fontSize: 13, color: colors.frost, letterSpacing: 1 },
  adaptiveBadge: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.blue },
  adaptiveDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 17 },
  adaptiveCalRow: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.frost },
  applyAdaptiveBtn: { backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  applyAdaptiveText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 0.5 },
  shieldLink: { fontFamily: fonts.heading, fontSize: 11, color: colors.blue },

  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, letterSpacing: 2, marginBottom: 10 },
  armorCard: { marginBottom: 20 },
  armorTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  armorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(214,167,86,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  armorStatus: { fontFamily: fonts.heading, fontSize: 12, color: colors.gold, letterSpacing: 1.5 },
  armorHeadline: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  armorScore: { fontFamily: fonts.display, fontSize: 38, color: colors.gold, lineHeight: 40 },
  armorGuidance: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 17 },

  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  measureCard: { width: '47%', gap: 4 },
  measureLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  measureValue: { fontFamily: fonts.heading, fontSize: 22, color: colors.frost, marginTop: 4 },

  prsCard: { padding: 0, overflow: 'hidden', marginBottom: 20 },
  emptyPrs: { padding: 18 },
  emptyPrsText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 19 },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  prIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(214, 167, 86, 0.1)', alignItems: 'center', justifyContent: 'center' },
  prInfo: { flex: 1 },
  prLift: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  prDate: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  prResult: { alignItems: 'flex-end' },
  prWeight: { fontFamily: fonts.heading, fontSize: 16, color: colors.gold },
  prReps: { fontFamily: fonts.body, fontSize: 11, color: colors.blue, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  streakCard: { marginBottom: 20 },
  campaignHeader: { marginBottom: 14 },
  campaignBig: { fontFamily: fonts.display, fontSize: 40, color: colors.gold, lineHeight: 42 },
  campaignUnit: { fontFamily: fonts.headingLight, fontSize: 18, color: colors.muted },
  campaignSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  campaignRow: { flexDirection: 'row', justifyContent: 'space-between' },
  campaignDayCol: { alignItems: 'center', gap: 6 },
  campaignBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignBadgeLift: { borderColor: colors.gold, backgroundColor: 'rgba(214,167,86,0.18)' },
  campaignBadgeProtein: { borderColor: colors.blue, backgroundColor: 'rgba(75,163,255,0.15)' },
  campaignBadgeText: { fontSize: 14, color: colors.frost },
  campaignDayLbl: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.gold, letterSpacing: 1.5 },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 6 },
  modalInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.frost,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  saveBtnText: { fontFamily: fonts.heading, fontSize: 14, color: colors.black, letterSpacing: 1 },
});
