import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Target,
  Utensils,
  Shield,
  LogOut,
  Trash2,
  Crown,
  RotateCcw,
  Syringe,
  Swords,
  X,
} from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import { useTrackerStore } from '@/store/tracker';
import { supabase } from '@/lib/supabase';
import { restorePremium } from '@/lib/upgrade';
import { showAlert, showConfirm } from '@/lib/confirm';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import { PLAN_KEYS, MEAL_PLANS } from '@/constants/mealPlans';
import {
  calculateBMI,
  calculateTDEE,
  getCalorieTarget,
  adjustCaloriesForPlan,
  getMacros,
  computeWarriorRank,
} from '@/constants/calculations';

const GOAL_OPTIONS = [
  { key: 'cut', label: 'Burn Fat (Cut)' },
  { key: 'build', label: 'Build Muscle' },
  { key: 'recomp', label: 'Body Recomp' },
  { key: 'maintain', label: 'Maintain' },
];

const ACTIVITY_OPTIONS = [
  { label: 'Sedentary', multiplier: 1.2 },
  { label: 'Lightly Active', multiplier: 1.375 },
  { label: 'Moderately Active', multiplier: 1.55 },
  { label: 'Very Active', multiplier: 1.725 },
];

export default function ProfileScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const { profile, updateProfile, clearProfile } = useUserStore();
  const {
    workoutSessions,
    foodLogs,
    weightLogs,
    glp1Profile,
    warband,
    setGlp1Config,
    resetTracker,
  } = useTrackerStore();

  const [restoring, setRestoring] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  // Edit targets state
  const [editWeight, setEditWeight] = useState(String(onboarding.weightLbs || 180));
  const [editGoal, setEditGoal] = useState(onboarding.goal || 'build');
  const [editActivity, setEditActivity] = useState(onboarding.activityLevel || 1.375);

  const displayName = onboarding.name || profile?.name || 'Warrior';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'VF';

  const isPremium = profile?.plan === 'premium';

  // Real summary stats
  const daysActive = useMemo(() => {
    const days = new Set<string>();
    for (const f of foodLogs) days.add(f.logDate);
    for (const s of workoutSessions) days.add(s.completedAt.slice(0, 10));
    for (const w of weightLogs) days.add(w.logDate);
    return days.size;
  }, [foodLogs, workoutSessions, weightLogs]);

  const weightChange = useMemo(() => {
    if (weightLogs.length < 2) return '0.0';
    const delta = weightLogs[weightLogs.length - 1].weightLbs - weightLogs[0].weightLbs;
    return delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  }, [weightLogs]);

  const totalVolume = useMemo(
    () => workoutSessions.reduce((sum, s) => sum + (s.totalVolumeLbs || 0), 0),
    [workoutSessions]
  );

  const rankState = useMemo(
    () =>
      computeWarriorRank({
        totalWorkouts: workoutSessions.length,
        proteinShieldDays: daysActive,
        totalVolumeLbs: totalVolume,
      }),
    [workoutSessions.length, daysActive, totalVolume]
  );

  const persistProfileFields = (
    nextWeight: number,
    nextGoal: string,
    nextPlan: string,
    nextActLevel: number,
    nextActLabel: string
  ) => {
    const heightIn = onboarding.heightFt * 12 + onboarding.heightIn;
    const bmi = Math.round(calculateBMI(nextWeight, heightIn) * 10) / 10;
    const tdee = calculateTDEE(
      nextWeight,
      heightIn,
      onboarding.age || 25,
      onboarding.sex || 'male',
      nextActLevel
    );
    const rawCals = getCalorieTarget(tdee, nextGoal);
    const cals = adjustCaloriesForPlan(rawCals, nextPlan);
    const macros = getMacros(cals, nextPlan);

    onboarding.setField('weightLbs', nextWeight);
    onboarding.setField('goal', nextGoal);
    onboarding.setField('mealPlan', nextPlan);
    onboarding.setField('activityLevel', nextActLevel);
    onboarding.setField('activityLabel', nextActLabel);
    onboarding.setField('bmi', bmi);
    onboarding.setField('calories', cals);
    onboarding.setField('protein', macros.protein);
    onboarding.setField('carbs', macros.carbs);
    onboarding.setField('fat', macros.fat);

    updateProfile({
      weightLbs: nextWeight,
      goal: nextGoal,
      mealPlan: nextPlan,
      bmi,
      calories: cals,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    });

    if (nextPlan === 'glp1' && !glp1Profile.enabled) {
      setGlp1Config(profile?.id, {
        enabled: true,
        proteinFloorG: Math.max(100, macros.protein),
      });
    }

    if (profile?.id && !profile.id.startsWith('guest-')) {
      Promise.resolve(
        supabase
          .from('profiles')
          .update({
            weight_lbs: nextWeight,
            goal: nextGoal,
            meal_plan: nextPlan,
            activity_level: nextActLevel,
            activity_label: nextActLabel,
            bmi,
            calories: cals,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          })
          .eq('id', profile.id)
      ).catch(() => { });
    }
  };

  const handleSaveGoals = () => {
    const w = Number(editWeight);
    if (!Number.isFinite(w) || w < 60 || w > 700) {
      showAlert('Invalid weight', 'Enter a weight between 60 and 700 lbs.');
      return;
    }
    const actObj =
      ACTIVITY_OPTIONS.find((a) => a.multiplier === editActivity) ?? ACTIVITY_OPTIONS[1];
    persistProfileFields(w, editGoal, onboarding.mealPlan, actObj.multiplier, actObj.label);
    setGoalsModalOpen(false);
  };

  const handleRestore = async () => {
    if (!profile) return;
    setRestoring(true);
    try {
      const outcome = await restorePremium(profile.id);
      if (outcome.status === 'purchased') {
        updateProfile({ plan: 'premium' });
        showAlert('Restored', 'Your premium subscription is active again.');
      } else if (outcome.status === 'unavailable' || outcome.status === 'error') {
        showAlert('Restore', outcome.message);
      }
    } catch {
      showAlert('Something went wrong', 'Please try again in a moment.');
    } finally {
      setRestoring(false);
    }
  };

  const handleSignOut = () => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        await supabase.auth.signOut();
        clearProfile();
        onboarding.resetOnboarding();
        resetTracker();
        router.replace('/');
      },
      'Sign Out',
      true
    );
  };

  const handleDeleteAccount = () => {
    showConfirm(
      'Delete Account',
      'This permanently deletes your account and all your fitness data. This cannot be undone.',
      async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) throw error;
            await supabase.auth.signOut();
          }
          clearProfile();
          onboarding.resetOnboarding();
          resetTracker();
          router.replace('/');
        } catch (e: any) {
          showAlert(
            'Deletion failed',
            e.message ?? 'Please try again or contact dreki.solutions@gmail.com.'
          );
        }
      },
      'Delete Forever',
      true
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <View style={styles.rankChip}>
            <Text style={styles.rankChipText}>⚔ {rankState.rank.toUpperCase()}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.crestCircle}>
            <Text style={styles.crestInitials}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName.toUpperCase()}</Text>
          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>
              {onboarding.goal.toUpperCase()} · {onboarding.mealPlan.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Workouts', value: String(workoutSessions.length) },
            { label: 'Days Active', value: String(daysActive) },
            { label: 'lbs Change', value: weightChange },
          ].map((s, idx) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {idx < 2 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {isPremium ? (
          <View style={styles.premiumBadge}>
            <Crown size={16} color={colors.gold} />
            <Text style={styles.premiumBadgeText}>PREMIUM WARRIOR</Text>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/upgrade')}>
            <Card glowColor="gold" style={styles.upgradeCard}>
              <View style={styles.upgradeIcon}>
                <Crown size={20} color={colors.gold} />
              </View>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                <Text style={styles.upgradeSub}>
                  AI meal & workout plans, Battlefield Pivots & Reverse-Diet Off-Ramp
                </Text>
              </View>
              <ChevronRight size={18} color={colors.gold} />
            </Card>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>MY TARGETS</Text>
        <Card glowColor="blue" style={styles.targetsCard}>
          <View style={styles.targetGrid}>
            {[
              { label: 'Calories', value: `${onboarding.calories > 0 ? onboarding.calories.toLocaleString() : '—'}`, unit: 'kcal/day', color: colors.blue },
              { label: 'Protein', value: `${onboarding.protein > 0 ? onboarding.protein : '—'}g`, unit: 'per day', color: colors.blue },
              { label: 'Carbs', value: `${onboarding.carbs > 0 ? onboarding.carbs : '—'}g`, unit: 'per day', color: colors.gold },
              { label: 'Fat', value: `${onboarding.fat > 0 ? onboarding.fat : '—'}g`, unit: 'per day', color: '#E57373' },
              { label: 'BMI', value: `${onboarding.bmi > 0 ? onboarding.bmi : '—'}`, unit: 'body mass', color: '#4CAF50' },
            ].map((t) => (
              <View key={t.label} style={styles.targetItem}>
                <Text style={[styles.targetValue, { color: t.color }]}>{t.value}</Text>
                <Text style={styles.targetLabel}>{t.label}</Text>
                <Text style={styles.targetUnit}>{t.unit}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Text style={styles.sectionTitle}>PROTOCOLS & PREFERENCES</Text>
        <Card style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push('/glp1')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { borderColor: 'rgba(171,71,188,0.35)' }]}>
              <Syringe size={18} color="#AB47BC" />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>GLP-1 Muscle Armor</Text>
              <Text style={styles.settingsSub}>
                {glp1Profile.enabled
                  ? `${glp1Profile.medication} (${glp1Profile.currentDoseMg}mg)`
                  : 'Shot tracker, wave cycling & lean mass shield'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push('/warband')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { borderColor: 'rgba(214,167,86,0.35)' }]}>
              <Swords size={18} color={colors.gold} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Warband & Boss Raids</Text>
              <Text style={styles.settingsSub}>
                {warband
                  ? `${warband.name} (${warband.inviteCode})`
                  : 'Weekly boss raid, Shield Wall Passes & friend squads'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              setEditWeight(String(onboarding.weightLbs || 180));
              setEditGoal(onboarding.goal || 'build');
              setEditActivity(onboarding.activityLevel || 1.375);
              setGoalsModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingsIcon}>
              <Target size={18} color={colors.blue} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Goals & Targets</Text>
              <Text style={styles.settingsSub}>Adjust weight, goal & activity multiplier</Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setPlanModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingsIcon}>
              <Utensils size={18} color={colors.blue} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Nutrition Plan</Text>
              <Text style={styles.settingsSub}>
                Currently: {MEAL_PLANS[onboarding.mealPlan]?.name ?? 'Balanced'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </TouchableOpacity>
        </Card>

        <Text style={styles.sectionTitle}>ACCOUNT & LEGAL</Text>
        <Card style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push('/privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.settingsIcon}>
              <Shield size={18} color={colors.blue} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Privacy & Security</Text>
              <Text style={styles.settingsSub}>Privacy policy, subprocessors & health disclaimer</Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </TouchableOpacity>
        </Card>

        {Platform.OS !== 'web' && !isPremium && (
          <TouchableOpacity
            style={styles.restoreRow}
            onPress={handleRestore}
            activeOpacity={0.7}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <>
                <RotateCcw size={16} color={colors.muted} />
                <Text style={styles.restoreRowText}>Restore purchases</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <LogOut size={18} color={colors.red} />
          <Text style={styles.logoutText}>SIGN OUT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Trash2 size={14} color={colors.muted} />
          <Text style={styles.deleteText}>Delete account & data</Text>
        </TouchableOpacity>

        <View style={styles.versionRow}>
          <Text style={styles.versionText}>VIKING FITNESS v1.0.0</Text>
          <Text style={styles.taglineText}>Forge Your Legacy</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit Goals Modal */}
      <Modal
        visible={goalsModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT GOALS</Text>
              <TouchableOpacity onPress={() => setGoalsModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>CURRENT WEIGHT (LBS)</Text>
            <TextInput
              style={styles.modalInput}
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>GOAL</Text>
            <View style={styles.chipWrap}>
              {GOAL_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.chip, editGoal === g.key && styles.chipActive]}
                  onPress={() => setEditGoal(g.key)}
                >
                  <Text
                    style={[styles.chipText, editGoal === g.key && { color: colors.blue }]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>ACTIVITY LEVEL</Text>
            <View style={styles.chipWrap}>
              {ACTIVITY_OPTIONS.map((a) => (
                <TouchableOpacity
                  key={a.multiplier}
                  style={[styles.chip, editActivity === a.multiplier && styles.chipActive]}
                  onPress={() => setEditActivity(a.multiplier)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      editActivity === a.multiplier && { color: colors.blue },
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoals}>
              <Text style={styles.saveBtnText}>RECALCULATE TARGETS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Nutrition Plan Selector Modal */}
      <Modal
        visible={planModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPlanModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT MEAL PLAN</Text>
              <TouchableOpacity onPress={() => setPlanModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {PLAN_KEYS.map((key) => {
                const p = MEAL_PLANS[key];
                const active = onboarding.mealPlan === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.planOptionRow, active && styles.planOptionRowActive]}
                    onPress={() => {
                      persistProfileFields(
                        onboarding.weightLbs || 180,
                        onboarding.goal || 'build',
                        key,
                        onboarding.activityLevel || 1.375,
                        onboarding.activityLabel || 'Lightly Active'
                      );
                      setPlanModalOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planOptionName, { color: p.accentColor }]}>
                        {p.name}
                      </Text>
                      <Text style={styles.planOptionDesc}>{p.tagline}</Text>
                    </View>
                    <Text style={styles.planOptionSplit}>{p.macroSplit}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  rankChip: {
    backgroundColor: 'rgba(214,167,86,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  rankChipText: { fontFamily: fonts.heading, fontSize: 12, color: colors.gold, letterSpacing: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  profileSection: { alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  crestCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#12151C',
    borderWidth: 3,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  crestInitials: { fontFamily: fonts.display, fontSize: 38, color: colors.gold, letterSpacing: 2 },
  profileName: { fontFamily: fonts.display, fontSize: 36, color: colors.white, letterSpacing: 2, lineHeight: 36, marginBottom: 8 },
  goalBadge: {
    backgroundColor: 'rgba(214, 167, 86, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(214, 167, 86, 0.3)',
  },
  goalBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.gold, letterSpacing: 1.5 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.display, fontSize: 32, color: colors.white, lineHeight: 32 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, letterSpacing: 2, marginBottom: 12 },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(214,167,86,0.3)' },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(214,167,86,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.25)',
  },
  upgradeInfo: { flex: 1 },
  upgradeTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.gold },
  upgradeSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(214,167,86,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.3)',
    borderRadius: radius.sm,
    paddingVertical: 12,
    marginBottom: 24,
  },
  premiumBadgeText: { fontFamily: fonts.heading, fontSize: 13, color: colors.gold, letterSpacing: 2 },
  restoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginBottom: 12 },
  restoreRowText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  targetsCard: { marginBottom: 24 },
  targetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  targetItem: { minWidth: '28%' },
  targetValue: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 24 },
  targetLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, marginTop: 2, letterSpacing: 1 },
  targetUnit: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 1 },
  settingsCard: { padding: 0, overflow: 'hidden', marginBottom: 24 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(75,163,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75,163,255,0.15)',
  },
  settingsInfo: { flex: 1 },
  settingsLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  settingsSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(161, 39, 39, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(161, 39, 39, 0.25)',
    borderRadius: radius.sm,
    paddingVertical: 14,
    marginBottom: 24,
  },
  logoutText: { fontFamily: fonts.heading, fontSize: 14, color: colors.red, letterSpacing: 2 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4, marginBottom: 24 },
  deleteText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textDecorationLine: 'underline' },
  versionRow: { alignItems: 'center', gap: 4, marginBottom: 8 },
  versionText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, letterSpacing: 2 },
  taglineText: { fontFamily: fonts.headingLight, fontSize: 12, color: colors.muted, letterSpacing: 2 },

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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipActive: { borderColor: colors.blue, backgroundColor: 'rgba(75,163,255,0.14)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.frost },
  saveBtn: { backgroundColor: colors.blue, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 12 },
  saveBtnText: { fontFamily: fonts.heading, fontSize: 14, color: colors.black, letterSpacing: 1 },

  planOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  planOptionRowActive: { borderColor: colors.gold },
  planOptionName: { fontFamily: fonts.heading, fontSize: 15 },
  planOptionDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  planOptionSplit: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.frost },
});
