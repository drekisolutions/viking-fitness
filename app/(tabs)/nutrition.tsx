import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Plus, Search, ChevronDown, ChevronUp, Info, TriangleAlert } from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts, radius } from '@/constants/theme';
import { getPlanInfo, getDayMeals, type MealPlanInfo } from '@/constants/mealPlans';

// ─── Mock food diary (Phase 3 will be real) ───────────────────────────────────

const FOOD_LOG = [
  { id: '1', name: 'Greek Yogurt', brand: 'Chobani', calories: 120, protein: 17, carbs: 8, fat: 2, qty: '1 cup' },
  { id: '2', name: 'Oatmeal', brand: 'Quaker', calories: 150, protein: 5, carbs: 27, fat: 3, qty: '½ cup dry' },
  { id: '3', name: 'Banana', brand: 'Fresh', calories: 105, protein: 1, carbs: 27, fat: 0, qty: '1 medium' },
  { id: '4', name: 'Whey Protein', brand: 'Optimum Nutrition', calories: 120, protein: 24, carbs: 3, fat: 1, qty: '1 scoop' },
];

const DIARY_MEALS = [
  { id: 'breakfast', label: 'Breakfast', target: 600, consumed: 480, foods: FOOD_LOG },
  { id: 'lunch', label: 'Lunch', target: 700, consumed: 0, foods: [] },
  { id: 'dinner', label: 'Dinner', target: 800, consumed: 0, foods: [] },
  { id: 'snacks', label: 'Snacks', target: 300, consumed: 0, foods: [] },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MealTimeline({ plan }: { plan: MealPlanInfo }) {
  const dayMeals = getDayMeals(plan);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={styles.timelineWrap}>
      {dayMeals.map(({ slot, meal }, idx) => {
        const isOpen = expanded === slot.id;
        const isGlp1 = plan.isGlp1;
        const accentColor = plan.accentColor;

        return (
          <View key={slot.id} style={styles.timelineRow}>
            {/* Time stem */}
            <View style={styles.stemCol}>
              <View style={[styles.stemDot, { backgroundColor: accentColor }]} />
              {idx < dayMeals.length - 1 && <View style={[styles.stemLine, { backgroundColor: accentColor + '30' }]} />}
            </View>

            {/* Meal card */}
            <TouchableOpacity
              style={[styles.mealTimeCard, isOpen && styles.mealTimeCardOpen]}
              onPress={() => setExpanded(isOpen ? null : slot.id)}
              activeOpacity={0.85}
            >
              <View style={styles.mealTimeHeader}>
                <View style={styles.mealTimeLeft}>
                  <Text style={styles.mealTimeLabel}>{slot.label}</Text>
                  <Text style={styles.mealTimeClock}>{slot.time}</Text>
                </View>
                <View style={styles.mealTimeRight}>
                  <Text style={styles.mealTimeEmoji}>{meal.emoji}</Text>
                  <Text style={styles.mealTimeCalories}>{meal.calories} kcal</Text>
                  {isOpen ? (
                    <ChevronUp size={14} color={colors.muted} />
                  ) : (
                    <ChevronDown size={14} color={colors.muted} />
                  )}
                </View>
              </View>

              {isOpen && (
                <View style={styles.mealTimeDetail}>
                  <View style={[styles.mealTimeDivider, { backgroundColor: accentColor + '30' }]} />
                  <Text style={styles.mealTimeName}>{meal.name}</Text>
                  <Text style={styles.mealTimePortion}>{meal.portion}</Text>
                  <View style={styles.mealTimeMacros}>
                    <View style={styles.macroChip}>
                      <Text style={[styles.macroChipVal, { color: accentColor }]}>{meal.protein}g</Text>
                      <Text style={styles.macroChipLabel}>Protein</Text>
                    </View>
                    <View style={styles.macroChip}>
                      <Text style={[styles.macroChipVal, { color: colors.gold }]}>{meal.carbs}g</Text>
                      <Text style={styles.macroChipLabel}>Carbs</Text>
                    </View>
                    <View style={styles.macroChip}>
                      <Text style={[styles.macroChipVal, { color: colors.muted }]}>{meal.fat}g</Text>
                      <Text style={styles.macroChipLabel}>Fat</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

function Glp1Alert({ plan }: { plan: MealPlanInfo }) {
  return (
    <View style={styles.glp1Card}>
      <View style={styles.glp1Header}>
        <TriangleAlert size={16} color="#AB47BC" />
        <Text style={styles.glp1Title}>GLP-1 COMPANION PLAN</Text>
      </View>
      <Text style={styles.glp1Subtitle}>
        {plan.tagline}
      </Text>
      <Text style={styles.glp1Note}>{plan.glp1Note}</Text>
      <View style={styles.glp1Stats}>
        <View style={styles.glp1Stat}>
          <Text style={styles.glp1StatValue}>5</Text>
          <Text style={styles.glp1StatLabel}>Small Meals</Text>
        </View>
        <View style={styles.glp1StatDivider} />
        <View style={styles.glp1Stat}>
          <Text style={styles.glp1StatValue}>900–1,200</Text>
          <Text style={styles.glp1StatLabel}>Kcal Target</Text>
        </View>
        <View style={styles.glp1StatDivider} />
        <View style={styles.glp1Stat}>
          <Text style={styles.glp1StatValue}>42%</Text>
          <Text style={styles.glp1StatLabel}>Protein</Text>
        </View>
      </View>
    </View>
  );
}

function PlanGuide({ plan }: { plan: MealPlanInfo }) {
  const [showAvoid, setShowAvoid] = useState(false);

  return (
    <View style={styles.guideWrap}>
      <Card style={styles.guideCard}>
        <View style={styles.guideHeader}>
          <Info size={14} color={plan.accentColor} />
          <Text style={styles.guideTitle}>FOCUS FOODS</Text>
        </View>
        <View style={styles.pillWrap}>
          {plan.focusFoods.map((f) => (
            <View key={f} style={[styles.pill, { borderColor: plan.accentColor + '50' }]}>
              <Text style={[styles.pillText, { color: plan.accentColor }]}>{f}</Text>
            </View>
          ))}
        </View>
      </Card>

      <TouchableOpacity
        style={styles.avoidToggle}
        onPress={() => setShowAvoid(!showAvoid)}
        activeOpacity={0.7}
      >
        <Text style={styles.avoidToggleText}>
          {showAvoid ? '▲ Hide' : '▼ Show'} Foods to Avoid
        </Text>
      </TouchableOpacity>

      {showAvoid && (
        <Card style={styles.avoidCard}>
          {plan.avoidFoods.map((f) => (
            <View key={f} style={styles.avoidRow}>
              <Text style={styles.avoidX}>✕</Text>
              <Text style={styles.avoidText}>{f}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.tipsCard}>
        <Text style={styles.guideTitle}>WARRIOR TIPS</Text>
        {plan.tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={[styles.tipNum, { color: plan.accentColor }]}>{i + 1}</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  calories, protein, carbs, fat,
  consumed, consumedP, consumedC, consumedF,
}: {
  calories: number; protein: number; carbs: number; fat: number;
  consumed: number; consumedP: number; consumedC: number; consumedF: number;
}) {
  return (
    <Card glowColor="blue" style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View>
          <Text style={styles.summaryLabel}>CALORIES TODAY</Text>
          <View style={styles.calRow}>
            <Text style={styles.calConsumed}>{consumed}</Text>
            <Text style={styles.calSep}> / </Text>
            <Text style={styles.calGoal}>{calories > 0 ? calories : '—'}</Text>
            <Text style={styles.calUnit}>kcal</Text>
          </View>
        </View>
        <View style={styles.remainBox}>
          <Text style={styles.remainValue}>{Math.max(calories - consumed, 0)}</Text>
          <Text style={styles.remainLabel}>remaining</Text>
        </View>
      </View>
      <ProgressBar
        value={calories > 0 ? consumed / calories : 0}
        color={colors.blue}
        height={6}
        style={{ marginBottom: 16 }}
      />
      <View style={styles.macroStrip}>
        {[
          { label: 'Protein', consumed: consumedP, total: protein, color: colors.blue },
          { label: 'Carbs', consumed: consumedC, total: carbs, color: colors.gold },
          { label: 'Fat', consumed: consumedF, total: fat, color: '#E57373' },
        ].map((m, idx) => (
          <View key={m.label} style={[styles.macroCol, idx < 2 && styles.macroColBorder]}>
            <Text style={[styles.macroConsumed, { color: m.color }]}>{m.consumed}g</Text>
            <Text style={styles.macroTotal}>/ {m.total > 0 ? `${m.total}g` : '—'}</Text>
            <Text style={styles.macroLabelSmall}>{m.label}</Text>
            <ProgressBar
              value={m.total > 0 ? Math.min(m.consumed / m.total, 1) : 0}
              color={m.color}
              height={3}
              style={{ marginTop: 6 }}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { calories, protein, carbs, fat, mealPlan } = useOnboardingStore();
  const [activeTab, setActiveTab] = useState<'plan' | 'diary'>('plan');
  const [expandedMeal, setExpandedMeal] = useState<string | null>('breakfast');

  const plan = getPlanInfo(mealPlan);

  const totalConsumed = DIARY_MEALS.reduce((sum, m) => sum + m.consumed, 0);
  const consumedProtein = FOOD_LOG.reduce((s, f) => s + f.protein, 0);
  const consumedCarbs = FOOD_LOG.reduce((s, f) => s + f.carbs, 0);
  const consumedFat = FOOD_LOG.reduce((s, f) => s + f.fat, 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>NUTRITION</Text>
            <Text style={[styles.headerSub, { color: plan.accentColor }]}>
              {plan.name.toUpperCase()} PLAN
            </Text>
          </View>
          <TouchableOpacity style={styles.searchBtn}>
            <Search size={20} color={colors.frost} />
          </TouchableOpacity>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'plan' && styles.tabActive]}
            onPress={() => setActiveTab('plan')}
          >
            <Text style={[styles.tabText, activeTab === 'plan' && styles.tabTextActive]}>
              MEAL PLAN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'diary' && styles.tabActive]}
            onPress={() => setActiveTab('diary')}
          >
            <Text style={[styles.tabText, activeTab === 'diary' && styles.tabTextActive]}>
              FOOD DIARY
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PLAN TAB ── */}
        {activeTab === 'plan' && (
          <>
            {/* GLP-1 Alert */}
            {plan.isGlp1 && <Glp1Alert plan={plan} />}

            {/* Summary */}
            <SummaryCard
              calories={calories} protein={protein} carbs={carbs} fat={fat}
              consumed={totalConsumed}
              consumedP={consumedProtein} consumedC={consumedCarbs} consumedF={consumedFat}
            />

            {/* Plan description */}
            <View style={styles.planDescWrap}>
              <Text style={[styles.planDescName, { color: plan.accentColor }]}>
                {plan.name.toUpperCase()}
              </Text>
              <Text style={styles.planDescTagline}>{plan.tagline}</Text>
              <Text style={styles.planDescText}>{plan.description}</Text>
              <View style={styles.planMacroChips}>
                <View style={[styles.planMacroChip, { borderColor: plan.accentColor + '60' }]}>
                  <Text style={[styles.planMacroChipText, { color: plan.accentColor }]}>
                    {plan.macroSplit}
                  </Text>
                </View>
                <View style={[styles.planMacroChip, { borderColor: colors.border }]}>
                  <Text style={[styles.planMacroChipText, { color: colors.muted }]}>
                    {plan.mealsPerDay} meals/day
                  </Text>
                </View>
              </View>
            </View>

            {/* Today's meals timeline */}
            <Text style={styles.sectionTitle}>TODAY'S WAR RATIONS</Text>
            <MealTimeline plan={plan} />

            {/* Plan guide */}
            <Text style={styles.sectionTitle}>YOUR BATTLE GUIDE</Text>
            <PlanGuide plan={plan} />
          </>
        )}

        {/* ── DIARY TAB ── */}
        {activeTab === 'diary' && (
          <>
            <SummaryCard
              calories={calories} protein={protein} carbs={carbs} fat={fat}
              consumed={totalConsumed}
              consumedP={consumedProtein} consumedC={consumedCarbs} consumedF={consumedFat}
            />

            <Text style={styles.sectionTitle}>FOOD DIARY</Text>
            {DIARY_MEALS.map((meal) => (
              <Card key={meal.id} style={styles.mealCard}>
                <TouchableOpacity
                  style={styles.mealHeader}
                  onPress={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                >
                  <View style={styles.mealHeaderLeft}>
                    <Text style={styles.mealName}>{meal.label}</Text>
                    <Text style={styles.mealCalories}>
                      {meal.consumed} / {meal.target} kcal
                    </Text>
                  </View>
                  <View style={styles.mealHeaderRight}>
                    <ProgressBar
                      value={meal.consumed / meal.target}
                      color={meal.consumed > 0 ? colors.blue : colors.border}
                      height={4}
                      style={{ width: 60, marginRight: 10 }}
                    />
                    <TouchableOpacity style={styles.addFoodBtn}>
                      <Plus size={16} color={colors.blue} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {expandedMeal === meal.id && meal.foods.length > 0 && (
                  <View style={styles.foodList}>
                    <View style={styles.divider} />
                    {meal.foods.map((food, idx) => (
                      <React.Fragment key={food.id}>
                        <TouchableOpacity style={styles.foodRow} activeOpacity={0.7}>
                          <View style={styles.foodInfo}>
                            <Text style={styles.foodName}>{food.name}</Text>
                            <Text style={styles.foodDetail}>{food.brand} · {food.qty}</Text>
                          </View>
                          <View style={styles.foodMacros}>
                            <Text style={styles.foodCalories}>{food.calories} kcal</Text>
                            <Text style={styles.foodMacroLine}>
                              P{food.protein} C{food.carbs} F{food.fat}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {idx < meal.foods.length - 1 && <View style={styles.innerDivider} />}
                      </React.Fragment>
                    ))}
                  </View>
                )}

                {expandedMeal === meal.id && meal.foods.length === 0 && (
                  <View style={styles.emptyMeal}>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.logFoodBtn}>
                      <Plus size={16} color={colors.muted} />
                      <Text style={styles.logFoodText}>Log a food</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { backgroundColor: colors.black },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.white,
    letterSpacing: 2,
    lineHeight: 40,
  },
  headerSub: {
    fontFamily: fonts.headingLight,
    fontSize: 13,
    letterSpacing: 3,
  },
  searchBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm - 4,
  },
  tabActive: { backgroundColor: colors.black },
  tabText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 1,
  },
  tabTextActive: { color: colors.frost },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // GLP-1 Alert
  glp1Card: {
    backgroundColor: 'rgba(171, 71, 188, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(171, 71, 188, 0.35)',
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  glp1Header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  glp1Title: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: '#AB47BC',
    letterSpacing: 2,
  },
  glp1Subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  glp1Note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.frost,
    lineHeight: 18,
    marginBottom: 14,
  },
  glp1Stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  glp1Stat: { flex: 1, alignItems: 'center' },
  glp1StatValue: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: '#AB47BC',
    lineHeight: 20,
  },
  glp1StatLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  glp1StatDivider: { width: 1, height: 32, backgroundColor: colors.border },

  // Summary Card
  summaryCard: { marginBottom: 16 },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLabel: {
    fontFamily: fonts.bodyMedium, fontSize: 10,
    color: colors.muted, letterSpacing: 2, marginBottom: 6,
  },
  calRow: { flexDirection: 'row', alignItems: 'flex-end' },
  calConsumed: { fontFamily: fonts.display, fontSize: 42, color: colors.white, lineHeight: 42 },
  calSep: { fontFamily: fonts.body, fontSize: 22, color: colors.muted, lineHeight: 38 },
  calGoal: { fontFamily: fonts.heading, fontSize: 20, color: colors.muted, lineHeight: 38 },
  calUnit: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginLeft: 4, marginBottom: 4 },
  remainBox: { alignItems: 'flex-end' },
  remainValue: { fontFamily: fonts.display, fontSize: 28, color: colors.blue, lineHeight: 28 },
  remainLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  macroStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  macroCol: { flex: 1, paddingHorizontal: 8, alignItems: 'center' },
  macroColBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  macroConsumed: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 22 },
  macroTotal: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  macroLabelSmall: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },

  // Plan description
  planDescWrap: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  planDescName: {
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 2,
  },
  planDescTagline: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.frost,
    lineHeight: 28,
    marginBottom: 8,
  },
  planDescText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  planMacroChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  planMacroChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  planMacroChipText: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  // Section title
  sectionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },

  // Meal Timeline
  timelineWrap: { marginBottom: 24 },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  stemCol: { width: 20, alignItems: 'center', paddingTop: 18 },
  stemDot: { width: 10, height: 10, borderRadius: 5 },
  stemLine: { flex: 1, width: 2, marginTop: 4 },
  mealTimeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  mealTimeCardOpen: { borderColor: colors.blue + '50' },
  mealTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mealTimeLeft: {},
  mealTimeLabel: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.frost,
    letterSpacing: 0.5,
  },
  mealTimeClock: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  mealTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTimeEmoji: { fontSize: 18 },
  mealTimeCalories: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.frost,
  },
  mealTimeDetail: { paddingHorizontal: 14, paddingBottom: 14 },
  mealTimeDivider: { height: 1, marginBottom: 12 },
  mealTimeName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.frost,
    marginBottom: 2,
  },
  mealTimePortion: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 18,
  },
  mealTimeMacros: { flexDirection: 'row', gap: 16 },
  macroChip: { alignItems: 'center' },
  macroChipVal: { fontFamily: fonts.heading, fontSize: 15 },
  macroChipLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 1 },

  // Guide
  guideWrap: { gap: 12, marginBottom: 24 },
  guideCard: { padding: 16 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  guideTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surfaceLight,
  },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  avoidToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  avoidToggleText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  avoidCard: { padding: 16, gap: 8 },
  avoidRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avoidX: { fontFamily: fonts.heading, fontSize: 13, color: colors.red },
  avoidText: { fontFamily: fonts.body, fontSize: 13, color: colors.frost, flex: 1 },
  tipsCard: { padding: 16, gap: 10 },
  tipRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tipNum: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 20, minWidth: 16 },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.frost,
    flex: 1,
    lineHeight: 19,
  },

  // Diary
  mealCard: { padding: 0, overflow: 'hidden', marginBottom: 12 },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  mealHeaderLeft: { flex: 1 },
  mealName: { fontFamily: fonts.heading, fontSize: 16, color: colors.frost, letterSpacing: 0.5 },
  mealCalories: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addFoodBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(75,163,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(75,163,255,0.3)',
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  innerDivider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
  foodList: {},
  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  foodInfo: { flex: 1 },
  foodName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  foodDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  foodMacros: { alignItems: 'flex-end' },
  foodCalories: { fontFamily: fonts.heading, fontSize: 15, color: colors.blue },
  foodMacroLine: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  emptyMeal: {},
  logFoodBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 14,
  },
  logFoodText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
