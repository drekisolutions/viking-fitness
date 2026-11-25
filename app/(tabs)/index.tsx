import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Sword, Play, Syringe, Droplets } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts, radius } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import {
  useTrackerStore,
  getTodayDateKey,
  getDateKeyDaysAgo,
  getDayTotals,
  getWeeklyCampaignStats,
} from '@/store/tracker';
import {
  calculateTDEE,
  computeWarriorRank,
} from '@/constants/calculations';
import { getShotWavePhase } from '@/constants/glp1';
import { getIronRationsCoupling } from '@/constants/adaptive';
import {
  getWeekStartKey,
  computeMemberWeeklyRaidDamage,
  computeRaidProgress,
} from '@/constants/warband';
import { getWorkoutsForSplit } from '@/constants/workouts';
import { showAlert } from '@/lib/confirm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const dailyQuotes = [
  { quote: 'A man without a goal is like a ship without a rudder.', source: 'Viking Proverb' },
  { quote: 'The fire that burns brightest is the one you feed every day.', source: 'Norse Saying' },
  { quote: 'Do not pray for an easy life. Pray for the strength to endure a hard one.', source: 'Warrior Code' },
  { quote: 'Cattle die, kinsmen die, but a great name never dies.', source: 'Hávamál' },
  { quote: 'Every warrior was once a beginner who refused to quit.', source: 'Viking Proverb' },
];

