import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  Syringe,
  Trash2,
  X,
  Droplets,
  Barcode,
  Sparkles,
  Check,
} from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import {
  useTrackerStore,
  getTodayDateKey,
  getDayTotals,
} from '@/store/tracker';
import { Card } from '@/components/ui/Card';
import { AIPlanCard } from '@/components/AIPlanCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts, radius } from '@/constants/theme';
import {
  getPlanInfo,
  getDayMeals,
  type MealPlanInfo,
  type MealSlot,
} from '@/constants/mealPlans';
import { calculateTDEE, scaleMealToTarget } from '@/constants/calculations';
import { getShotWavePhase } from '@/constants/glp1';
import { getIronRationsCoupling } from '@/constants/adaptive';
import { CURATED_FOODS } from '@/constants/foods';
import type { SalvageOption, ParsedFoodItem } from '@/constants/tacticalFallback';
import { searchFoods, lookupBarcode, type FoodSearchResult } from '@/lib/foodSearch';
import { getSalvageDayOptions, parseFoodTextSmart } from '@/lib/tactical';
import { analyzeMealPhoto, type MealPhotoScan } from '@/lib/pro';
import { showAlert } from '@/lib/confirm';

function MealTimeline({
  plan,
  targetCalories,
  onLogPlannedMeal,
}: {
  plan: MealPlanInfo;
  targetCalories: number;
  onLogPlannedMeal: (slot: MealSlot, meal: {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
}) {
  const dayMeals = getDayMeals(plan);
  const [expanded, setExpanded] = useState<string | null>(null);

  const planBaseTotal = useMemo(
    () => dayMeals.reduce((sum, item) => sum + item.meal.calories, 0) || 1800,
    [dayMeals]
  );
  const rawScale = targetCalories > 0 ? targetCalories / planBaseTotal : 1;

  return (
    <View style={styles.timelineWrap}>
      {dayMeals.map(({ slot, meal }, idx) => {
        const isOpen = expanded === slot.id;
        const accentColor = plan.accentColor;
        const scaled = scaleMealToTarget(meal, rawScale);

        return (
          <View key={slot.id} style={styles.timelineRow}>
            <View style={styles.stemCol}>
              <View style={[styles.stemDot, { backgroundColor: accentColor }]} />
              {idx < dayMeals.length - 1 && (
                <View style={[styles.stemLine, { backgroundColor: accentColor + '30' }]} />
              )}
            </View>

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
                  <Text style={styles.mealTimeCalories}>{scaled.calories} kcal</Text>
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
                  <Text style={styles.mealTimePortion}>
                    {meal.portion}
                    {scaled.factor !== 1 ? ` (scaled ×${scaled.factor.toFixed(2)})` : ''}
                  </Text>
                  <View style={styles.mealTimeMacros}>
                    <View style={styles.macroChip}>
                      <Text style={[styles.macroChipVal, { color: accentColor }]}>
                        {scaled.protein}g
                      </Text>
                      <Text style={styles.macroChipLabel}>Protein</Text>
                    </View>
                    <View style={styles.macroChip}>
                      <Text style={[styles.macroChipVal, { color: colors.gold }]}>
                        {scaled.carbs}g
                      </Text>
                      <Text style={styles.macroChipLabel}>Carbs</Text>
                    </View>
                    <View style={styles.macroChip}>
                      <Text style={[styles.macroChipVal, { color: colors.muted }]}>
                        {scaled.fat}g
                      </Text>
                      <Text style={styles.macroChipLabel}>Fat</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.logPlannedBtn, { borderColor: accentColor }]}
                    onPress={() =>
                      onLogPlannedMeal(slot, {
                        name: meal.name,
                        portion: meal.portion,
                        calories: scaled.calories,
                        protein: scaled.protein,
                        carbs: scaled.carbs,
                        fat: scaled.fat,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color={accentColor} />
                    <Text style={[styles.logPlannedBtnText, { color: accentColor }]}>
                      LOG TO DIARY
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
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

function SummaryCard({
  calories,
  protein,
  carbs,
  fat,
  consumed,
  consumedP,
  consumedC,
  consumedF,
  isGlp1,
  refuelBadge,
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumed: number;
  consumedP: number;
  consumedC: number;
  consumedF: number;
  isGlp1: boolean;
  refuelBadge: string | null;
}) {
  return (
    <Card glowColor="blue" style={styles.summaryCard}>
      {refuelBadge && (
        <View style={styles.refuelBanner}>
          <Text style={styles.refuelBannerText}>{refuelBadge}</Text>
        </View>
      )}
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
          {
            label: isGlp1 ? 'Protein Shield' : 'Protein',
            consumed: Math.round(consumedP),
            total: protein,
            color: colors.gold,
          },
          { label: 'Carbs', consumed: Math.round(consumedC), total: carbs, color: colors.blue },
          { label: 'Fat', consumed: Math.round(consumedF), total: fat, color: '#E57373' },
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

export default function NutritionScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const onboarding = useOnboardingStore();
  const {
    foodLogs,
    waterByDate,
    workoutSessions,
    activeWorkout,
    glp1Profile,
    glp1Shots,
    addFoodLog,
    removeFoodLog,
    toggleElectrolytes,
  } = useTrackerStore();

  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro';
  const isPro = profile?.plan === 'pro';
  const [activeTab, setActiveTab] = useState<'plan' | 'diary'>('diary');
  const [expandedMeal, setExpandedMeal] = useState<string | null>('breakfast');

  // Add Food Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<'quick' | 'text' | 'photo' | 'search' | 'custom'>('quick');
  const [photoScanning, setPhotoScanning] = useState(false);
  const [photoScanResult, setPhotoScanResult] = useState<MealPhotoScan | null>(null);
  const [targetSlot, setTargetSlot] = useState<string>('breakfast');
  const [glp1FilterOnly, setGlp1FilterOnly] = useState<boolean>(glp1Profile.enabled);

  // Text / Voice Natural-Language Parser state
  const [nlText, setNlText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[]>([]);
  const [parsingText, setParsingText] = useState(false);

  // Search / Barcode state
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Custom Food state
  const [customName, setCustomName] = useState('');
  const [customPortion, setCustomPortion] = useState('1 serving');
  const [customCal, setCustomCal] = useState('');
  const [customPro, setCustomPro] = useState('');
  const [customCarb, setCustomCarb] = useState('');
  const [customFat, setCustomFat] = useState('');

  // Salvage My Day Modal state
  const [salvageModalOpen, setSalvageModalOpen] = useState(false);
  const [salvageOptions, setSalvageOptions] = useState<SalvageOption[]>([]);
  const [salvaging, setSalvaging] = useState(false);
  const [salvageSource, setSalvageSource] = useState<'local' | 'ai'>('local');

  const plan = getPlanInfo(onboarding.mealPlan);
  const todayKey = getTodayDateKey();
  const waterToday = waterByDate[todayKey] ?? { glasses: 0, electrolytesTaken: false };

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

  const dayTotals = useMemo(() => getDayTotals(foodLogs, todayKey), [foodLogs, todayKey]);

  const diarySlots = useMemo(() => {
    const useGlp1Slots = glp1Profile.enabled || plan.isGlp1;
    const slotDefs = useGlp1Slots
      ? [
          { id: 'breakfast', label: 'Breakfast', target: Math.round(calTarget * 0.22) },
          { id: 'mid_morning', label: 'Mid-Morning', target: Math.round(calTarget * 0.16) },
          { id: 'lunch', label: 'Lunch', target: Math.round(calTarget * 0.25) },
          { id: 'afternoon', label: 'Afternoon', target: Math.round(calTarget * 0.14) },
          { id: 'dinner', label: 'Dinner', target: Math.round(calTarget * 0.23) },
        ]
      : [
          { id: 'breakfast', label: 'Breakfast', target: Math.round(calTarget * 0.25) },
          { id: 'lunch', label: 'Lunch', target: Math.round(calTarget * 0.30) },
          { id: 'dinner', label: 'Dinner', target: Math.round(calTarget * 0.33) },
          { id: 'snacks', label: 'Snacks', target: Math.round(calTarget * 0.12) },
        ];

    return slotDefs.map((slot) => {
      const foods = dayTotals.items.filter((f) => f.mealSlot === slot.id);
      const consumed = foods.reduce((s, f) => s + f.calories, 0);
      return { ...slot, foods, consumed };
    });
  }, [glp1Profile.enabled, plan.isGlp1, calTarget, dayTotals.items]);

  const quickFoods = useMemo(
    () =>
      glp1FilterOnly
        ? CURATED_FOODS.filter((f) => f.glp1Friendly)
        : CURATED_FOODS,
    [glp1FilterOnly]
  );

  const openAddModal = (
    slotId: string,
    tab: 'quick' | 'text' | 'search' | 'custom' = 'quick'
  ) => {
    setTargetSlot(slotId);
    setModalTab(tab);
    setGlp1FilterOnly(glp1Profile.enabled);
    setModalVisible(true);
  };

  const handleLogResult = (item: {
    name: string;
    brand?: string;
    portion?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    source: string;
  }) => {
    addFoodLog(profile?.id, {
      logDate: todayKey,
      mealSlot: targetSlot,
      name: item.name,
      brand: item.brand,
      portion: item.portion,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      source: item.source,
    });
    setModalVisible(false);
    setActiveTab('diary');
    setExpandedMeal(targetSlot);
  };

  const handleParseNlFood = async (useAi: boolean) => {
    if (!nlText.trim()) {
      showAlert('Enter food text', 'Type or dictate what you ate, e.g. "2 eggs, 1 cup Greek yogurt, 1 banana".');
      return;
    }
    setParsingText(true);
    try {
      const res = await parseFoodTextSmart(nlText, useAi);
      setParsedItems(res.items);
    } finally {
      setParsingText(false);
    }
  };

  const handleLogParsedItems = () => {
    const selected = parsedItems.filter((p) => p.selected);
    if (selected.length === 0) {
      showAlert('No items selected', 'Select at least one parsed food item to log.');
      return;
    }
    for (const p of selected) {
      addFoodLog(profile?.id, {
        logDate: todayKey,
        mealSlot: targetSlot,
        name: p.name,
        brand: 'Quick Parse',
        portion: p.portion,
        calories: p.calories,
        protein: p.protein,
        carbs: p.carbs,
        fat: p.fat,
        source: 'text_parse',
      });
    }
    setNlText('');
    setParsedItems([]);
    setModalVisible(false);
    setActiveTab('diary');
    setExpandedMeal(targetSlot);
  };

  const handleOpenSalvage = async (preferAi: boolean) => {
    setSalvageModalOpen(true);
    setSalvaging(true);
    try {
      const res = await getSalvageDayOptions(
        {
          remainingCalories: Math.max(0, calTarget - dayTotals.calories),
          remainingProtein: Math.max(0, proteinTarget - dayTotals.protein),
          remainingCarbs: Math.max(0, carbsTarget - dayTotals.carbs),
          remainingFat: Math.max(0, fatTarget - dayTotals.fat),
          isGlp1: glp1Profile.enabled || Boolean(plan.isGlp1),
        },
        preferAi
      );
      setSalvageOptions(res.options);
      setSalvageSource(res.source);
    } finally {
      setSalvaging(false);
    }
  };

  const handleRunSearch = async () => {
    setSearching(true);
    try {
      const results = await searchFoods(searchQuery);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleBarcodeLookup = async () => {
    if (!barcodeQuery.trim()) return;
    setSearching(true);
    try {
      const item = await lookupBarcode(barcodeQuery);
      if (item) {
        setSearchResults([item]);
      } else {
        showAlert('Not found', 'No matching food found for that barcode. Try text search or Custom.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      showAlert('Name required', 'Enter a food name.');
      return;
    }
    const cal = Math.max(0, Number(customCal) || 0);
    const pro = Math.max(0, Number(customPro) || 0);
    const carb = Math.max(0, Number(customCarb) || 0);
    const fat = Math.max(0, Number(customFat) || 0);
    const computedCal =
      cal > 0 ? cal : Math.round(pro * 4 + carb * 4 + fat * 9);

    handleLogResult({
      name: customName.trim(),
      brand: 'Custom',
      portion: customPortion.trim() || '1 serving',
      calories: computedCal,
      protein: pro,
      carbs: carb,
      fat,
      source: 'manual',
    });

    setCustomName('');
    setCustomCal('');
    setCustomPro('');
    setCustomCarb('');
    setCustomFat('');
  };

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
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => openAddModal('breakfast', 'search')}
          >
            <Search size={20} color={colors.frost} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'diary' && styles.tabActive]}
            onPress={() => setActiveTab('diary')}
          >
            <Text style={[styles.tabText, activeTab === 'diary' && styles.tabTextActive]}>
              FOOD DIARY
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'plan' && styles.tabActive]}
            onPress={() => setActiveTab('plan')}
          >
            <Text style={[styles.tabText, activeTab === 'plan' && styles.tabTextActive]}>
              MEAL PLAN
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {(glp1Profile.enabled || plan.isGlp1) && (
          <View style={styles.glp1Card}>
            <TouchableOpacity
              onPress={() => router.push('/glp1')}
              activeOpacity={0.8}
            >
              <View style={styles.glp1Header}>
                <Syringe size={16} color="#AB47BC" />
                <Text style={styles.glp1Title}>{wave.label}</Text>
              </View>
              <Text style={styles.glp1Note}>{wave.nutritionNote}</Text>
            </TouchableOpacity>
            <View style={styles.glp1BottomRow}>
              <Text style={styles.glp1StatChip}>
                Shield: {Math.round(dayTotals.protein)}/{wave.proteinFloorG}g
              </Text>
              <TouchableOpacity
                style={[
                  styles.electroToggle,
                  waterToday.electrolytesTaken && styles.electroToggleOn,
                ]}
                onPress={() => toggleElectrolytes(profile?.id, todayKey)}
              >
                <Droplets
                  size={12}
                  color={waterToday.electrolytesTaken ? colors.black : colors.blue}
                />
                <Text
                  style={[
                    styles.electroToggleText,
                    waterToday.electrolytesTaken && { color: colors.black },
                  ]}
                >
                  {waterToday.electrolytesTaken ? 'Electrolytes ✓' : '+ Electrolytes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <SummaryCard
          calories={calTarget}
          protein={proteinTarget}
          carbs={carbsTarget}
          fat={fatTarget}
          consumed={dayTotals.calories}
          consumedP={dayTotals.protein}
          consumedC={dayTotals.carbs}
          consumedF={dayTotals.fat}
          isGlp1={glp1Profile.enabled || Boolean(plan.isGlp1)}
          refuelBadge={coupling.nutritionBadge}
        />

        {activeTab === 'diary' && (
          <>
            <View style={styles.diaryHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>TODAY'S FOOD DIARY</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleOpenSalvage(false)}>
                  <Text style={styles.salvageLink}>⚡ SALVAGE MY DAY</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openAddModal('breakfast', 'text')}>
                  <Text style={styles.quickAddLink}>+ TEXT / LOG</Text>
                </TouchableOpacity>
              </View>
            </View>

            {diarySlots.map((meal) => (
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
                      value={meal.target > 0 ? meal.consumed / meal.target : 0}
                      color={meal.consumed > 0 ? colors.blue : colors.border}
                      height={4}
                      style={{ width: 60, marginRight: 10 }}
                    />
                    <TouchableOpacity
                      style={styles.addFoodBtn}
                      onPress={() => openAddModal(meal.id, 'quick')}
                    >
                      <Plus size={16} color={colors.blue} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {expandedMeal === meal.id && meal.foods.length > 0 && (
                  <View>
                    <View style={styles.divider} />
                    {meal.foods.map((food, idx) => (
                      <React.Fragment key={food.id}>
                        <View style={styles.foodRow}>
                          <View style={styles.foodInfo}>
                            <Text style={styles.foodName}>{food.name}</Text>
                            <Text style={styles.foodDetail}>
                              {food.brand ? `${food.brand} · ` : ''}
                              {food.portion || '1 serving'}
                            </Text>
                          </View>
                          <View style={styles.foodMacros}>
                            <Text style={styles.foodCalories}>{food.calories} kcal</Text>
                            <Text style={styles.foodMacroLine}>
                              P{food.protein} C{food.carbs} F{food.fat}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeFoodLog(profile?.id, food.id)}
                            hitSlop={8}
                            style={{ padding: 4 }}
                          >
                            <Trash2 size={15} color={colors.muted} />
                          </TouchableOpacity>
                        </View>
                        {idx < meal.foods.length - 1 && <View style={styles.innerDivider} />}
                      </React.Fragment>
                    ))}
                  </View>
                )}

                {expandedMeal === meal.id && meal.foods.length === 0 && (
                  <View>
                    <View style={styles.divider} />
                    <TouchableOpacity
                      style={styles.logFoodBtn}
                      onPress={() => openAddModal(meal.id, 'quick')}
                    >
                      <Plus size={16} color={colors.muted} />
                      <Text style={styles.logFoodText}>Log a food</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {activeTab === 'plan' && (
          <>
            <AIPlanCard type="meal" />

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
                    {plan.mealsPerDay} meals/day · scaled to {calTarget} kcal
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>TODAY'S WAR RATIONS</Text>
            <MealTimeline
              plan={plan}
              targetCalories={calTarget}
              onLogPlannedMeal={(slot, meal) => {
                const slotKey = diarySlots.some((s) => s.id === slot.id)
                  ? slot.id
                  : 'snacks';
                addFoodLog(profile?.id, {
                  logDate: todayKey,
                  mealSlot: slotKey,
                  name: meal.name,
                  brand: `${plan.name} Plan`,
                  portion: meal.portion,
                  calories: meal.calories,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fat: meal.fat,
                  source: 'meal_plan',
                });
                setActiveTab('diary');
                setExpandedMeal(slotKey);
              }}
            />

            <Text style={styles.sectionTitle}>YOUR BATTLE GUIDE</Text>
            <PlanGuide plan={plan} />
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add Food Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LOG FOOD ({targetSlot.replace('_', ' ').toUpperCase()})</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTabRow}>
              {[
                { key: 'quick', label: 'Shield' },
                { key: 'text', label: 'Text/Mic' },
                { key: 'photo', label: 'Photo' },
                { key: 'search', label: 'Search' },
                { key: 'custom', label: 'Custom' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.modalTabBtn, modalTab === t.key && styles.modalTabBtnActive]}
                  onPress={() =>
                    setModalTab(t.key as 'quick' | 'text' | 'photo' | 'search' | 'custom')
                  }
                >
                  <Text
                    style={[
                      styles.modalTabText,
                      modalTab === t.key && { color: colors.black },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {modalTab === 'quick' && (
              <>
                <TouchableOpacity
                  style={[styles.filterPill, glp1FilterOnly && styles.filterPillOn]}
                  onPress={() => setGlp1FilterOnly((v) => !v)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      glp1FilterOnly && { color: '#E1BEE7' },
                    ]}
                  >
                    {glp1FilterOnly ? '✓ GLP-1 Easy-Digest High-Protein Only' : 'Show All Curated Foods'}
                  </Text>
                </TouchableOpacity>
                <ScrollView style={{ maxHeight: 380 }}>
                  {quickFoods.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.resultRow}
                      onPress={() =>
                        handleLogResult({
                          name: f.name,
                          brand: f.brand,
                          portion: f.portion,
                          calories: f.calories,
                          protein: f.protein,
                          carbs: f.carbs,
                          fat: f.fat,
                          source: 'curated',
                        })
                      }
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodName}>{f.name}</Text>
                        <Text style={styles.foodDetail}>
                          {f.brand} · {f.portion}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.foodCalories}>{f.calories} kcal</Text>
                        <Text style={styles.foodMacroLine}>
                          P{f.protein} C{f.carbs} F{f.fat}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {modalTab === 'text' && (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 410 }}>
                <Text style={styles.nlHint}>
                  Type or tap your keyboard mic to log multiple foods at once:
                </Text>
                <TextInput
                  style={styles.nlInput}
                  placeholder="e.g. 2 eggs, 1 cup egg whites, 2 sourdough toast, 1 banana"
                  placeholderTextColor={colors.muted}
                  value={nlText}
                  onChangeText={setNlText}
                  multiline
                />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.parseBtn, { flex: 1 }]}
                    onPress={() => handleParseNlFood(false)}
                    disabled={parsingText}
                  >
                    <Text style={styles.parseBtnText}>
                      {parsingText ? 'PARSING...' : 'PARSE ITEMS'}
                    </Text>
                  </TouchableOpacity>
                  {isPremium && (
                    <TouchableOpacity
                      style={[styles.parseBtn, { backgroundColor: colors.gold }]}
                      onPress={() => handleParseNlFood(true)}
                      disabled={parsingText}
                    >
                      <Sparkles size={14} color={colors.black} />
                    </TouchableOpacity>
                  )}
                </View>

                {parsedItems.length > 0 && (
                  <>
                    {parsedItems.map((item, idx) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.resultRow}
                        onPress={() =>
                          setParsedItems((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, selected: !p.selected } : p
                            )
                          )
                        }
                      >
                        <View
                          style={[
                            styles.parseCheck,
                            item.selected && styles.parseCheckOn,
                          ]}
                        >
                          {item.selected && <Check size={12} color={colors.black} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodName}>{item.name}</Text>
                          <Text style={styles.foodDetail}>
                            {item.portion} · {item.confidence}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.foodCalories}>{item.calories} kcal</Text>
                          <Text style={styles.foodMacroLine}>
                            P{item.protein} C{item.carbs} F{item.fat}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.customSaveBtn}
                      onPress={handleLogParsedItems}
                    >
                      <Text style={styles.customSaveText}>LOG SELECTED ITEMS</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}

            {modalTab === 'photo' && (
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.nlHint}>
                  Snap or upload a plate photo for instant AI calorie, macro, and GLP-1 tolerance
                  scoring.
                </Text>
                {!isPro ? (
                  <TouchableOpacity
                    style={[styles.customSaveBtn, { backgroundColor: colors.gold }]}
                    onPress={() => {
                      setModalVisible(false);
                      router.push('/upgrade?tier=pro' as any);
                    }}
                  >
                    <Text style={styles.customSaveText}>UNLOCK PHOTO SCAN (VIKING PRO)</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.customSaveBtn, { backgroundColor: colors.gold }]}
                      disabled={photoScanning}
                      onPress={() => {
                        if (Platform.OS !== 'web' || typeof document === 'undefined') {
                          showAlert(
                            'Plate Photo Scan',
                            'Use the web app to upload a plate photo, or use Text/Mic & Barcode scan on mobile.'
                          );
                          return;
                        }
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/jpeg,image/png,image/webp';
                        input.onchange = () => {
                          const file = input.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async () => {
                            try {
                              setPhotoScanning(true);
                              const dataUrl = String(reader.result ?? '');
                              const base64 = dataUrl.split(',')[1] ?? '';
                              const mediaType =
                                file.type === 'image/png' || file.type === 'image/webp'
                                  ? file.type
                                  : 'image/jpeg';
                              const scan = await analyzeMealPhoto(base64, mediaType);
                              setPhotoScanResult(scan);
                            } catch (e: any) {
                              showAlert('Photo Scan', e?.message ?? 'Could not analyze photo.');
                            } finally {
                              setPhotoScanning(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        };
                        input.click();
                      }}
                    >
                      {photoScanning ? (
                        <ActivityIndicator size="small" color={colors.black} />
                      ) : (
                        <Text style={styles.customSaveText}>UPLOAD PLATE PHOTO</Text>
                      )}
                    </TouchableOpacity>
                    {photoScanResult && (
                      <View style={[styles.resultRow, { marginTop: 12, flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
                        <Text style={styles.foodName}>{photoScanResult.meal_name}</Text>
                        <Text style={styles.foodDetail}>
                          {photoScanResult.portion} · GLP-1 Tolerance {photoScanResult.glp1_tolerance_score}/10
                        </Text>
                        <Text style={styles.foodMacroLine}>
                          {photoScanResult.calories} kcal · P{photoScanResult.protein_g}g C
                          {photoScanResult.carbs_g}g F{photoScanResult.fat_g}g
                        </Text>
                        <Text style={styles.foodDetail}>{photoScanResult.glp1_note}</Text>
                        <TouchableOpacity
                          style={styles.customSaveBtn}
                          onPress={() => {
                            handleLogResult({
                              name: photoScanResult.meal_name,
                              portion: photoScanResult.portion,
                              calories: photoScanResult.calories,
                              protein: photoScanResult.protein_g,
                              carbs: photoScanResult.carbs_g,
                              fat: photoScanResult.fat_g,
                              source: 'custom',
                            });
                            setPhotoScanResult(null);
                          }}
                        >
                          <Text style={styles.customSaveText}>LOG SCANNED MEAL</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            )}

            {modalTab === 'search' && (
              <>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Search food (e.g. chicken, Greek yogurt)"
                    placeholderTextColor={colors.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleRunSearch}
                    returnKeyType="search"
                  />
                  <TouchableOpacity style={styles.goBtn} onPress={handleRunSearch}>
                    <Search size={16} color={colors.black} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.searchRow, { marginTop: 8 }]}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Or enter UPC barcode digits"
                    placeholderTextColor={colors.muted}
                    value={barcodeQuery}
                    onChangeText={setBarcodeQuery}
                    keyboardType="number-pad"
                    onSubmitEditing={handleBarcodeLookup}
                  />
                  <TouchableOpacity
                    style={[styles.goBtn, { backgroundColor: colors.gold }]}
                    onPress={handleBarcodeLookup}
                  >
                    <Barcode size={16} color={colors.black} />
                  </TouchableOpacity>
                </View>

                {searching ? (
                  <ActivityIndicator color={colors.blue} style={{ marginVertical: 20 }} />
                ) : (
                  <ScrollView style={{ maxHeight: 310, marginTop: 10 }}>
                    {searchResults.length === 0 ? (
                      <Text style={styles.emptySearchText}>
                        Search Open Food Facts + curated staples, or enter a product barcode above.
                      </Text>
                    ) : (
                      searchResults.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.resultRow}
                          onPress={() => handleLogResult(item)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.foodName}>{item.name}</Text>
                            <Text style={styles.foodDetail}>
                              {item.brand} · {item.portion}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.foodCalories}>{item.calories} kcal</Text>
                            <Text style={styles.foodMacroLine}>
                              P{item.protein} C{item.carbs} F{item.fat}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                )}
              </>
            )}

            {modalTab === 'custom' && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput
                  style={styles.customInput}
                  placeholder="Food name (e.g. Protein Smoothie)"
                  placeholderTextColor={colors.muted}
                  value={customName}
                  onChangeText={setCustomName}
                />
                <TextInput
                  style={styles.customInput}
                  placeholder="Portion (e.g. 1 bowl)"
                  placeholderTextColor={colors.muted}
                  value={customPortion}
                  onChangeText={setCustomPortion}
                />
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={[styles.customInput, { flex: 1 }]}
                    placeholder="Calories"
                    placeholderTextColor={colors.muted}
                    value={customCal}
                    onChangeText={setCustomCal}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.customInput, { flex: 1 }]}
                    placeholder="Protein (g)"
                    placeholderTextColor={colors.muted}
                    value={customPro}
                    onChangeText={setCustomPro}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={[styles.customInput, { flex: 1 }]}
                    placeholder="Carbs (g)"
                    placeholderTextColor={colors.muted}
                    value={customCarb}
                    onChangeText={setCustomCarb}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.customInput, { flex: 1 }]}
                    placeholder="Fat (g)"
                    placeholderTextColor={colors.muted}
                    value={customFat}
                    onChangeText={setCustomFat}
                    keyboardType="decimal-pad"
                  />
                </View>
                <TouchableOpacity style={styles.customSaveBtn} onPress={handleAddCustom}>
                  <Text style={styles.customSaveText}>ADD TO DIARY</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Salvage My Day Modal */}
      <Modal
        visible={salvageModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSalvageModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SALVAGE MY DAY</Text>
              <TouchableOpacity onPress={() => setSalvageModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.nlHint}>
              Remaining today: {Math.max(0, calTarget - dayTotals.calories)} kcal ·{' '}
              {Math.max(0, Math.round(proteinTarget - dayTotals.protein))}g protein ·{' '}
              {salvageSource === 'ai' ? 'AI Rebalanced' : 'Tactical Rations'}
            </Text>

            {salvaging ? (
              <ActivityIndicator color={colors.gold} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {salvageOptions.map((opt) => (
                  <Card key={opt.id} style={styles.salvageCard}>
                    <View style={styles.salvageTop}>
                      <Text style={styles.salvageCat}>{opt.category.toUpperCase()}</Text>
                      <Text style={styles.salvageCal}>{opt.calories} kcal</Text>
                    </View>
                    <Text style={styles.salvageTitle}>{opt.title}</Text>
                    <Text style={styles.salvageItems}>{opt.items.join(' · ')}</Text>
                    <Text style={styles.salvageMacros}>
                      P:{opt.protein}g · C:{opt.carbs}g · F:{opt.fat}g
                    </Text>
                    <Text style={styles.salvageNote}>{opt.note}</Text>
                    <TouchableOpacity
                      style={styles.salvageLogBtn}
                      onPress={() => {
                        const slot = diarySlots.some((s) => s.id === 'dinner')
                          ? 'dinner'
                          : diarySlots[diarySlots.length - 1]?.id ?? 'snacks';
                        addFoodLog(profile?.id, {
                          logDate: todayKey,
                          mealSlot: slot,
                          name: opt.title,
                          brand: opt.category,
                          portion: opt.items.join(' + '),
                          calories: opt.calories,
                          protein: opt.protein,
                          carbs: opt.carbs,
                          fat: opt.fat,
                          source: 'salvage_day',
                        });
                        setSalvageModalOpen(false);
                        setActiveTab('diary');
                        setExpandedMeal(slot);
                      }}
                    >
                      <Plus size={14} color={colors.black} />
                      <Text style={styles.salvageLogText}>LOG RESCUE MEAL</Text>
                    </TouchableOpacity>
                  </Card>
                ))}

                <TouchableOpacity
                  style={styles.aiRefreshBtn}
                  onPress={() => {
                    if (!isPremium) {
                      setSalvageModalOpen(false);
                      router.push('/upgrade');
                      return;
                    }
                    handleOpenSalvage(true);
                  }}
                >
                  <Sparkles size={14} color={colors.gold} />
                  <Text style={styles.aiRefreshText}>
                    {isPremium ? 'GENERATE CUSTOM AI SALVAGE' : 'UNLOCK AI SALVAGE REBALANCER'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 40, color: colors.white, letterSpacing: 2, lineHeight: 40 },
  headerSub: { fontFamily: fonts.headingLight, fontSize: 13, letterSpacing: 3 },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
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
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm - 4 },
  tabActive: { backgroundColor: colors.black },
  tabText: { fontFamily: fonts.heading, fontSize: 12, color: colors.muted, letterSpacing: 1 },
  tabTextActive: { color: colors.frost },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  glp1Card: {
    backgroundColor: 'rgba(171, 71, 188, 0.09)',
    borderWidth: 1.5,
    borderColor: 'rgba(171, 71, 188, 0.4)',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 14,
  },
  glp1Header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  glp1Title: { fontFamily: fonts.heading, fontSize: 12, color: '#E1BEE7', letterSpacing: 1.5 },
  glp1Note: { fontFamily: fonts.body, fontSize: 12, color: colors.frost, lineHeight: 17, marginBottom: 10 },
  glp1BottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  glp1StatChip: { fontFamily: fonts.heading, fontSize: 12, color: colors.gold },
  electroToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(75,163,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(75,163,255,0.35)',
  },
  electroToggleOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  electroToggleText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.blue },

  summaryCard: { marginBottom: 16 },
  refuelBanner: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(214,167,86,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.35)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  refuelBannerText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.gold },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  summaryLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.muted, letterSpacing: 2, marginBottom: 6 },
  calRow: { flexDirection: 'row', alignItems: 'flex-end' },
  calConsumed: { fontFamily: fonts.display, fontSize: 42, color: colors.white, lineHeight: 42 },
  calSep: { fontFamily: fonts.body, fontSize: 22, color: colors.muted, lineHeight: 38 },
  calGoal: { fontFamily: fonts.heading, fontSize: 20, color: colors.muted, lineHeight: 38 },
  calUnit: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginLeft: 4, marginBottom: 4 },
  remainBox: { alignItems: 'flex-end' },
  remainValue: { fontFamily: fonts.display, fontSize: 28, color: colors.blue, lineHeight: 28 },
  remainLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  macroStrip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  macroCol: { flex: 1, paddingHorizontal: 6, alignItems: 'center' },
  macroColBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  macroConsumed: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 22 },
  macroTotal: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  macroLabelSmall: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2, textAlign: 'center' },

  diaryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  salvageLink: { fontFamily: fonts.heading, fontSize: 11, color: colors.blue, letterSpacing: 0.5 },
  quickAddLink: { fontFamily: fonts.heading, fontSize: 11, color: colors.gold, letterSpacing: 0.5 },
  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, letterSpacing: 2, marginBottom: 10 },

  planDescWrap: { marginBottom: 22, paddingHorizontal: 4 },
  planDescName: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 2, marginBottom: 2 },
  planDescTagline: { fontFamily: fonts.display, fontSize: 26, color: colors.frost, lineHeight: 28, marginBottom: 8 },
  planDescText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 20, marginBottom: 12 },
  planMacroChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  planMacroChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, backgroundColor: colors.surface },
  planMacroChipText: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  timelineWrap: { marginBottom: 24 },
  timelineRow: { flexDirection: 'row', gap: 12 },
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
  mealTimeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  mealTimeLeft: {},
  mealTimeLabel: { fontFamily: fonts.heading, fontSize: 14, color: colors.frost },
  mealTimeClock: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 1 },
  mealTimeRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTimeEmoji: { fontSize: 18 },
  mealTimeCalories: { fontFamily: fonts.heading, fontSize: 14, color: colors.frost },
  mealTimeDetail: { paddingHorizontal: 14, paddingBottom: 14 },
  mealTimeDivider: { height: 1, marginBottom: 12 },
  mealTimeName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.frost, marginBottom: 2 },
  mealTimePortion: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 12 },
  mealTimeMacros: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  macroChip: { alignItems: 'center' },
  macroChipVal: { fontFamily: fonts.heading, fontSize: 15 },
  macroChipLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 1 },
  logPlannedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 8 },
  logPlannedBtnText: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 1 },

  guideWrap: { gap: 12, marginBottom: 24 },
  guideCard: { padding: 16 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  guideTitle: { fontFamily: fonts.heading, fontSize: 11, color: colors.muted, letterSpacing: 2 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, backgroundColor: colors.surfaceLight },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  avoidToggle: { alignSelf: 'flex-start', paddingVertical: 4 },
  avoidToggleText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textDecorationLine: 'underline' },
  avoidCard: { padding: 16, gap: 8 },
  avoidRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avoidX: { fontFamily: fonts.heading, fontSize: 13, color: colors.red },
  avoidText: { fontFamily: fonts.body, fontSize: 13, color: colors.frost, flex: 1 },
  tipsCard: { padding: 16, gap: 10 },
  tipRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tipNum: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 20, minWidth: 16 },
  tipText: { fontFamily: fonts.body, fontSize: 13, color: colors.frost, flex: 1, lineHeight: 19 },

  mealCard: { padding: 0, overflow: 'hidden', marginBottom: 12 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  mealHeaderLeft: { flex: 1 },
  mealName: { fontFamily: fonts.heading, fontSize: 16, color: colors.frost },
  mealCalories: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addFoodBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(75,163,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75,163,255,0.3)',
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  innerDivider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  foodInfo: { flex: 1 },
  foodName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  foodDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  foodMacros: { alignItems: 'flex-end' },
  foodCalories: { fontFamily: fonts.heading, fontSize: 15, color: colors.blue },
  foodMacroLine: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  logFoodBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  logFoodText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.frost, letterSpacing: 1 },
  modalTabRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  modalTabBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.surfaceLight, alignItems: 'center' },
  modalTabBtnActive: { backgroundColor: colors.blue },
  modalTabText: { fontFamily: fonts.heading, fontSize: 11, color: colors.muted },
  filterPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  filterPillOn: { borderColor: '#AB47BC', backgroundColor: 'rgba(171,71,188,0.14)' },
  filterPillText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  nlHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 10 },
  nlInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.frost,
    fontFamily: fonts.body,
    fontSize: 14,
    padding: 12,
    minHeight: 74,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  parseBtn: { backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  parseBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 1 },
  parseCheck: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  parseCheckOn: { backgroundColor: colors.gold, borderColor: colors.gold },

  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  modalInput: { flex: 1, backgroundColor: colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.frost, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 12, paddingVertical: 10 },
  goBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  emptySearchText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  customInput: { backgroundColor: colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.frost, fontFamily: fonts.body, fontSize: 14, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 },
  macroInputRow: { flexDirection: 'row', gap: 10 },
  customSaveBtn: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 14 },
  customSaveText: { fontFamily: fonts.heading, fontSize: 14, color: colors.black, letterSpacing: 1 },

  salvageCard: { marginBottom: 12, padding: 14 },
  salvageTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  salvageCat: { fontFamily: fonts.heading, fontSize: 10, color: colors.blue, letterSpacing: 1.5 },
  salvageCal: { fontFamily: fonts.heading, fontSize: 14, color: colors.gold },
  salvageTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.frost },
  salvageItems: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 3 },
  salvageMacros: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.frost, marginTop: 6 },
  salvageNote: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
  salvageLogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.gold, borderRadius: 8, paddingVertical: 9, marginTop: 10 },
  salvageLogText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 0.5 },
  aiRefreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, paddingVertical: 11, marginBottom: 14 },
  aiRefreshText: { fontFamily: fonts.heading, fontSize: 12, color: colors.gold },
});
