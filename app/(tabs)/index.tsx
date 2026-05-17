import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Sword, Play } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Static Mock Data (gamification — real system in Phase 2) ─────────────────

const mockRank = {
  rank: 'Raider',
  streakDays: 0,
  xpToday: 0,
  xpToNextRank: 840,
  xpCurrentTotal: 0,
  xpNextRankTotal: 5000,
};

const mockWater = {
  consumed: 6,
  target: 8,
};

const mockWorkout = {
  name: 'Push Day',
  subtitle: 'Chest, Shoulders & Triceps',
  exercises: 5,
  duration: 52,
  programName: 'Viking Strength Protocol',
  week: 3,
  day: 2,
};

const mockMeals = [
  {
    id: '1',
    emoji: '🍳',
    name: 'Scrambled Eggs + Toast',
    time: '7:42 AM',
    calories: 420,
    protein: 28,
    carbs: 38,
    fat: 14,
  },
  {
    id: '2',
    emoji: '🥗',
    name: 'Chicken Caesar Salad',
    time: '12:15 PM',
    calories: 610,
    protein: 48,
    carbs: 22,
    fat: 31,
  },
];

const mockWeight = {
  current: 184.8,
  change: -1.2,
  unit: 'lbs',
  weeklyData: [186.2, 185.8, 185.4, 185.6, 185.2, 184.9, 184.8],
};

const dailyQuotes = [
  { quote: 'A man without a goal is like a ship without a rudder.', source: 'Viking Proverb' },
  { quote: 'The fire that burns brightest is the one you feed every day.', source: 'Norse Saying' },
  { quote: 'Do not pray for an easy life. Pray for the strength to endure a hard one.', source: 'Warrior Code' },
  { quote: 'Cattle die, kinsmen die, but a great name never dies.', source: 'Hávamál' },
  { quote: 'Every warrior was once a beginner who refused to quit.', source: 'Viking Proverb' },
];

const todayQuote = dailyQuotes[new Date().getDate() % dailyQuotes.length];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

// ─── FadeSlide wrapper ────────────────────────────────────────────────────────

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

