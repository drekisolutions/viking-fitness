import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { useTrackerStore } from '@/store/tracker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';

const GOALS = [
  { key: 'cut', emoji: '🔥', title: 'BURN THE FAT', desc: 'Caloric deficit — lose weight' },
  { key: 'build', emoji: '⚔️', title: 'BUILD THE WARRIOR', desc: 'Caloric surplus — gain muscle' },
  { key: 'recomp', emoji: '⚡', title: 'BODY RECOMPOSITION', desc: 'Lose fat and gain muscle simultaneously' },
  { key: 'maintain', emoji: '🛡️', title: 'HOLD THE LINE', desc: 'Maintain current weight and performance' },
];

const MEAL_PLANS = [
  { key: 'balanced',      name: 'Balanced',      split: '30-40-30', badge: null },
  { key: 'high-protein',  name: 'High Protein',  split: '40-35-25', badge: null },
  { key: 'keto',          name: 'Keto',          split: '30-5-65',  badge: null },
  { key: 'mediterranean', name: 'Mediterranean', split: '20-45-35', badge: null },
  { key: 'carnivore',     name: 'Carnivore',     split: '45-0-55',  badge: null },
  { key: 'vegan',         name: 'Vegan',         split: '20-55-25', badge: null },
  { key: 'glp1',          name: 'GLP-1',         split: '42-28-30', badge: '💊' },
];

export default function GoalScreen() {
  const router = useRouter();
  const { goal, mealPlan, setField } = useOnboardingStore();

  const [localGoal, setLocalGoal] = useState(goal || 'cut');
  const [localPlan, setLocalPlan] = useState(mealPlan || 'high-protein');

  const handleContinue = () => {
    setField('goal', localGoal);
    setField('mealPlan', localPlan);
    if (localPlan === 'glp1') {
      useTrackerStore.getState().setGlp1Config(undefined, { enabled: true });
    }
    router.push('/onboarding/results');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.black} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={24} color={colors.blue} />
        </TouchableOpacity>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, i === 2 && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>CHOOSE YOUR</Text>
        <Text style={styles.title}>QUEST</Text>

        {/* Goals */}
        <View style={styles.goalsSection}>
          {GOALS.map((g) => {
            const isActive = localGoal === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.goalCard, isActive && styles.goalCardActive]}
                onPress={() => setLocalGoal(g.key)}
                activeOpacity={0.8}
              >
                <View style={styles.goalEmoji}>
                  <Text style={styles.goalEmojiText}>{g.emoji}</Text>
                </View>
                <View style={styles.goalTextWrap}>
                  <Text style={[styles.goalTitle, isActive && styles.goalTitleActive]}>
                    {g.title}
                  </Text>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </View>
                {isActive && (
                  <View style={styles.checkCircle}>
                    <Check size={14} color={colors.black} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Meal Plan Card */}
        <Card style={styles.mealCard}>
          <Text style={styles.mealCardLabel}>YOUR WAR RATIONS</Text>
          <Text style={styles.mealCardSub}>Choose your nutritional approach</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.plansScroll}
            style={{ marginTop: 14 }}
          >
            {MEAL_PLANS.map((p) => {
              const isActive = localPlan === p.key;
              const isGlp1 = p.key === 'glp1';
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.planChip,
                    isActive && styles.planChipActive,
                    isGlp1 && styles.planChipGlp1,
                    isActive && isGlp1 && styles.planChipGlp1Active,
                  ]}
                  onPress={() => setLocalPlan(p.key)}
                  activeOpacity={0.8}
                >
                  {p.badge ? (
                    <Text style={styles.planBadge}>{p.badge}</Text>
                  ) : (
                    <Text style={styles.planSplit}>{p.split}</Text>
                  )}
                  <Text style={[
                    styles.planName,
                    isActive && styles.planNameActive,
                    isActive && isGlp1 && styles.planNameGlp1Active,
                  ]}>
                    {p.name}
                  </Text>
                  {isGlp1 && <Text style={styles.planSubLabel}>P-C-F</Text>}
                  {!isGlp1 && <Text style={styles.planSplitLabel}>P-C-F</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="CONTINUE"
          onPress={handleContinue}
          variant="primary"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  eyebrow: {
    fontFamily: fonts.headingLight,
    fontSize: 18,
    color: colors.muted,
    letterSpacing: 2,
    marginTop: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.frost,
    lineHeight: 50,
    marginTop: 2,
    marginBottom: 20,
  },
  goalsSection: { gap: 10 },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    gap: 14,
  },
  goalCardActive: {
    borderWidth: 1.5,
    borderColor: colors.blue,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  goalEmoji: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalEmojiText: { fontSize: 22 },
  goalTextWrap: { flex: 1 },
  goalTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.frost,
    letterSpacing: 0.5,
  },
  goalTitleActive: { color: colors.blue },
  goalDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCard: {
    marginTop: 20,
    padding: 16,
    paddingBottom: 20,
  },
  mealCardLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
  },
  mealCardSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  plansScroll: {
    gap: 10,
    paddingRight: 4,
  },
  planChip: {
    width: 110,
    height: 80,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  planChipActive: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  planChipGlp1: {
    borderColor: '#AB47BC',
    borderWidth: 1,
  },
  planChipGlp1Active: {
    borderColor: '#AB47BC',
    shadowColor: '#AB47BC',
    shadowOpacity: 0.3,
  },
  planBadge: {
    fontSize: 20,
    marginBottom: 2,
  },
  planSplit: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  planSplitLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.muted,
    opacity: 0,  // invisible spacer to match GLP-1 height
  },
  planSubLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.muted,
  },
  planName: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.frost,
    textAlign: 'center',
  },
  planNameActive: { color: colors.gold },
  planNameGlp1Active: { color: '#AB47BC' },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
});