const todayQuote = dailyQuotes[new Date().getDate() % dailyQuotes.length];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function FadeSlide({ delay, children }: { delay: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Reanimated Ring Chart (zero setState-in-rAF re-renders) ───────────────────

const RING_SIZE = 90;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function RingChart({
  value,
  strokeColor,
  centerTop,
  centerBottom,
  label,
  animKey,
}: {
  value: number;
  strokeColor: string;
  centerTop: string;
  centerBottom: string;
  label: string;
  animKey: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      180,
      withTiming(Math.min(Math.max(value, 0), 1), {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [animKey, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={styles.ringWrap}>
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={strokeColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringCenterTop}>{centerTop}</Text>
          <Text style={styles.ringCenterBottom}>{centerBottom}</Text>
        </View>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const chartWidth = Math.min(540, SCREEN_WIDTH - 80);
  const chartHeight = 60;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 6;

  const points = data.map((val, i) => {
    const x =
      data.length === 1
        ? chartWidth / 2
        : (i / (data.length - 1)) * (chartWidth - pad * 2) + pad;
    const y = chartHeight - pad - ((val - min) / range) * (chartHeight - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const [lx, ly] = points[points.length - 1].split(',').map(Number);

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {data.length > 1 && (
        <Polyline
          points={points.join(' ')}
          fill="none"
          stroke={colors.blue}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <Circle cx={lx} cy={ly} r={4} fill={colors.blue} />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [ringKey, setRingKey] = useState(0);

  const onboarding = useOnboardingStore();
  const userProfile = useUserStore((s) => s.profile);
  const {
    foodLogs,
    waterByDate,
    weightLogs,
    workoutSessions,
    activeWorkout,
    selectedSplit,
    glp1Profile,
    glp1Shots,
    warband,
    incrementWater,
    toggleElectrolytes,
    startActiveWorkout,
    syncWarbandDamage,
  } = useTrackerStore();

  const userName = userProfile?.name || onboarding.name || 'Warrior';
  const todayKey = getTodayDateKey();

  const heightIn = onboarding.heightFt * 12 + onboarding.heightIn;
  const tdee = calculateTDEE(
    onboarding.weightLbs || 180,
    heightIn || 70,
    onboarding.age || 30,
    onboarding.sex || 'male',
    onboarding.activityLevel || 1.375
  );

  const wave = useMemo(
    () =>
      getShotWavePhase(
        glp1Profile,
        glp1Shots,
        onboarding.calories,
        onboarding.protein,
        tdee
      ),
    [glp1Profile, glp1Shots, onboarding.calories, onboarding.protein, tdee]
  );

  const baseCalTarget = glp1Profile.enabled
    ? wave.adaptedCalories
    : onboarding.calories > 0
      ? onboarding.calories
      : 2000;
  const proteinTarget = glp1Profile.enabled
    ? wave.proteinFloorG
    : onboarding.protein > 0
      ? onboarding.protein
      : 150;
  const baseCarbsTarget = glp1Profile.enabled
    ? wave.adaptedCarbsG
    : onboarding.carbs > 0
      ? onboarding.carbs
      : 200;
  const fatTarget = glp1Profile.enabled
    ? wave.adaptedFatG
    : onboarding.fat > 0
      ? onboarding.fat
      : 65;

  const todaySessions = useMemo(
    () => workoutSessions.filter((s) => s.completedAt.slice(0, 10) === todayKey),
    [workoutSessions, todayKey]
  );

  const coupling = useMemo(
    () =>
      getIronRationsCoupling({
        todayDateKey: todayKey,
        todaySessions,
        activeWorkout,
        recentFoodLogs: foodLogs,
        baseCalories: baseCalTarget,
        baseProtein: proteinTarget,
        baseCarbs: baseCarbsTarget,
        baseFat: fatTarget,
        glp1Phase: glp1Profile.enabled ? wave.phase : undefined,
      }),
    [
      todayKey,
      todaySessions,
      activeWorkout,
      foodLogs,
      baseCalTarget,
      proteinTarget,
      baseCarbsTarget,
      fatTarget,
      glp1Profile.enabled,
      wave.phase,
    ]
  );

  const calTarget = coupling.adaptedCalories;
  const carbsTarget = coupling.adaptedCarbsG;

  // Weekly Raid Boss summary (current Mon-Sun campaign)
  const weekStartKey = getWeekStartKey();
  const weeklyRaidInfo = useMemo(() => {
    const sessionsThisWeek = workoutSessions.filter(
      (s) => s.completedAt.slice(0, 10) >= weekStartKey
    );
    const prCountThisWeek = sessionsThisWeek.reduce(
      (sum, s) => sum + s.sets.filter((st) => st.isPr).length,
      0
    );
    const proMap = new Map<string, number>();
    for (const f of foodLogs) {
      if (f.logDate >= weekStartKey) {
        proMap.set(f.logDate, (proMap.get(f.logDate) ?? 0) + (f.protein || 0));
      }
    }
    const threshold = Math.max(60, Math.round(proteinTarget * 0.8));
    let proteinShieldDaysThisWeek = 0;
    for (const val of proMap.values()) {
      if (val >= threshold) proteinShieldDaysThisWeek += 1;
    }
    let electrolyteDaysThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const k = getDateKeyDaysAgo(i);
      if (k >= weekStartKey && waterByDate[k]?.electrolytesTaken) {
        electrolyteDaysThisWeek += 1;
      }
    }
    const damage = computeMemberWeeklyRaidDamage({
      workoutsThisWeek: sessionsThisWeek.length,
      prCountThisWeek,
      proteinShieldDaysThisWeek,
      electrolyteDaysThisWeek,
    });
    const members =
      warband && warband.members.length > 0
        ? warband.members
        : [
            {
              userId: userProfile?.id || 'solo',
              displayName: userName,
              weeklyDamage: damage,
              weeklyWorkouts: sessionsThisWeek.length,
              weeklyProteinDays: proteinShieldDaysThisWeek,
            },
          ];
    return {
      damage,
      workoutsThisWeek: sessionsThisWeek.length,
      proteinShieldDaysThisWeek,
      raid: computeRaidProgress(members),
    };
  }, [workoutSessions, foodLogs, waterByDate, proteinTarget, weekStartKey, warband, userProfile?.id, userName]);

  useEffect(() => {
    if (!warband) return;
    syncWarbandDamage(userProfile?.id, userName, {
      damage: weeklyRaidInfo.damage,
      workouts: weeklyRaidInfo.workoutsThisWeek,
      proteinDays: weeklyRaidInfo.proteinShieldDaysThisWeek,
    });
  }, [
    warband?.id,
    weeklyRaidInfo.damage,
    weeklyRaidInfo.workoutsThisWeek,
    weeklyRaidInfo.proteinShieldDaysThisWeek,
    userProfile?.id,
    userName,
  ]);

  const dayTotals = useMemo(() => getDayTotals(foodLogs, todayKey), [foodLogs, todayKey]);
  const calRemaining = Math.max(0, calTarget - dayTotals.calories);
  const waterToday = waterByDate[todayKey] ?? { glasses: 0, electrolytesTaken: false };
  const waterTarget = 8;

  const weeklyStats = useMemo(
    () => getWeeklyCampaignStats(workoutSessions, foodLogs, waterByDate, proteinTarget),
    [workoutSessions, foodLogs, waterByDate, proteinTarget]
  );

  const rankState = useMemo(
    () =>
      computeWarriorRank({
        totalWorkouts: weeklyStats.totalWorkouts,
        proteinShieldDays: weeklyStats.totalProteinShieldDays,
        totalVolumeLbs: weeklyStats.totalVolumeLbs,
      }),
    [weeklyStats]
  );

  const splitWorkouts = getWorkoutsForSplit(selectedSplit);
  const nextWorkout = splitWorkouts[workoutSessions.length % splitWorkouts.length] ?? splitWorkouts[0];

  // Real weight sparkline data (last 7 entries or starting weight)
  const weightSeries = useMemo(() => {
    if (weightLogs.length === 0) {
      return [onboarding.weightLbs || 180];
    }
    return weightLogs.slice(-7).map((w) => w.weightLbs);
  }, [weightLogs, onboarding.weightLbs]);

  const currentWeight = weightSeries[weightSeries.length - 1];
  const weightDelta =
    weightSeries.length > 1
      ? Math.round((currentWeight - weightSeries[0]) * 10) / 10
      : 0;

  // Real reminders
  const reminders = useMemo(() => {
    const list: string[] = [];
    if (glp1Profile.enabled && wave.daysUntilNextShot === 0) {
      list.push('GLP-1 shot scheduled today — tap the Muscle Armor card to log.');
    }
    const proLeft = Math.max(0, Math.round(proteinTarget - dayTotals.protein));
    if (proLeft > 0) {
      list.push(`${proLeft}g protein remaining to hit today's Protein Shield.`);
    }
    if (glp1Profile.enabled && !waterToday.electrolytesTaken) {
      list.push('Log today’s electrolytes to protect hydration & recovery.');
    }
    return list;
  }, [glp1Profile.enabled, wave.daysUntilNextShot, proteinTarget, dayTotals.protein, waterToday.electrolytesTaken]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setRingKey((k) => k + 1);
    }, 450);
  }, []);

  const handleStartQuest = () => {
    if (!activeWorkout) {
      startActiveWorkout(nextWorkout, wave.phase === 'peak', wave.phase);
    }
    router.push('/workout-session');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── 1: Header ── */}
        <FadeSlide delay={0}>
          <View style={styles.header}>
            <Text style={styles.headerBrand}>VIKING FITNESS</Text>
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={() =>
                showAlert(
                  reminders.length > 0 ? 'Daily Reminders' : 'All Clear',
                  reminders.length > 0
                    ? reminders.map((r) => `• ${r}`).join('\n\n')
                    : 'Your targets are on track today, Warrior.'
                )
              }
              activeOpacity={0.7}
            >
              <Bell size={22} color={reminders.length > 0 ? colors.frost : colors.muted} />
              {reminders.length > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
          </View>
        </FadeSlide>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
          }
        >
          {/* ── 2: Hero Identity Block ── */}
          <FadeSlide delay={60}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={['#0D1A2E', colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.heroName}>{userName.toUpperCase()}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/progress')}
                  activeOpacity={0.7}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>⚔ {rankState.rank.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.rankProgressRow}>
                <Text style={styles.rankProgressLabel}>
                  {rankState.nextRank
                    ? `${rankState.rank.toUpperCase()} → ${rankState.nextRank.toUpperCase()}`
                    : 'ODINBORN · MAX RANK'}
                </Text>
                <Text style={styles.rankProgressLabel}>
                  {rankState.nextRank
                    ? `${rankState.xpToNext.toLocaleString()} XP TO NEXT RANK`
                    : `${rankState.xp.toLocaleString()} TOTAL XP`}
                </Text>
              </View>
              <ProgressBar
                value={rankState.progress}
                color={colors.gold}
                height={4}
                backgroundColor={colors.border}
                style={{ marginTop: 6 }}
              />

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatEmoji}>🛡</Text>
                  <Text style={styles.heroStatText}>
                    {weeklyStats.workoutsLast7Days}/3 lifts · {weeklyStats.proteinShieldDaysLast7}/7 protein
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Sword size={14} color={colors.gold} />
                  <Text style={styles.heroStatText}>{rankState.xp.toLocaleString()} XP</Text>
                </View>
              </View>
            </View>
          </FadeSlide>

          {/* ── 2b: GLP-1 Muscle Armor Banner ── */}
          <FadeSlide delay={100}>
            <TouchableOpacity
              style={[
                styles.glp1Banner,
                glp1Profile.enabled && styles.glp1BannerActive,
              ]}
              onPress={() => router.push('/glp1')}
              activeOpacity={0.85}
            >
              <View style={styles.glp1IconWrap}>
                <Syringe size={18} color="#AB47BC" />
              </View>
              <View style={{ flex: 1 }}>
                {glp1Profile.enabled ? (
                  <>
                    <Text style={styles.glp1BannerEyebrow}>{wave.label}</Text>
                    <Text style={styles.glp1BannerSub}>
                      {wave.adaptedCalories} kcal · {wave.proteinFloorG}g Protein Shield
                      {wave.daysUntilNextShot !== null
                        ? ` · ${wave.daysUntilNextShot === 0 ? 'Shot today' : `Next in ${wave.daysUntilNextShot}d`}`
                        : ''}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.glp1BannerEyebrow}>GLP-1 MUSCLE ARMOR</Text>
                    <Text style={styles.glp1BannerSub}>
                      On Ozempic, Zepbound, or Wegovy? Sync shot waves & guard lean muscle →
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </FadeSlide>

          {/* ── 2c: Weekly Boss Raid Strip ── */}
          <FadeSlide delay={120}>
            <TouchableOpacity
              style={styles.raidStrip}
              onPress={() => router.push('/warband')}
              activeOpacity={0.85}
            >
              <View style={styles.raidTop}>
                <Text style={styles.raidBossName}>⚔ {weeklyRaidInfo.raid.boss.name}</Text>
                <Text style={styles.raidDamageText}>
                  {weeklyRaidInfo.raid.totalDamage}/{weeklyRaidInfo.raid.maxHp} DMG ·{' '}
                  {weeklyRaidInfo.raid.daysLeft}d left
                </Text>
              </View>
              <ProgressBar
                value={weeklyRaidInfo.raid.progressPct / 100}
                color={
                  weeklyRaidInfo.raid.defeated
                    ? '#3FB950'
                    : weeklyRaidInfo.raid.boss.accentColor
                }
                height={5}
              />
            </TouchableOpacity>
          </FadeSlide>

          {/* ── 3: Daily Command Rings ── */}
          <FadeSlide delay={140}>
            <View style={styles.section}>
              <View style={styles.dailyCmdHead}>
                <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>DAILY COMMAND</Text>
                {coupling.nutritionBadge && (
                  <View style={styles.refuelBadge}>
                    <Text style={styles.refuelBadgeText}>{coupling.nutritionBadge}</Text>
                  </View>
                )}
              </View>
              <View style={{ height: 14 }} />
              <View style={styles.ringsRow}>
                <RingChart
                  animKey={ringKey}
                  value={calTarget > 0 ? dayTotals.calories / calTarget : 0}
                  strokeColor={colors.blue}
                  centerTop={String(calRemaining)}
                  centerBottom="left"
                  label="CALORIES"
                />
                <RingChart
                  animKey={ringKey}
                  value={proteinTarget > 0 ? dayTotals.protein / proteinTarget : 0}
                  strokeColor={colors.gold}
                  centerTop={`${Math.max(0, Math.round(proteinTarget - dayTotals.protein))}g`}
                  centerBottom={glp1Profile.enabled ? 'shield left' : 'left'}
                  label="PROTEIN"
                />
                <TouchableOpacity
                  onPress={() => incrementWater(userProfile?.id, todayKey, 1)}
                  activeOpacity={0.8}
                >
                  <RingChart
                    animKey={ringKey}
                    value={waterToday.glasses / waterTarget}
                    strokeColor="#58A6FF"
                    centerTop={`${waterToday.glasses}/${waterTarget}`}
                    centerBottom="tap +1"
                    label="WATER"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.waterQuickRow}>
                <TouchableOpacity
                  style={styles.waterBtn}
                  onPress={() => incrementWater(userProfile?.id, todayKey, -1)}
                >
                  <Text style={styles.waterBtnText}>−1 Glass</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.electrolyteBtn,
                    waterToday.electrolytesTaken && styles.electrolyteBtnOn,
                  ]}
                  onPress={() => toggleElectrolytes(userProfile?.id, todayKey)}
                >
                  <Droplets
                    size={13}
                    color={waterToday.electrolytesTaken ? colors.black : colors.blue}
                  />
                  <Text
                    style={[
                      styles.electrolyteText,
                      waterToday.electrolytesTaken && { color: colors.black },
                    ]}
                  >
                    {waterToday.electrolytesTaken ? 'Electrolytes Logged' : '+ Electrolytes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeSlide>

          {/* ── 4: Macro Strip ── */}
          <FadeSlide delay={180}>
            <View style={styles.macroStrip}>
              {[
                { label: 'CALS', value: String(calRemaining), unit: '', sub: 'remaining', dot: colors.blue },
                { label: 'PROTEIN', value: String(Math.max(0, Math.round(proteinTarget - dayTotals.protein))), unit: 'g', sub: 'left', dot: colors.gold },
                { label: 'CARBS', value: String(Math.max(0, Math.round(carbsTarget - dayTotals.carbs))), unit: 'g', sub: 'left', dot: 'rgba(75,163,255,0.6)' },
                { label: 'FAT', value: String(Math.max(0, Math.round(fatTarget - dayTotals.fat))), unit: 'g', sub: 'left', dot: colors.muted },
              ].map((m) => (
                <View key={m.label} style={styles.macroCard}>
                  <View style={[styles.macroDot, { backgroundColor: m.dot }]} />
                  <Text style={styles.macroValue}>
                    {m.value}
                    <Text style={styles.macroUnit}>{m.unit}</Text>
                  </Text>
                  <Text style={styles.macroSub}>{m.sub}</Text>
                  <Text style={styles.macroCardLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </FadeSlide>

          {/* ── 5: Today's Quest ── */}
          <FadeSlide delay={220}>
            <View style={styles.questCard}>
              <View
                style={[
                  styles.questAccent,
                  { backgroundColor: activeWorkout ? colors.gold : nextWorkout.accentColor },
                ]}
              />
              <View style={styles.questContent}>
                <View style={styles.questLeft}>
                  <View style={styles.questTitleRow}>
                    <Sword size={14} color={colors.blue} />
                    <Text style={styles.questEyebrow}>
                      {activeWorkout ? 'BATTLE IN PROGRESS' : "TODAY'S QUEST"}
                    </Text>
                  </View>
                  <Text style={styles.questName}>
                    {activeWorkout ? activeWorkout.name : nextWorkout.name}
                  </Text>
                  <Text style={styles.questSubtitle}>
                    {activeWorkout ? `${activeWorkout.split} · Active` : nextWorkout.muscleFocus}
                  </Text>
                  <View style={styles.questStats}>
                    <Text style={styles.questStat}>
                      {(activeWorkout ?? nextWorkout).exercises.length} exercises
                    </Text>
                    <View style={styles.questDot} />
                    <Text style={styles.questStat}>{nextWorkout.durationMin} min</Text>
                  </View>
                  <Text style={styles.questProgram}>
                    {selectedSplit} · {nextWorkout.dayLabel}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.beginBtn, activeWorkout && { backgroundColor: colors.gold }]}
                  onPress={handleStartQuest}
                  activeOpacity={0.75}
                >
                  <Play size={12} color={colors.black} fill={colors.black} />
                  <Text style={styles.beginBtnText}>
                    {activeWorkout ? 'RESUME' : 'BEGIN'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeSlide>

          {/* ── 6: Meal Log ── */}
          <FadeSlide delay={260}>
            <View style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <Text style={styles.sectionLabel}>TODAY'S RATIONS</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/nutrition')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addMeal}>+ ADD</Text>
                </TouchableOpacity>
              </View>
              {dayTotals.items.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyMealRow}
                  onPress={() => router.push('/(tabs)/nutrition')}
                  activeOpacity={0.75}
                >
                  <Text style={styles.emptyMealText}>
                    No rations logged yet today — tap + ADD to log food or scan a barcode.
                  </Text>
                </TouchableOpacity>
              ) : (
                dayTotals.items.slice(0, 4).map((meal) => (
                  <View key={meal.id} style={styles.mealRow}>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName} numberOfLines={1}>
                        {meal.name}
                      </Text>
                      <Text style={styles.mealMacros}>
                        {meal.calories} cal · P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                      </Text>
                    </View>
                    <Text style={styles.mealTime}>{meal.mealSlot}</Text>
                  </View>
                ))
              )}
            </View>
          </FadeSlide>

          {/* ── 7: Weekly Weight Sparkline ── */}
          <FadeSlide delay={300}>
            <View style={styles.section}>
              <View style={styles.sparkHeader}>
                <Text style={styles.sectionLabel}>WEIGHT TREND</Text>
                {weightDelta !== 0 && (
                  <Text
                    style={[
                      styles.weightChange,
                      { color: weightDelta < 0 ? '#4CAF50' : colors.gold },
                    ]}
                  >
                    {weightDelta > 0 ? `+${weightDelta}` : weightDelta} lbs{' '}
                    {weightDelta < 0 ? '↓' : '↑'}
                  </Text>
                )}
              </View>
              <Sparkline data={weightSeries} />
              <View style={styles.weightRow}>
                <Text style={styles.weightToday}>{currentWeight} lbs current</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/progress')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewProgress}>View Progress →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeSlide>

          {/* ── 8: Norse Quote ── */}
          <FadeSlide delay={340}>
            <View style={styles.quoteSection}>
              <Text style={styles.quoteText}>"{todayQuote.quote}"</Text>
              <Text style={styles.quoteSource}>— {todayQuote.source}</Text>
            </View>
          </FadeSlide>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { flex: 1, backgroundColor: colors.black },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerBrand: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.gold,
    letterSpacing: 3,
  },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  heroCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.frost,
    marginTop: -2,
    lineHeight: 38,
  },
  rankBadge: {
    backgroundColor: 'rgba(214,167,86,0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rankBadgeText: { fontFamily: fonts.heading, fontSize: 12, color: colors.gold, letterSpacing: 1 },
  rankProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  rankProgressLabel: { fontFamily: fonts.heading, fontSize: 10, color: colors.muted, letterSpacing: 1 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatEmoji: { fontSize: 15 },
  heroStatText: { fontFamily: fonts.heading, fontSize: 13, color: colors.frost },

  glp1Banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(171,71,188,0.3)',
    padding: 14,
  },
  glp1BannerActive: { backgroundColor: 'rgba(171,71,188,0.09)', borderColor: '#AB47BC' },
  glp1IconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(171,71,188,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glp1BannerEyebrow: { fontFamily: fonts.heading, fontSize: 12, color: '#E1BEE7', letterSpacing: 1 },
  glp1BannerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  raidStrip: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  raidTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  raidBossName: { fontFamily: fonts.heading, fontSize: 12, color: colors.frost, letterSpacing: 1 },
  raidDamageText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.gold },
  dailyCmdHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  refuelBadge: {
    backgroundColor: 'rgba(214,167,86,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.35)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  refuelBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.gold },

  section: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 14,
  },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ringWrap: { alignItems: 'center', gap: 8 },
  ringContainer: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringCenterTop: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.frost },
  ringCenterBottom: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  ringLabel: { fontFamily: fonts.heading, fontSize: 11, color: colors.muted, letterSpacing: 1 },

  waterQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  waterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waterBtnText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted },
  electrolyteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(75,163,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(75,163,255,0.35)',
  },
  electrolyteBtnOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  electrolyteText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.blue },

  macroStrip: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 12 },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  macroValue: { fontFamily: fonts.heading, fontSize: 18, color: colors.frost, lineHeight: 22 },
  macroUnit: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  macroSub: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  macroCardLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },

  questCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  questAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.blue,
  },
  questContent: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingLeft: 24 },
  questLeft: { flex: 1 },
  questTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  questEyebrow: { fontFamily: fonts.heading, fontSize: 11, color: colors.blue, letterSpacing: 2 },
  questName: { fontFamily: fonts.display, fontSize: 26, color: colors.frost, lineHeight: 28, marginTop: 2 },
  questSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  questStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  questStat: { fontFamily: fonts.heading, fontSize: 12, color: colors.frost },
  questDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
  questProgram: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 4 },
  beginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  beginBtnText: { fontFamily: fonts.heading, fontSize: 14, color: colors.black, letterSpacing: 1 },

  mealSection: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  addMeal: { fontFamily: fonts.heading, fontSize: 13, color: colors.blue, letterSpacing: 1 },
  emptyMealRow: { paddingVertical: 12 },
  emptyMealText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 19 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mealInfo: { flex: 1, marginRight: 10 },
  mealName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  mealMacros: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  mealTime: { fontFamily: fonts.body, fontSize: 11, color: colors.blue, textTransform: 'capitalize' },

  sparkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  weightChange: { fontFamily: fonts.heading, fontSize: 14 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  weightToday: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.frost },
  viewProgress: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.blue },

  quoteSection: { paddingHorizontal: 28, paddingVertical: 20, alignItems: 'center' },
  quoteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  quoteSource: { fontFamily: fonts.headingLight, fontSize: 11, color: colors.muted, marginTop: 6, letterSpacing: 1.5 },
});