// ─── Ring Chart ───────────────────────────────────────────────────────────────

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
  const [dashOffset, setDashOffset] = useState(RING_CIRCUMFERENCE);

  useEffect(() => {
    setDashOffset(RING_CIRCUMFERENCE);
    const start = Date.now();
    const duration = 800;
    const startDelay = 200;
    const targetOffset = RING_CIRCUMFERENCE * (1 - Math.min(value, 1));

    const tick = () => {
      const elapsed = Date.now() - start - startDelay;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDashOffset(RING_CIRCUMFERENCE - eased * (RING_CIRCUMFERENCE - targetOffset));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [animKey, value]);

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
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={strokeColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
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
  const chartWidth = SCREEN_WIDTH - 40 - 40;
  const chartHeight = 60;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 6;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (chartWidth - pad * 2) + pad;
    const y = chartHeight - pad - ((val - min) / range) * (chartHeight - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const [lx, ly] = points[points.length - 1].split(',').map(Number);

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Polyline
        points={points.join(' ')}
        fill="none"
        stroke={colors.blue}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={lx} cy={ly} r={4} fill={colors.blue} />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [ringKey, setRingKey] = useState(0);

  // Real user data
  const onboarding = useOnboardingStore();
  const userProfile = useUserStore((s) => s.profile);
  const userName = userProfile?.name || onboarding.name || 'Warrior';

  // Calorie & macro targets from onboarding; consumed starts at 0 until food log is built
  const calTarget  = onboarding.calories > 0 ? onboarding.calories : 2000;
  const calConsumed = 0;
  const calRemaining = calTarget - calConsumed;

  const macros = {
    protein: { consumed: 0, target: onboarding.protein > 0 ? onboarding.protein : 150 },
    carbs:   { consumed: 0, target: onboarding.carbs   > 0 ? onboarding.carbs   : 200 },
    fat:     { consumed: 0, target: onboarding.fat     > 0 ? onboarding.fat     : 65  },
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setRingKey((k) => k + 1);
    }, 1000);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.black} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* ── 1: Header ── */}
        <FadeSlide delay={0}>
          <View style={styles.header}>
            <Text style={styles.headerBrand}>VIKING FITNESS</Text>
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={() => Alert.alert('No new notifications')}
              activeOpacity={0.7}
            >
              <Bell size={22} color={colors.muted} />
              <View style={styles.bellBadge} />
            </TouchableOpacity>
          </View>
        </FadeSlide>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.blue}
            />
          }
        >

          {/* ── 2: Hero Identity Block ── */}
          <FadeSlide delay={80}>
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
                  onPress={() => Alert.alert('Rank system coming in Progress tab')}
                  activeOpacity={0.7}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>⚔  {mockRank.rank.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.rankProgressRow}>
                <Text style={styles.rankProgressLabel}>RAIDER → BERSERKER</Text>
                <Text style={styles.rankProgressLabel}>
                  {mockRank.xpToNextRank.toLocaleString()} XP TO NEXT RANK
                </Text>
              </View>
              <ProgressBar
                value={mockRank.xpCurrentTotal / mockRank.xpNextRankTotal}
                color={colors.gold}
                height={4}
                backgroundColor={colors.border}
                style={{ marginTop: 6 }}
              />

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatEmoji}>🔥</Text>
                  <Text style={styles.heroStatText}>{mockRank.streakDays} day streak</Text>
                </View>
                <View style={styles.heroStat}>
                  <Sword size={14} color={colors.gold} />
                  <Text style={styles.heroStatText}>
                    {mockRank.xpToday.toLocaleString()} XP today
                  </Text>
                </View>
              </View>
            </View>
          </FadeSlide>

          {/* ── 3: Daily Command Rings ── */}
          <FadeSlide delay={160}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DAILY COMMAND</Text>
              <View style={styles.ringsRow}>
                <RingChart
                  animKey={ringKey}
                  value={calTarget > 0 ? calConsumed / calTarget : 0}
                  strokeColor={colors.blue}
                  centerTop={calRemaining.toString()}
                  centerBottom="left"
                  label="CALORIES"
                />
                <RingChart
                  animKey={ringKey}
                  value={macros.protein.target > 0 ? macros.protein.consumed / macros.protein.target : 0}
                  strokeColor={colors.gold}
                  centerTop={`${macros.protein.target - macros.protein.consumed}g`}
                  centerBottom="left"
                  label="PROTEIN"
                />
                <RingChart
                  animKey={ringKey}
                  value={mockWater.consumed / mockWater.target}
                  strokeColor="#58A6FF"
                  centerTop={`${mockWater.consumed}/${mockWater.target}`}
                  centerBottom="glasses"
                  label="WATER"
                />
              </View>
            </View>
          </FadeSlide>

          {/* ── 4: Macro Strip ── */}
          <FadeSlide delay={240}>
            <View style={styles.macroStrip}>
              {[
                { label: 'CALS',    value: calRemaining.toString(),                                    unit: '',  sub: 'remaining', dot: colors.blue },
                { label: 'PROTEIN', value: String(macros.protein.target - macros.protein.consumed),   unit: 'g', sub: 'left',      dot: colors.gold },
                { label: 'CARBS',   value: String(macros.carbs.target   - macros.carbs.consumed),     unit: 'g', sub: 'left',      dot: 'rgba(75,163,255,0.6)' },
                { label: 'FAT',     value: String(macros.fat.target     - macros.fat.consumed),       unit: 'g', sub: 'left',      dot: colors.muted },
              ].map((m) => (
                <View key={m.label} style={styles.macroCard}>
                  <View style={[styles.macroDot, { backgroundColor: m.dot }]} />
                  <Text style={styles.macroValue}>
                    {m.value}<Text style={styles.macroUnit}>{m.unit}</Text>
                  </Text>
                  <Text style={styles.macroSub}>{m.sub}</Text>
                  <Text style={styles.macroCardLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </FadeSlide>

          {/* ── 5: Today's Quest ── */}
          <FadeSlide delay={320}>
            <View style={styles.questCard}>
              <View style={styles.questAccent} />
              <View style={styles.questContent}>
                <View style={styles.questLeft}>
                  <View style={styles.questTitleRow}>
                    <Sword size={14} color={colors.blue} />
                    <Text style={styles.questEyebrow}>TODAY'S QUEST</Text>
                  </View>
                  <Text style={styles.questName}>{mockWorkout.name.toUpperCase()}</Text>
                  <Text style={styles.questSubtitle}>{mockWorkout.subtitle}</Text>
                  <View style={styles.questStats}>
                    <Text style={styles.questStat}>{mockWorkout.exercises} exercises</Text>
                    <View style={styles.questDot} />
                    <Text style={styles.questStat}>{mockWorkout.duration} min</Text>
                  </View>
                  <Text style={styles.questProgram}>
                    {mockWorkout.programName} · Wk{mockWorkout.week} D{mockWorkout.day}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.beginBtn}
                  onPress={() => Alert.alert('Coming soon — Training tab')}
                  activeOpacity={0.7}
                >
                  <Play size={12} color={colors.black} fill={colors.black} />
                  <Text style={styles.beginBtnText}>BEGIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeSlide>

          {/* ── 6: Meal Log ── */}
          <FadeSlide delay={400}>
            <View style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <Text style={styles.sectionLabel}>TODAY'S RATIONS</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Coming soon — Nutrition tab')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addMeal}>+ ADD</Text>
                </TouchableOpacity>
              </View>
              {mockMeals.map((meal) => (
                <View key={meal.id} style={styles.mealRow}>
                  <View style={styles.mealEmoji}>
                    <Text style={styles.mealEmojiText}>{meal.emoji}</Text>
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                    <Text style={styles.mealMacros}>
                      {meal.calories} cal  ·  P:{meal.protein}g  C:{meal.carbs}g  F:{meal.fat}g
                    </Text>
                  </View>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
              ))}
            </View>
          </FadeSlide>

          {/* ── 7: Weekly Spark ── */}
          <FadeSlide delay={480}>
            <View style={styles.section}>
              <View style={styles.sparkHeader}>
                <Text style={styles.sectionLabel}>THIS WEEK</Text>
                <Text style={styles.weightChange}>
                  {mockWeight.change.toFixed(1)} {mockWeight.unit} ↓
                </Text>
              </View>
              <Sparkline data={mockWeight.weeklyData} />
              <View style={styles.dayLabels}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <Text key={d} style={styles.dayLabel}>{d}</Text>
                ))}
              </View>
              <View style={styles.weightRow}>
                <Text style={styles.weightToday}>
                  {mockWeight.current} {mockWeight.unit} today
                </Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Coming soon — Progress tab')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewProgress}>View Progress →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeSlide>

          {/* ── 8: Norse Quote ── */}
          <FadeSlide delay={560}>
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

  // Hero
  heroCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
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
  rankBadgeText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1,
  },
  rankProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  rankProgressLabel: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatEmoji: { fontSize: 16 },
  heroStatText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.frost,
  },

  // Section card
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
    marginBottom: 16,
  },

  // Rings
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ringWrap: {
    alignItems: 'center',
    gap: 8,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringCenterTop: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.frost,
  },
  ringCenterBottom: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  ringLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
  },

  // Macro strip
  macroStrip: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  macroValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.frost,
    lineHeight: 22,
  },
  macroUnit: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  macroSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  macroCardLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },

  // Quest card
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
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  questContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingLeft: 24,
  },
  questLeft: { flex: 1 },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questEyebrow: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.blue,
    letterSpacing: 2,
  },
  questName: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.frost,
    lineHeight: 30,
    marginTop: 2,
  },
  questSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  questStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  questStat: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.frost,
  },
  questDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  questProgram: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  beginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  beginBtnText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.black,
  },

  // Meal log
  mealSection: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addMeal: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.blue,
    marginBottom: 16,
  },
  mealRow: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealEmoji: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmojiText: { fontSize: 18 },
  mealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mealName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.frost,
  },
  mealMacros: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  mealTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },

  // Sparkline
  sparkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  weightChange: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: '#3FB950',
    marginBottom: 16,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  dayLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  weightToday: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.frost,
  },
  viewProgress: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.blue,
  },

  // Quote
  quoteSection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quoteText: {
    fontFamily: fonts.headingLight,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteSource: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.border,
    marginTop: 6,
    textAlign: 'center',
  },
});
