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
import { Plus, Search, ChevronRight } from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts, radius } from '@/constants/theme';

const FOOD_LOG = [
  { id: '1', name: 'Greek Yogurt', brand: 'Chobani', calories: 120, protein: 17, carbs: 8, fat: 2, qty: '1 cup' },
  { id: '2', name: 'Oatmeal', brand: 'Quaker', calories: 150, protein: 5, carbs: 27, fat: 3, qty: '1/2 cup dry' },
  { id: '3', name: 'Banana', brand: 'Fresh', calories: 105, protein: 1, carbs: 27, fat: 0, qty: '1 medium' },
  { id: '4', name: 'Whey Protein', brand: 'Optimum Nutrition', calories: 120, protein: 24, carbs: 3, fat: 1, qty: '1 scoop' },
];

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', target: 600, consumed: 480, foods: FOOD_LOG },
  { id: 'lunch', label: 'Lunch', target: 700, consumed: 0, foods: [] },
  { id: 'dinner', label: 'Dinner', target: 800, consumed: 0, foods: [] },
  { id: 'snacks', label: 'Snacks', target: 300, consumed: 0, foods: [] },
];

export default function NutritionScreen() {
  const { calories, protein, carbs, fat, mealPlan } = useOnboardingStore();
  const [expandedMeal, setExpandedMeal] = useState<string | null>('breakfast');

  const totalConsumed = MEALS.reduce((sum, m) => sum + m.consumed, 0);
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
            <Text style={styles.headerSub}>{mealPlan.replace('-', ' ').toUpperCase()} PLAN</Text>
          </View>
          <TouchableOpacity style={styles.searchBtn}>
            <Search size={20} color={colors.frost} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card glowColor="blue" style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>CALORIES TODAY</Text>
              <View style={styles.calRow}>
                <Text style={styles.calConsumed}>{totalConsumed}</Text>
                <Text style={styles.calSep}> / </Text>
                <Text style={styles.calGoal}>{calories > 0 ? calories : '—'}</Text>
                <Text style={styles.calUnit}>kcal</Text>
              </View>
            </View>
            <View style={styles.remainBox}>
              <Text style={styles.remainValue}>{Math.max(calories - totalConsumed, 0)}</Text>
              <Text style={styles.remainLabel}>remaining</Text>
            </View>
          </View>
          <ProgressBar
            value={calories > 0 ? totalConsumed / calories : 0}
            color={colors.blue}
            height={6}
            style={{ marginBottom: 16 }}
          />
          <View style={styles.macroStrip}>
            {[
              { label: 'Protein', consumed: consumedProtein, total: protein, color: colors.blue },
              { label: 'Carbs', consumed: consumedCarbs, total: carbs, color: colors.gold },
              { label: 'Fat', consumed: consumedFat, total: fat, color: '#E57373' },
            ].map((m, idx) => (
              <View
                key={m.label}
                style={[
                  styles.macroCol,
                  idx < 2 && styles.macroColBorder,
                ]}
              >
                <Text style={[styles.macroConsumed, { color: m.color }]}>{m.consumed}g</Text>
                <Text style={styles.macroTotal}>/ {m.total > 0 ? `${m.total}g` : '—'}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
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

        <Text style={styles.sectionTitle}>FOOD DIARY</Text>
        {MEALS.map((meal) => (
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
                        <Text style={styles.foodDetail}>
                          {food.brand} · {food.qty}
                        </Text>
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

        <View style={{ height: 24 }} />
      </ScrollView>
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
    paddingBottom: 16,
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
    color: colors.muted,
    letterSpacing: 3,
  },
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  summaryCard: { marginBottom: 24 },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  calConsumed: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.white,
    lineHeight: 42,
  },
  calSep: { fontFamily: fonts.body, fontSize: 22, color: colors.muted, lineHeight: 38 },
  calGoal: { fontFamily: fonts.heading, fontSize: 20, color: colors.muted, lineHeight: 38 },
  calUnit: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginLeft: 4, marginBottom: 4 },
  remainBox: { alignItems: 'flex-end' },
  remainValue: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.blue,
    lineHeight: 28,
  },
  remainLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  macroStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  macroCol: { flex: 1, paddingHorizontal: 8, alignItems: 'center' },
  macroColBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  macroConsumed: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 22,
  },
  macroTotal: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  macroLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  sectionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },
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
  innerDivider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
  foodList: {},
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  foodInfo: { flex: 1 },
  foodName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  foodDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  foodMacros: { alignItems: 'flex-end' },
  foodCalories: { fontFamily: fonts.heading, fontSize: 15, color: colors.blue },
  foodMacroLine: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  emptyMeal: {},
  logFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logFoodText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
