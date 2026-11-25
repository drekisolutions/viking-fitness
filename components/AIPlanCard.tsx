import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Lock, RefreshCw } from 'lucide-react-native';
import { useUserStore, hasPremiumAccess } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import { useTrackerStore } from '@/store/tracker';
import { calculateTDEE } from '@/constants/calculations';
import { getShotWavePhase } from '@/constants/glp1';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import {
  generatePlan,
  getLatestPlan,
  type PlanType,
  type MealPlan,
  type WorkoutPlan,
  type PlanContent,
  type Glp1AiContext,
} from '@/lib/ai';

const COPY: Record<PlanType, { title: string; blurb: string; cta: string; verb: string }> = {
  meal: {
    title: 'AI MEAL PLAN',
    blurb: 'A full day of eating tuned to your macro targets & GLP-1 Shot Wave.',
    cta: 'Generate meal plan',
    verb: 'Forging your rations',
  },
  workout: {
    title: 'AI WORKOUT',
    blurb: 'A strength session adapted for your goal & GLP-1 Muscle Armor phase.',
    cta: 'Generate workout',
    verb: 'Forging your session',
  },
};

export function AIPlanCard({ type }: { type: PlanType }) {
  const router = useRouter();
  const isPremium = useUserStore((s) => hasPremiumAccess(s.profile?.plan));
  const onboarding = useOnboardingStore();
  const glp1Profile = useTrackerStore((s) => s.glp1Profile);
  const glp1Shots = useTrackerStore((s) => s.glp1Shots);
  const copy = COPY[type];

  const [plan, setPlan] = useState<PlanContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    let active = true;
    getLatestPlan(type)
      .then((p) => { if (active) setPlan(p); })
      .finally(() => { if (active) setLoadedOnce(true); });
    return () => { active = false; };
  }, [isPremium, type]);

  const buildGlp1Context = (): Glp1AiContext | undefined => {
    if (!glp1Profile.enabled) return undefined;
    const heightIn = onboarding.heightFt * 12 + onboarding.heightIn;
    const tdee = calculateTDEE(
      onboarding.weightLbs || 180,
      heightIn || 70,
      onboarding.age || 30,
      onboarding.sex || 'male',
      onboarding.activityLevel || 1.375
    );
    const wave = getShotWavePhase(
      glp1Profile,
      glp1Shots,
      onboarding.calories,
      onboarding.protein,
      tdee
    );
    return {
      phase: wave.label,
      medication: glp1Profile.medication,
      doseMg: glp1Profile.currentDoseMg,
      proteinFloorG: wave.proteinFloorG,
      adaptedCalories: wave.adaptedCalories,
      trainingNote: wave.trainingNote,
    };
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generatePlan(type, buildGlp1Context());
      if (result.plan) setPlan(result.plan);
      else Alert.alert('Generation failed', result.error ?? 'Please try again.');
    } catch {
      Alert.alert('Something went wrong', 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  // ── Locked (free / guest) ──────────────────────────────────────────────
  if (!isPremium) {
    return (
      <Card glowColor="gold" style={[styles.card, styles.lockedCard]}>
        <View style={styles.headerRow}>
          <Sparkles size={16} color={colors.gold} />
          <Text style={styles.title}>{copy.title}</Text>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        </View>
        <Text style={styles.blurb}>{copy.blurb}</Text>
        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={() => router.push('/upgrade')}
          activeOpacity={0.85}
        >
          <Lock size={14} color={colors.black} />
          <Text style={styles.unlockBtnText}>UNLOCK WITH PREMIUM</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  // ── Premium ────────────────────────────────────────────────────────────
  return (
    <Card glowColor="gold" style={styles.card}>
      <View style={styles.headerRow}>
        <Sparkles size={16} color={colors.gold} />
        <Text style={styles.title}>{copy.title}</Text>
        {plan && !loading && (
          <TouchableOpacity onPress={handleGenerate} style={styles.regenBtn} hitSlop={8}>
            <RefreshCw size={15} color={colors.blue} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.loadingText}>{copy.verb}…</Text>
        </View>
      ) : plan ? (
        type === 'meal'
          ? <MealPlanView plan={plan as MealPlan} />
          : <WorkoutPlanView plan={plan as WorkoutPlan} />
      ) : (
        <>
          <Text style={styles.blurb}>{loadedOnce ? copy.blurb : 'Loading…'}</Text>
          <TouchableOpacity style={styles.genBtn} onPress={handleGenerate} activeOpacity={0.85}>
            <Sparkles size={14} color={colors.black} />
            <Text style={styles.genBtnText}>{copy.cta.toUpperCase()}</Text>
          </TouchableOpacity>
        </>
      )}
    </Card>
  );
}

function MealPlanView({ plan }: { plan: MealPlan }) {
  return (
    <View>
      <Text style={styles.planTitle}>{plan.title}</Text>
      <Text style={styles.planMeta}>{plan.total_calories} kcal · {plan.meals.length} meals</Text>
      {plan.meals.map((m, i) => (
        <View key={`${m.name}-${i}`} style={styles.row}>
          <Text style={styles.rowTitle}>{m.time} · {m.name}</Text>
          <Text style={styles.rowMeta}>
            {m.calories} kcal · {m.protein_g}p / {m.carbs_g}c / {m.fat_g}f
          </Text>
          {m.items.length > 0 && <Text style={styles.rowBody}>{m.items.join(' · ')}</Text>}
        </View>
      ))}
      <TipList tips={plan.tips} />
    </View>
  );
}

function WorkoutPlanView({ plan }: { plan: WorkoutPlan }) {
  return (
    <View>
      <Text style={styles.planTitle}>{plan.title}</Text>
      <Text style={styles.planMeta}>{plan.focus} · {plan.duration_min} min</Text>
      {plan.warmup.length > 0 && (
        <Text style={styles.subLine}><Text style={styles.subLabel}>Warmup: </Text>{plan.warmup.join(', ')}</Text>
      )}
      {plan.exercises.map((ex, i) => (
        <View key={`${ex.name}-${i}`} style={styles.row}>
          <Text style={styles.rowTitle}>{i + 1}. {ex.name}</Text>
          <Text style={styles.rowMeta}>{ex.sets} × {ex.reps}</Text>
          {!!ex.notes && <Text style={styles.rowBody}>{ex.notes}</Text>}
        </View>
      ))}
      {plan.cooldown.length > 0 && (
        <Text style={styles.subLine}><Text style={styles.subLabel}>Cooldown: </Text>{plan.cooldown.join(', ')}</Text>
      )}
      <TipList tips={plan.tips} />
    </View>
  );
}

function TipList({ tips }: { tips: string[] }) {
  if (!tips?.length) return null;
  return (
    <View style={styles.tips}>
      {tips.map((t, i) => (
        <Text key={i} style={styles.tip}>⚔ {t}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, borderColor: 'rgba(214,167,86,0.35)' },
  lockedCard: {},
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.gold,
    letterSpacing: 1.5,
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: 'rgba(214,167,86,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.4)',
  },
  premiumBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.gold,
    letterSpacing: 1,
  },
  regenBtn: { padding: 4 },
  blurb: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: 10,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 12,
    marginTop: 14,
  },
  unlockBtnText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.black,
    letterSpacing: 1,
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 12,
    marginTop: 14,
  },
  genBtnText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.black,
    letterSpacing: 1,
  },
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  loadingText: {
    fontFamily: fonts.headingLight,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 1,
  },
  planTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.frost,
    marginTop: 12,
  },
  planMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.gold,
    marginTop: 2,
    marginBottom: 8,
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 8,
  },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.blue, marginTop: 2 },
  rowBody: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 18 },
  subLine: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 18 },
  subLabel: { fontFamily: fonts.bodyMedium, color: colors.frost },
  tips: { marginTop: 12, gap: 4 },
  tip: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 18 },
});
