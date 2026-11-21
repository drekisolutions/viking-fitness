import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Play,
  Clock,
  Dumbbell,
  Shield,
  Trophy,
  TriangleAlert,
  Sparkles,
  X,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { AIPlanCard } from '@/components/AIPlanCard';
import { colors, fonts, radius } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import { useTrackerStore, getTodayDateKey } from '@/store/tracker';
import { calculateTDEE } from '@/constants/calculations';
import { getShotWavePhase } from '@/constants/glp1';
import { getIronRationsCoupling } from '@/constants/adaptive';
import {
  PIVOT_CONSTRAINTS,
  type PivotConstraint,
  type WorkoutPivotPlan,
} from '@/constants/tacticalFallback';
import { getWorkoutPivot } from '@/lib/tactical';
import { SPLITS, getWorkoutsForSplit, type WorkoutTemplate } from '@/constants/workouts';

export default function TrainingScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const onboarding = useOnboardingStore();
  const {
    selectedSplit,
    setSelectedSplit,
    activeWorkout,
    workoutSessions,
    foodLogs,
    glp1Profile,
    glp1Shots,
    startActiveWorkout,
  } = useTrackerStore();

  const isPremium = profile?.plan === 'premium';
  const workouts = useMemo(() => getWorkoutsForSplit(selectedSplit), [selectedSplit]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(workouts[0]?.id ?? '');
  const [lowRationsTrim, setLowRationsTrim] = useState(false);

  // Pivot modal state
  const [pivotModalOpen, setPivotModalOpen] = useState(false);
  const [pivotConstraint, setPivotConstraint] = useState<PivotConstraint>('25_min');
  const [pivotPlan, setPivotPlan] = useState<WorkoutPivotPlan | null>(null);
  const [pivotSource, setPivotSource] = useState<'local' | 'ai'>('local');
  const [pivoting, setPivoting] = useState(false);

  useEffect(() => {
    if (!workouts.some((w) => w.id === selectedWorkoutId)) {
      setSelectedWorkoutId(workouts[0]?.id ?? '');
    }
  }, [workouts, selectedWorkoutId]);

  const previewWorkout =
    workouts.find((w) => w.id === selectedWorkoutId) ?? workouts[0];

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

  const todayKey = getTodayDateKey();
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
        baseCalories: glp1Profile.enabled
          ? wave.adaptedCalories
          : onboarding.calories || 2000,
        baseProtein: glp1Profile.enabled
          ? wave.proteinFloorG
          : onboarding.protein || 140,
        baseCarbs: glp1Profile.enabled ? wave.adaptedCarbsG : onboarding.carbs || 180,
        baseFat: glp1Profile.enabled ? wave.adaptedFatG : onboarding.fat || 65,
        glp1Phase: glp1Profile.enabled ? wave.phase : undefined,
      }),
    [todayKey, todaySessions, activeWorkout, foodLogs, glp1Profile.enabled, wave, onboarding]
  );

  const handleStartWorkout = (w: WorkoutTemplate) => {
    const trimVolume = wave.phase === 'peak' || lowRationsTrim;
    startActiveWorkout(w, trimVolume, wave.phase);
    router.push('/workout-session');
  };

  const handleOpenPivot = async (constraint: PivotConstraint, preferAi: boolean) => {
    if (!previewWorkout) return;
    setPivotConstraint(constraint);
    setPivotModalOpen(true);
    setPivoting(true);
    try {
      const res = await getWorkoutPivot(previewWorkout, constraint, preferAi);
      setPivotPlan(res.plan);
      setPivotSource(res.source);
    } finally {
      setPivoting(false);
    }
  };

  const handleStartAdapted = () => {
    if (!previewWorkout || !pivotPlan) return;
    const adaptedTemplate: WorkoutTemplate = {
      ...previewWorkout,
      id: `${previewWorkout.id}-${pivotConstraint}`,
      name: pivotPlan.title,
      muscleFocus: pivotPlan.focus,
      durationMin: pivotPlan.durationMin,
      exercises: pivotPlan.exercises,
    };
    startActiveWorkout(adaptedTemplate, wave.phase === 'peak' || lowRationsTrim, wave.phase);
    setPivotModalOpen(false);
    router.push('/workout-session');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TRAINING</Text>
          <Text style={styles.headerSub}>Forge Your Legacy</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.splitRow}>
          {SPLITS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.splitChip, selectedSplit === s && styles.splitChipActive]}
              onPress={() => setSelectedSplit(s)}
            >
              <Text
                style={[
                  styles.splitChipText,
                  selectedSplit === s && styles.splitChipTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeWorkout && (
          <TouchableOpacity
            onPress={() => router.push('/workout-session')}
            activeOpacity={0.85}
          >
            <Card glowColor="gold" style={styles.resumeCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resumeEyebrow}>ACTIVE BATTLE IN PROGRESS</Text>
                <Text style={styles.resumeTitle}>{activeWorkout.name}</Text>
              </View>
              <View style={styles.resumeBtn}>
                <Play size={14} color={colors.black} fill={colors.black} />
                <Text style={styles.resumeBtnText}>RESUME</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {glp1Profile.enabled && (
          <TouchableOpacity onPress={() => router.push('/glp1')} activeOpacity={0.85}>
            <View style={[styles.waveBanner, { borderColor: wave.color + '60' }]}>
              <Shield size={16} color={wave.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.waveBannerTitle, { color: wave.color }]}>
                  {wave.label}
                </Text>
                <Text style={styles.waveBannerText}>{wave.trainingNote}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Iron <-> Rations Low-Rations Guard */}
        {coupling.lowRationsWarning && coupling.liftingDirective && (
          <View style={styles.lowRationsCard}>
            <TriangleAlert size={16} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.lowRationsTitle}>IRON ↔ RATIONS RECOVERY GUARD</Text>
              <Text style={styles.lowRationsText}>{coupling.liftingDirective}</Text>
              <TouchableOpacity
                style={[styles.trimToggleBtn, lowRationsTrim && styles.trimToggleBtnOn]}
                onPress={() => setLowRationsTrim((v) => !v)}
              >
                <Text
                  style={[
                    styles.trimToggleText,
                    lowRationsTrim && { color: colors.black },
                  ]}
                >
                  {lowRationsTrim ? '✓ Back-Off Sets Trimmed' : 'Trim Back-Off Sets Today'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <AIPlanCard type="workout" />

        <Text style={styles.sectionTitle}>{selectedSplit.toUpperCase()} SCHEDULE</Text>
        <View style={styles.workoutList}>
          {workouts.map((w) => {
            const isSelected = w.id === previewWorkout?.id;
            const trim = wave.phase === 'peak' || lowRationsTrim;
            const totalSets = w.exercises.reduce(
              (sum, ex) => sum + (trim ? ex.glp1PeakSets : ex.sets),
              0
            );
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => setSelectedWorkoutId(w.id)}
                activeOpacity={0.85}
              >
                <Card
                  glowColor={isSelected ? 'gold' : 'none'}
                  style={[styles.workoutCard, isSelected && styles.workoutCardSelected]}
                >
                  <View style={[styles.cardAccentBar, { backgroundColor: w.accentColor }]} />
                  <View style={styles.workoutInfo}>
                    <View style={styles.workoutTop}>
                      <Text style={styles.workoutDay}>{w.dayLabel}</Text>
                      {isSelected && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>SELECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.workoutName}>{w.name}</Text>
                    <Text style={styles.workoutMuscle}>{w.muscleFocus}</Text>
                    <View style={styles.workoutMeta}>
                      <View style={styles.metaStat}>
                        <Clock size={12} color={colors.muted} />
                        <Text style={styles.metaText}>{w.durationMin} min</Text>
                      </View>
                      <View style={styles.metaStat}>
                        <Dumbbell size={12} color={colors.muted} />
                        <Text style={styles.metaText}>{totalSets} working sets</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => handleStartWorkout(w)}
                    activeOpacity={0.85}
                  >
                    <Play size={15} color={colors.black} fill={colors.black} />
                    <Text style={styles.startBtnText}>START</Text>
                  </TouchableOpacity>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {previewWorkout && (
          <>
            {/* 1-Tap Battlefield Pivot Chips */}
            <Text style={styles.sectionTitle}>1-TAP PIVOT TODAY'S BATTLE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pivotRow}
              style={{ marginBottom: 18 }}
            >
              {PIVOT_CONSTRAINTS.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={styles.pivotChip}
                  onPress={() => handleOpenPivot(c.key, false)}
                >
                  <Text style={styles.pivotChipLabel}>{c.label}</Text>
                  <Text style={styles.pivotChipSub}>{c.shortDesc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {previewWorkout.name} · EXERCISES
            </Text>
            <Card style={styles.exerciseCard}>
              {previewWorkout.exercises.map((ex, idx) => {
                const displaySets =
                  wave.phase === 'peak' || lowRationsTrim ? ex.glp1PeakSets : ex.sets;
                return (
                  <React.Fragment key={ex.name}>
                    <View style={styles.exerciseRow}>
                      <View style={styles.exerciseNum}>
                        <Text style={styles.exerciseNumText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <Text style={styles.exerciseMuscle}>{ex.muscle}</Text>
                      </View>
                      <View style={styles.exerciseRight}>
                        <Text style={styles.exerciseSets}>
                          {displaySets} × {ex.reps}
                        </Text>
                        <Text style={styles.exerciseRest}>
                          {Math.round((ex.restSec / 60) * 10) / 10} min rest
                        </Text>
                      </View>
                    </View>
                    {idx < previewWorkout.exercises.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </React.Fragment>
                );
              })}
            </Card>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>RECENT BATTLES</Text>
        {workoutSessions.length === 0 ? (
          <Card style={styles.emptyHistoryCard}>
            <Text style={styles.emptyHistoryText}>
              No completed workouts yet. Tap START above to log sets, rest timers, and PRs.
            </Text>
          </Card>
        ) : (
          workoutSessions.slice(0, 8).map((s) => {
            const prCount = s.sets.filter((x) => x.isPr).length;
            return (
              <Card key={s.id} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{s.name}</Text>
                  <Text style={styles.historyMeta}>
                    {new Date(s.completedAt).toLocaleDateString()} · {s.split} · {s.durationMin}m
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyVol}>
                    {s.totalVolumeLbs.toLocaleString()} lbs
                  </Text>
                  {prCount > 0 && (
                    <View style={styles.prTag}>
                      <Trophy size={10} color={colors.gold} />
                      <Text style={styles.prTagText}>{prCount} PR</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Battlefield Pivot Modal */}
      <Modal
        visible={pivotModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPivotModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>BATTLEFIELD PIVOT</Text>
              <TouchableOpacity onPress={() => setPivotModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {pivoting || !pivotPlan ? (
              <ActivityIndicator color={colors.gold} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                <View style={styles.pivotSourceRow}>
                  <Text style={styles.pivotPlanName}>{pivotPlan.title}</Text>
                  <Text style={styles.pivotSourceTag}>
                    {pivotSource === 'ai' ? 'AI TUNED' : 'TACTICAL ENGINE'}
                  </Text>
                </View>
                <Text style={styles.pivotRationale}>
                  {pivotPlan.durationMin} min · {pivotPlan.rationale}
                </Text>

                {pivotPlan.exercises.map((ex, i) => (
                  <View key={`${ex.name}-${i}`} style={styles.pivotExRow}>
                    <Text style={styles.pivotExName}>
                      {i + 1}. {ex.name}
                    </Text>
                    <Text style={styles.pivotExMeta}>
                      {ex.sets} × {ex.reps}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.aiEnhanceBtn}
                  onPress={() => {
                    if (!isPremium) {
                      setPivotModalOpen(false);
                      router.push('/upgrade');
                      return;
                    }
                    handleOpenPivot(pivotConstraint, true);
                  }}
                >
                  <Sparkles size={14} color={colors.gold} />
                  <Text style={styles.aiEnhanceText}>
                    {isPremium ? 'CUSTOMIZE WITH AI' : 'UNLOCK AI PIVOT CUSTOMIZATION'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.startPivotBtn}
                  onPress={handleStartAdapted}
                >
                  <Play size={14} color={colors.black} fill={colors.black} />
                  <Text style={styles.startPivotText}>START ADAPTED BATTLE</Text>
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
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontFamily: fonts.display, fontSize: 40, color: colors.white, letterSpacing: 2, lineHeight: 40 },
  headerSub: { fontFamily: fonts.headingLight, fontSize: 13, color: colors.muted, letterSpacing: 3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  splitRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  splitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  splitChipActive: { borderColor: colors.blue, backgroundColor: 'rgba(75, 163, 255, 0.12)' },
  splitChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },
  splitChipTextActive: { color: colors.blue },

  resumeCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 14 },
  resumeEyebrow: { fontFamily: fonts.heading, fontSize: 10, color: colors.gold, letterSpacing: 1.5 },
  resumeTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.frost },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm },
  resumeBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black },

  waveBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(171,71,188,0.08)', borderWidth: 1, borderRadius: radius.sm, padding: 12, marginBottom: 14 },
  waveBannerTitle: { fontFamily: fonts.heading, fontSize: 11, letterSpacing: 1 },
  waveBannerText: { fontFamily: fonts.body, fontSize: 12, color: colors.frost, marginTop: 2, lineHeight: 17 },

  lowRationsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(214,167,86,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.4)',
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 14,
  },
  lowRationsTitle: { fontFamily: fonts.heading, fontSize: 11, color: colors.gold, letterSpacing: 1 },
  lowRationsText: { fontFamily: fonts.body, fontSize: 12, color: colors.frost, marginTop: 2, lineHeight: 17 },
  trimToggleBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  trimToggleBtnOn: { backgroundColor: colors.gold },
  trimToggleText: { fontFamily: fonts.heading, fontSize: 10, color: colors.gold, letterSpacing: 0.5 },

  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, letterSpacing: 2, marginBottom: 12 },
  workoutList: { gap: 12, marginBottom: 20 },
  workoutCard: { padding: 0, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  workoutCardSelected: { borderColor: colors.gold },
  cardAccentBar: { width: 4, alignSelf: 'stretch' },
  workoutInfo: { flex: 1, padding: 14 },
  workoutTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  workoutDay: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.muted, letterSpacing: 2 },
  todayBadge: { backgroundColor: colors.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  todayBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 9, color: colors.black, letterSpacing: 1 },
  workoutName: { fontFamily: fonts.display, fontSize: 26, color: colors.white, letterSpacing: 1, lineHeight: 28 },
  workoutMuscle: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 8 },
  workoutMeta: { flexDirection: 'row', gap: 16 },
  metaStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gold, marginRight: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.sm },
  startBtnText: { fontFamily: fonts.heading, fontSize: 13, color: colors.black, letterSpacing: 1 },

  pivotRow: { gap: 8, paddingRight: 4 },
  pivotChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 130,
  },
  pivotChipLabel: { fontFamily: fonts.heading, fontSize: 12, color: colors.blue },
  pivotChipSub: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 2 },

  exerciseCard: { padding: 0, overflow: 'hidden' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  exerciseNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  exerciseNumText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  exerciseMuscle: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  exerciseRight: { alignItems: 'flex-end' },
  exerciseSets: { fontFamily: fonts.heading, fontSize: 15, color: colors.blue },
  exerciseRest: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  emptyHistoryCard: { padding: 16 },
  emptyHistoryText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 19 },
  historyCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 14 },
  historyName: { fontFamily: fonts.heading, fontSize: 15, color: colors.frost },
  historyMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  historyVol: { fontFamily: fonts.heading, fontSize: 15, color: colors.blue },
  prTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  prTagText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.gold },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%', borderTopWidth: 1, borderColor: colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.gold, letterSpacing: 1.5 },
  pivotSourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pivotPlanName: { fontFamily: fonts.heading, fontSize: 16, color: colors.frost, flex: 1 },
  pivotSourceTag: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.blue },
  pivotRationale: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 12 },
  pivotExRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  pivotExName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.frost, flex: 1 },
  pivotExMeta: { fontFamily: fonts.heading, fontSize: 13, color: colors.blue },
  aiEnhanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 10,
    marginTop: 14,
  },
  aiEnhanceText: { fontFamily: fonts.heading, fontSize: 12, color: colors.gold, letterSpacing: 0.5 },
  startPivotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  startPivotText: { fontFamily: fonts.heading, fontSize: 14, color: colors.black, letterSpacing: 1 },
});
