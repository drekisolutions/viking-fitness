import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Timer,
  Trophy,
  Shield,
  X,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import { useUserStore } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import {
  useTrackerStore,
  getLiftPRs,
  getExerciseLastPerformance,
  type WorkoutSessionEntry,
} from '@/store/tracker';
import { calculateEpley1RM, calculateTDEE } from '@/constants/calculations';
import { getWorkoutById } from '@/constants/workouts';
import { getShotWavePhase } from '@/constants/glp1';
import { showAlert, showConfirm } from '@/lib/confirm';

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function triggerHaptic() {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('expo-haptics');
    Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // ignore
  }
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string }>();
  const profile = useUserStore((s) => s.profile);
  const onboarding = useOnboardingStore();
  const {
    activeWorkout,
    workoutSessions,
    glp1Profile,
    glp1Shots,
    startActiveWorkout,
    updateActiveWorkoutSet,
    addActiveWorkoutSet,
    removeActiveWorkoutSet,
    discardActiveWorkout,
    finishActiveWorkout,
  } = useTrackerStore();

  const [elapsedSec, setElapsedSec] = useState(0);
  const [restSecLeft, setRestSecLeft] = useState<number | null>(null);
  const [completedSession, setCompletedSession] = useState<WorkoutSessionEntry | null>(null);

  // If navigated directly with ?templateId= and no active session, boot one.
  useEffect(() => {
    if (!activeWorkout && !completedSession) {
      const tpl = getWorkoutById(params.templateId || 'ppl-push');
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
      startActiveWorkout(tpl, wave.phase === 'peak', wave.phase);
    }
  }, [activeWorkout, completedSession, params.templateId]);

  // Stopwatch
  useEffect(() => {
    if (!activeWorkout) return;
    const update = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - Date.parse(activeWorkout.startedAt)) / 1000)
      );
      setElapsedSec(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  // Rest timer countdown
  useEffect(() => {
    if (restSecLeft === null || restSecLeft <= 0) {
      if (restSecLeft === 0) setRestSecLeft(null);
      return;
    }
    const id = setTimeout(() => {
      setRestSecLeft((cur) => (cur !== null && cur > 1 ? cur - 1 : null));
    }, 1000);
    return () => clearTimeout(id);
  }, [restSecLeft]);

  const historicalPRs = useMemo(() => {
    const map = new Map<string, number>();
    for (const pr of getLiftPRs(workoutSessions)) {
      map.set(pr.lift, pr.estimated1rm);
    }
    return map;
  }, [workoutSessions]);

  const handleToggleComplete = (exIdx: number, setIdx: number, restSec: number) => {
    if (!activeWorkout) return;
    const target = activeWorkout.exercises[exIdx]?.sets[setIdx];
    if (!target) return;
    const nextDone = !target.completed;
    updateActiveWorkoutSet(exIdx, setIdx, { completed: nextDone });
    if (nextDone) {
      triggerHaptic();
      setRestSecLeft(restSec);
    }
  };

  const handleDiscard = () => {
    showConfirm(
      'Abandon Battle?',
      'Your current unlogged sets will be discarded.',
      () => {
        discardActiveWorkout();
        router.replace('/(tabs)/training');
      },
      'Discard',
      true
    );
  };

  const handleFinish = () => {
    const completedCount =
      activeWorkout?.exercises.reduce(
        (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
        0
      ) ?? 0;

    if (completedCount === 0) {
      showAlert(
        'No Sets Completed',
        'Check off at least one completed set before finishing, or discard this session.'
      );
      return;
    }

    const saved = finishActiveWorkout(profile?.id);
    if (saved) {
      triggerHaptic();
      setCompletedSession(saved);
    }
  };

  // Summary view after finishing
  if (completedSession) {
    const prCount = completedSession.sets.filter((s) => s.isPr).length;
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.summaryWrap}>
          <Text style={styles.summaryIcon}>⚔️</Text>
          <Text style={styles.summaryTitle}>BATTLE VICTORY</Text>
          <Text style={styles.summarySub}>{completedSession.name}</Text>

          <Card glowColor="gold" style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryVal}>{completedSession.durationMin}m</Text>
                <Text style={styles.summaryLbl}>Duration</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryVal}>
                  {completedSession.totalVolumeLbs.toLocaleString()}
                </Text>
                <Text style={styles.summaryLbl}>lbs Moved</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryVal, { color: colors.gold }]}>
                  {completedSession.sets.length}
                </Text>
                <Text style={styles.summaryLbl}>Sets Done</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryVal, { color: '#3FB950' }]}>{prCount}</Text>
                <Text style={styles.summaryLbl}>New PRs</Text>
              </View>
            </View>
          </Card>

          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => router.replace('/(tabs)/training')}
            activeOpacity={0.85}
          >
            <Text style={styles.returnBtnText}>RETURN TO FORGE</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  if (!activeWorkout) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.black} />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/training'))}
            style={styles.backBtn}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeWorkout.name}
            </Text>
            <Text style={styles.headerSub}>
              {activeWorkout.split} · {formatTimer(elapsedSec)}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDiscard} hitSlop={8} style={styles.discardBtn}>
            <X size={18} color={colors.red} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={styles.finishBtnText}>FINISH</Text>
          </TouchableOpacity>
        </View>

        {/* Active Rest Timer */}
        {restSecLeft !== null && (
          <View style={styles.restBar}>
            <Timer size={16} color={colors.blue} />
            <Text style={styles.restText}>REST: {formatTimer(restSecLeft)}</Text>
            <TouchableOpacity
              style={styles.restAdjustBtn}
              onPress={() => setRestSecLeft((s) => Math.max(5, (s ?? 0) - 15))}
            >
              <Text style={styles.restAdjustText}>-15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restAdjustBtn}
              onPress={() => setRestSecLeft((s) => (s ?? 0) + 15)}
            >
              <Text style={styles.restAdjustText}>+15s</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRestSecLeft(null)}>
              <Text style={styles.restSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeWorkout.glp1Phase === 'peak' && (
            <View style={styles.peakBanner}>
              <Shield size={15} color="#AB47BC" />
              <Text style={styles.peakBannerText}>
                GLP-1 Peak Shield Active — back-off sets trimmed to preserve recovery while keeping
                heavy muscle-retention stimulus.
              </Text>
            </View>
          )}

          {activeWorkout.exercises.map((ex, exIdx) => {
            const prevSets = getExerciseLastPerformance(workoutSessions, ex.name);
            const bestHist = historicalPRs.get(ex.name) ?? 0;

            return (
              <Card key={`${ex.name}-${exIdx}`} style={styles.exCard}>
                <View style={styles.exHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exSub}>
                      {ex.muscle} · Target {ex.repsTarget} · {Math.round(ex.restSec / 60 * 10) / 10}m rest
                    </Text>
                  </View>
                  {bestHist > 0 && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>PR 1RM {bestHist} lbs</Text>
                    </View>
                  )}
                </View>

                <View style={styles.setColHeader}>
                  <Text style={[styles.colLbl, { width: 32 }]}>SET</Text>
                  <Text style={[styles.colLbl, { flex: 1 }]}>PREV</Text>
                  <Text style={[styles.colLbl, { width: 72, textAlign: 'center' }]}>LBS</Text>
                  <Text style={[styles.colLbl, { width: 64, textAlign: 'center' }]}>REPS</Text>
                  <Text style={[styles.colLbl, { width: 42, textAlign: 'center' }]}>DONE</Text>
                </View>

                {ex.sets.map((s, setIdx) => {
                  const wNum = Number(s.weightLbs) || 0;
                  const rNum = Number(s.reps) || 0;
                  const cur1RM = calculateEpley1RM(wNum, rNum);
                  const isLivePR = s.completed && cur1RM > 0 && cur1RM > bestHist;
                  const prevTxt = prevSets[setIdx]
                    ? `${prevSets[setIdx].weightLbs}×${prevSets[setIdx].reps}`
                    : '—';

                  return (
                    <View
                      key={s.id}
                      style={[styles.setRow, s.completed && styles.setRowDone]}
                    >
                      <TouchableOpacity
                        style={styles.setNumCell}
                        onLongPress={() => removeActiveWorkoutSet(exIdx, setIdx)}
                      >
                        <Text style={styles.setNumText}>{s.setNumber}</Text>
                      </TouchableOpacity>
                      <Text style={styles.prevCell}>{prevTxt}</Text>
                      <TextInput
                        style={styles.numInput}
                        value={s.weightLbs}
                        onChangeText={(txt) =>
                          updateActiveWorkoutSet(exIdx, setIdx, { weightLbs: txt })
                        }
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.muted}
                        textAlign="center"
                      />
                      <TextInput
                        style={[styles.numInput, { width: 64 }]}
                        value={s.reps}
                        onChangeText={(txt) =>
                          updateActiveWorkoutSet(exIdx, setIdx, { reps: txt })
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.muted}
                        textAlign="center"
                      />
                      <TouchableOpacity
                        style={[styles.checkBtn, s.completed && styles.checkBtnDone]}
                        onPress={() => handleToggleComplete(exIdx, setIdx, ex.restSec)}
                      >
                        {isLivePR ? (
                          <Trophy size={15} color={colors.black} />
                        ) : (
                          <Check size={16} color={s.completed ? colors.black : colors.muted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <View style={styles.exFooter}>
                  <TouchableOpacity
                    style={styles.addSetBtn}
                    onPress={() => addActiveWorkoutSet(exIdx)}
                  >
                    <Plus size={14} color={colors.blue} />
                    <Text style={styles.addSetText}>ADD SET</Text>
                  </TouchableOpacity>
                  {ex.sets.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeSetBtn}
                      onPress={() => removeActiveWorkoutSet(exIdx, ex.sets.length - 1)}
                    >
                      <Trash2 size={13} color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })}

          <TouchableOpacity
            style={styles.finishBottomBtn}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.finishBottomText}>FINISH BATTLE</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.white, letterSpacing: 1 },
  headerSub: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.blue },
  discardBtn: { padding: 8 },
  finishBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  finishBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 1 },
  restBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#122136',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(75,163,255,0.35)',
  },
  restText: { flex: 1, fontFamily: fonts.heading, fontSize: 14, color: colors.blue, letterSpacing: 1 },
  restAdjustBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restAdjustText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.frost },
  restSkipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted, marginLeft: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10 },
  peakBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(171,71,188,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(171,71,188,0.35)',
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 12,
  },
  peakBannerText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.frost, lineHeight: 17 },
  exCard: { marginBottom: 14, padding: 14 },
  exHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  exName: { fontFamily: fonts.heading, fontSize: 16, color: colors.frost },
  exSub: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  bestBadge: {
    backgroundColor: 'rgba(214,167,86,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  bestBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.gold },
  setColHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  colLbl: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.muted, letterSpacing: 1 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setRowDone: { backgroundColor: 'rgba(63,185,80,0.08)' },
  setNumCell: { width: 32, alignItems: 'center' },
  setNumText: { fontFamily: fonts.heading, fontSize: 14, color: colors.muted },
  prevCell: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  numInput: {
    width: 72,
    height: 36,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.frost,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  checkBtn: {
    width: 42,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnDone: { backgroundColor: '#3FB950', borderColor: '#3FB950' },
  exFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addSetText: { fontFamily: fonts.heading, fontSize: 12, color: colors.blue, letterSpacing: 0.5 },
  removeSetBtn: { padding: 4 },
  finishBottomBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  finishBottomText: { fontFamily: fonts.heading, fontSize: 15, color: colors.black, letterSpacing: 1.5 },
  summaryWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  summaryIcon: { fontSize: 60, marginBottom: 8 },
  summaryTitle: { fontFamily: fonts.display, fontSize: 40, color: colors.gold, letterSpacing: 3 },
  summarySub: { fontFamily: fonts.headingLight, fontSize: 15, color: colors.muted, marginBottom: 24 },
  summaryCard: { width: '100%', padding: 20, marginBottom: 24 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  summaryStat: { width: '46%', alignItems: 'center' },
  summaryVal: { fontFamily: fonts.display, fontSize: 32, color: colors.frost },
  summaryLbl: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  returnBtn: {
    width: '100%',
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingVertical: 15,
    alignItems: 'center',
  },
  returnBtnText: { fontFamily: fonts.heading, fontSize: 15, color: colors.black, letterSpacing: 1.5 },
});
