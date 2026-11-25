import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import {
  ChevronLeft,
  Syringe,
  Shield,
  TriangleAlert,
  Crown,
  Lock,
  Trash2,
  Plus,
  X,
  Check,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, fonts, radius } from '@/constants/theme';
import { useUserStore } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import {
  useTrackerStore,
  getWeeklyCampaignStats,
} from '@/store/tracker';
import { calculateTDEE } from '@/constants/calculations';
import { showConfirm } from '@/lib/confirm';
import {
  GLP1_MEDICATIONS,
  INJECTION_SITES,
  generateMedicationCurve,
  estimateMedicationLevel,
  getNextRecommendedSite,
  getShotWavePhase,
  calculateMuscleArmorScore,
  computeRelativeStrengthChangePct,
  type Glp1MedicationKey,
  type Glp1PhaseMode,
} from '@/constants/glp1';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDICATION_KEYS: Glp1MedicationKey[] = [
  'semaglutide',
  'tirzepatide',
  'liraglutide',
  'retatrutide',
];
const SYMPTOM_LEVELS = ['None', 'Mild', 'Mod', 'High'];

export default function Glp1Screen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const onboarding = useOnboardingStore();
  const {
    glp1Profile,
    glp1Shots,
    workoutSessions,
    weightLogs,
    foodLogs,
    waterByDate,
    setGlp1Config,
    addGlp1Shot,
    removeGlp1Shot,
  } = useTrackerStore();

  const isPremium = profile?.plan === 'premium' || profile?.plan === 'pro';
  const [chartWidth, setChartWidth] = useState(Math.min(540, SCREEN_WIDTH - 80));
  const [shotModalOpen, setShotModalOpen] = useState(false);

  // Shot form state
  const recommendedSite = useMemo(
    () => getNextRecommendedSite(glp1Shots),
    [glp1Shots]
  );
  const [shotMed, setShotMed] = useState<Glp1MedicationKey>(glp1Profile.medication);
  const [shotDose, setShotDose] = useState<number>(glp1Profile.currentDoseMg);
  const [shotSite, setShotSite] = useState<string>(recommendedSite.key);
  const [shotDaysAgo, setShotDaysAgo] = useState<number>(0);
  const [nausea, setNausea] = useState<number>(0);
  const [fatigue, setFatigue] = useState<number>(0);
  const [appetite, setAppetite] = useState<number>(1);

  const spec = GLP1_MEDICATIONS[glp1Profile.medication] ?? GLP1_MEDICATIONS.semaglutide;

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

  const medEstimate = useMemo(
    () => estimateMedicationLevel(glp1Shots, glp1Profile.medication, Date.now()),
    [glp1Shots, glp1Profile.medication]
  );

  const curvePoints = useMemo(
    () => generateMedicationCurve(glp1Shots, glp1Profile.medication, Date.now()),
    [glp1Shots, glp1Profile.medication]
  );

  const weeklyStats = useMemo(
    () =>
      getWeeklyCampaignStats(
        workoutSessions,
        foodLogs,
        waterByDate,
        wave.proteinFloorG
      ),
    [workoutSessions, foodLogs, waterByDate, wave.proteinFloorG]
  );

  const relStrengthDelta = useMemo(
    () =>
      computeRelativeStrengthChangePct(
        workoutSessions,
        weightLogs,
        onboarding.weightLbs || 180
      ),
    [workoutSessions, weightLogs, onboarding.weightLbs]
  );

  const armor = useMemo(
    () =>
      calculateMuscleArmorScore({
        workoutsLast7Days: weeklyStats.workoutsLast7Days,
        proteinShieldDaysLast7: weeklyStats.proteinShieldDaysLast7,
        relativeStrengthChangePct: relStrengthDelta.hasBaseline
          ? relStrengthDelta.changePct
          : 0,
        electrolytesDaysLast7: weeklyStats.electrolytesDaysLast7,
      }),
    [weeklyStats, relStrengthDelta]
  );

  const openShotModal = () => {
    setShotMed(glp1Profile.medication);
    setShotDose(glp1Profile.currentDoseMg);
    setShotSite(recommendedSite.key);
    setShotDaysAgo(0);
    setNausea(0);
    setFatigue(0);
    setAppetite(1);
    setShotModalOpen(true);
  };

  const handleSaveShot = () => {
    const injectedDate = new Date(Date.now() - shotDaysAgo * 24 * 60 * 60 * 1000);
    addGlp1Shot(profile?.id, {
      medication: shotMed,
      doseMg: shotDose,
      injectionSite: shotSite,
      injectedAt: injectedDate.toISOString(),
      nauseaLevel: nausea,
      fatigueLevel: fatigue,
      appetiteLevel: appetite,
    });
    if (!glp1Profile.enabled) {
      setGlp1Config(profile?.id, {
        enabled: true,
        medication: shotMed,
        brandName: GLP1_MEDICATIONS[shotMed].brands,
        currentDoseMg: shotDose,
      });
    }
    setShotModalOpen(false);
  };

  const handleSelectMode = (mode: Glp1PhaseMode) => {
    if ((mode === 'tapering' || mode === 'maintenance') && !isPremium) {
      showConfirm(
        'Premium Feature',
        'GLP-1 Reverse-Diet & Taper Off-Ramp is part of Viking Premium.',
        () => router.push('/upgrade'),
        'Upgrade'
      );
      return;
    }
    setGlp1Config(profile?.id, {
      phaseMode: mode,
      reverseDietStartDate:
        mode === 'tapering'
          ? glp1Profile.reverseDietStartDate ?? new Date().toISOString().slice(0, 10)
          : glp1Profile.reverseDietStartDate,
    });
  };

  // SVG Curve coordinates
  const svgH = 120;
  const padX = 12;
  const padY = 14;
  const polyPoints = curvePoints.map((pt, idx) => {
    const x = padX + (idx / Math.max(1, curvePoints.length - 1)) * (chartWidth - padX * 2);
    const y = svgH - padY - (pt.normalizedPct / 100) * (svgH - padY * 2);
    return { x, y, pt };
  });
  const lineStr = polyPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaStr =
    polyPoints.length > 0
      ? `${polyPoints[0].x.toFixed(1)},${svgH - padY} ${lineStr} ${polyPoints[polyPoints.length - 1].x.toFixed(1)},${svgH - padY}`
      : '';
  const todayPoint = polyPoints.find((p) => p.pt.dayOffset === 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            style={styles.backBtn}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>GLP-1 MUSCLE ARMOR</Text>
            <Text style={styles.headerSub}>Shot-Wave & Lean Mass Shield</Text>
          </View>
          <TouchableOpacity style={styles.logShotBtn} onPress={openShotModal} activeOpacity={0.85}>
            <Plus size={14} color={colors.black} />
            <Text style={styles.logShotText}>LOG SHOT</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Medical Disclaimer */}
          <View style={styles.disclaimerBanner}>
            <TriangleAlert size={15} color="#AB47BC" />
            <Text style={styles.disclaimerText}>
              Informational companion only — not medical advice. Never adjust medication doses
              without consulting your prescribing physician.
            </Text>
          </View>

          {/* Toggle & Config */}
          <Card style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>MUSCLE ARMOR PROTOCOL</Text>
                <Text style={styles.cardSub}>
                  Syncs calories, Protein Shield & lifting volume to your shot wave
                </Text>
              </View>
              <Switch
                value={glp1Profile.enabled}
                onValueChange={(enabled) => setGlp1Config(profile?.id, { enabled })}
                trackColor={{ false: colors.border, true: '#AB47BC' }}
                thumbColor={colors.white}
              />
            </View>

            <Text style={styles.fieldLabel}>MEDICATION</Text>
            <View style={styles.chipWrap}>
              {MEDICATION_KEYS.map((key) => {
                const m = GLP1_MEDICATIONS[key];
                const active = glp1Profile.medication === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, active && styles.chipPurpleActive]}
                    onPress={() =>
                      setGlp1Config(profile?.id, {
                        medication: key,
                        brandName: m.brands,
                        currentDoseMg: m.doses[0],
                        shotIntervalDays: m.defaultIntervalDays,
                      })
                    }
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.brandHint}>{spec.brands} · t½ ≈ {spec.halfLifeDays}d</Text>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>CURRENT DOSE (MG)</Text>
            <View style={styles.chipWrap}>
              {spec.doses.map((d) => {
                const active = glp1Profile.currentDoseMg === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, active && styles.chipGoldActive]}
                    onPress={() => setGlp1Config(profile?.id, { currentDoseMg: d })}
                  >
                    <Text style={[styles.chipText, active && { color: colors.gold }]}>
                      {d} mg
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.stepperRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>PROTEIN SHIELD FLOOR</Text>
                <Text style={styles.cardSub}>Daily minimum target to stop muscle loss</Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setGlp1Config(profile?.id, {
                      proteinFloorG: Math.max(80, glp1Profile.proteinFloorG - 5),
                    })
                  }
                >
                  <Text style={styles.stepBtnText}>−5</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{glp1Profile.proteinFloorG}g</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setGlp1Config(profile?.id, {
                      proteinFloorG: Math.min(260, glp1Profile.proteinFloorG + 5),
                    })
                  }
                >
                  <Text style={styles.stepBtnText}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* 7-Day Shot Wave Status */}
          <Card glowColor="blue" style={styles.card}>
            <View style={styles.waveTopRow}>
              <View style={[styles.phaseBadge, { borderColor: wave.color, backgroundColor: wave.color + '20' }]}>
                <Text style={[styles.phaseBadgeText, { color: wave.color }]}>{wave.label}</Text>
              </View>
              {wave.daysUntilNextShot !== null && (
                <Text style={styles.countdownText}>
                  {wave.daysUntilNextShot === 0
                    ? 'Shot due today'
                    : `Next shot in ${wave.daysUntilNextShot}d`}
                </Text>
              )}
            </View>

            <View style={styles.waveStatsRow}>
              <View style={styles.waveStat}>
                <Text style={styles.waveStatVal}>{wave.adaptedCalories}</Text>
                <Text style={styles.waveStatLbl}>Today kcal</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.waveStat}>
                <Text style={[styles.waveStatVal, { color: colors.gold }]}>
                  {wave.proteinFloorG}g
                </Text>
                <Text style={styles.waveStatLbl}>Protein Floor</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.waveStat}>
                <Text style={[styles.waveStatVal, { color: '#AB47BC' }]}>
                  {medEstimate.activeMg.toFixed(2)}mg
                </Text>
                <Text style={styles.waveStatLbl}>Est. Active</Text>
              </View>
            </View>

            <Text style={styles.directiveLine}>
              <Text style={styles.directiveLabel}>Nutrition: </Text>
              {wave.nutritionNote}
            </Text>
            <Text style={[styles.directiveLine, { marginTop: 6 }]}>
              <Text style={styles.directiveLabel}>Training: </Text>
              {wave.trainingNote}
            </Text>
          </Card>

          {/* 14-Day Estimated Medication Curve */}
          <Card style={styles.card}>
            <View style={styles.curveHeader}>
              <Text style={styles.cardTitle}>14-DAY ESTIMATED MED WAVE</Text>
              <Text style={styles.nextSiteBadge}>
                Next site: {recommendedSite.shortLabel}
              </Text>
            </View>
            <View
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 120) setChartWidth(w);
              }}
            >
              {glp1Shots.length === 0 ? (
                <View style={styles.emptyCurve}>
                  <Syringe size={22} color={colors.muted} />
                  <Text style={styles.emptyCurveText}>
                    Log your first injection to plot your estimated systemic wave & site rotation.
                  </Text>
                </View>
              ) : (
                <Svg width={chartWidth} height={svgH}>
                  <Line x1={padX} y1={svgH - padY} x2={chartWidth - padX} y2={svgH - padY} stroke={colors.border} strokeWidth={1} />
                  <Line x1={padX} y1={padY} x2={chartWidth - padX} y2={padY} stroke={colors.border} strokeDasharray="3 4" strokeWidth={1} />
                  {areaStr ? <Polygon points={areaStr} fill="rgba(171,71,188,0.18)" /> : null}
                  {lineStr ? (
                    <Polyline
                      points={lineStr}
                      fill="none"
                      stroke="#AB47BC"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {todayPoint && (
                    <>
                      <Line
                        x1={todayPoint.x}
                        y1={padY}
                        x2={todayPoint.x}
                        y2={svgH - padY}
                        stroke={colors.gold}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                      />
                      <Circle cx={todayPoint.x} cy={todayPoint.y} r={4.5} fill={colors.gold} />
                      <SvgText
                        x={todayPoint.x}
                        y={11}
                        fill={colors.gold}
                        fontSize={9}
                        textAnchor="middle"
                      >
                        TODAY
                      </SvgText>
                    </>
                  )}
                </Svg>
              )}
            </View>
            <View style={styles.axisRow}>
              <Text style={styles.axisLabel}>-7d</Text>
              <Text style={styles.axisLabel}>Today</Text>
              <Text style={styles.axisLabel}>+7d</Text>
            </View>
          </Card>

          {/* Muscle Armor Score */}
          <Card glowColor="gold" style={styles.card}>
            <View style={styles.armorHeader}>
              <View style={styles.armorIcon}>
                <Shield size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>MUSCLE ARMOR INDEX</Text>
                <Text style={styles.cardSub}>{armor.headline}</Text>
              </View>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreVal}>{armor.score}</Text>
                <Text style={styles.scoreStatus}>{armor.status}</Text>
              </View>
            </View>
            <ProgressBar
              value={armor.score / 100}
              color={colors.gold}
              height={6}
              style={{ marginVertical: 12 }}
            />
            <Text style={styles.cardSub}>{armor.guidance}</Text>
            <View style={styles.armorBreakdown}>
              <Text style={styles.breakdownItem}>⚔ {weeklyStats.workoutsLast7Days}/3 lifts</Text>
              <Text style={styles.breakdownItem}>🥩 {weeklyStats.proteinShieldDaysLast7}/6 protein days</Text>
              <Text style={styles.breakdownItem}>
                💪 {relStrengthDelta.hasBaseline ? `${relStrengthDelta.changePct >= 0 ? '+' : ''}${relStrengthDelta.changePct}% rel. str` : 'Baseline pending'}
              </Text>
              <Text style={styles.breakdownItem}>💧 {weeklyStats.electrolytesDaysLast7}/5 electrolytes</Text>
            </View>
          </Card>

          {/* Reverse-Diet & Taper Off-Ramp */}
          <Card style={styles.card}>
            <View style={styles.offRampHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>REVERSE-DIET & TAPER OFF-RAMP</Text>
                <Text style={styles.cardSub}>
                  Step calories up cleanly when tapering off GLP-1s to prevent weight regain
                </Text>
              </View>
              {!isPremium && (
                <View style={styles.premPill}>
                  <Crown size={11} color={colors.gold} />
                  <Text style={styles.premPillText}>PREMIUM</Text>
                </View>
              )}
            </View>

            <View style={[styles.chipWrap, { marginTop: 12 }]}>
              {(['active', 'tapering', 'maintenance'] as Glp1PhaseMode[]).map((mode) => {
                const active = glp1Profile.phaseMode === mode;
                const locked = mode !== 'active' && !isPremium;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.chip, active && styles.chipGoldActive]}
                    onPress={() => handleSelectMode(mode)}
                  >
                    {locked && <Lock size={11} color={colors.gold} style={{ marginRight: 4 }} />}
                    <Text style={[styles.chipText, active && { color: colors.gold }]}>
                      {mode === 'active'
                        ? 'Active Loss'
                        : mode === 'tapering'
                        ? 'Tapering Off-Ramp'
                        : 'Maintenance'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isPremium && glp1Profile.phaseMode === 'tapering' && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>WEEKLY CALORIE RAMP</Text>
                <View style={styles.chipWrap}>
                  {[50, 75, 100].map((bump) => {
                    const active = glp1Profile.reverseDietWeeklyBumpKcal === bump;
                    return (
                      <TouchableOpacity
                        key={bump}
                        style={[styles.chip, active && styles.chipGoldActive]}
                        onPress={() =>
                          setGlp1Config(profile?.id, { reverseDietWeeklyBumpKcal: bump })
                        }
                      >
                        <Text style={[styles.chipText, active && { color: colors.gold }]}>
                          +{bump} kcal/wk
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.cardSub, { marginTop: 10 }]}>
                  Current Target: <Text style={{ color: colors.gold }}>{wave.adaptedCalories} kcal</Text> → Est. Maintenance: <Text style={{ color: colors.frost }}>{tdee} kcal</Text>
                </Text>
              </View>
            )}
          </Card>

          {/* Shot History */}
          <Text style={styles.sectionTitle}>INJECTION LOG</Text>
          {glp1Shots.length === 0 ? (
            <Card style={styles.card}>
              <Text style={styles.cardSub}>No injections logged yet. Tap LOG SHOT above.</Text>
            </Card>
          ) : (
            glp1Shots.map((s) => {
              const site = INJECTION_SITES.find((x) => x.key === s.injectionSite);
              const dateLabel = new Date(s.injectedAt).toLocaleDateString();
              return (
                <Card key={s.id} style={styles.shotRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shotTitle}>
                      {GLP1_MEDICATIONS[s.medication]?.label ?? s.medication} · {s.doseMg} mg
                    </Text>
                    <Text style={styles.shotMeta}>
                      {dateLabel} · {site?.label ?? s.injectionSite}
                    </Text>
                    <Text style={styles.shotSymptoms}>
                      Nausea: {SYMPTOM_LEVELS[s.nauseaLevel] ?? 'None'} · Fatigue:{' '}
                      {SYMPTOM_LEVELS[s.fatigueLevel] ?? 'None'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeGlp1Shot(profile?.id, s.id)}
                    hitSlop={8}
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={16} color={colors.muted} />
                  </TouchableOpacity>
                </Card>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Log Shot Modal */}
      <Modal
        visible={shotModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setShotModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LOG GLP-1 SHOT</Text>
              <TouchableOpacity onPress={() => setShotModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>MEDICATION</Text>
              <View style={styles.chipWrap}>
                {MEDICATION_KEYS.map((key) => {
                  const active = shotMed === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, active && styles.chipPurpleActive]}
                      onPress={() => {
                        setShotMed(key);
                        setShotDose(GLP1_MEDICATIONS[key].doses[0]);
                      }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {GLP1_MEDICATIONS[key].label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>DOSE (MG)</Text>
              <View style={styles.chipWrap}>
                {GLP1_MEDICATIONS[shotMed].doses.map((d) => {
                  const active = shotDose === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, active && styles.chipGoldActive]}
                      onPress={() => setShotDose(d)}
                    >
                      <Text style={[styles.chipText, active && { color: colors.gold }]}>
                        {d} mg
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                INJECTION SITE (ROTATION RECOMMENDED: {recommendedSite.shortLabel.toUpperCase()})
              </Text>
              <View style={styles.chipWrap}>
                {INJECTION_SITES.map((site) => {
                  const active = shotSite === site.key;
                  const isRec = site.key === recommendedSite.key;
                  return (
                    <TouchableOpacity
                      key={site.key}
                      style={[styles.chip, active && styles.chipPurpleActive]}
                      onPress={() => setShotSite(site.key)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {site.label}
                        {isRec ? ' ★' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>WHEN</Text>
              <View style={styles.chipWrap}>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Yesterday', days: 1 },
                  { label: '2 Days Ago', days: 2 },
                  { label: '3 Days Ago', days: 3 },
                ].map((opt) => {
                  const active = shotDaysAgo === opt.days;
                  return (
                    <TouchableOpacity
                      key={opt.days}
                      style={[styles.chip, active && styles.chipGoldActive]}
                      onPress={() => setShotDaysAgo(opt.days)}
                    >
                      <Text style={[styles.chipText, active && { color: colors.gold }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>NAUSEA</Text>
              <View style={styles.chipWrap}>
                {SYMPTOM_LEVELS.map((lvl, idx) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.chip, nausea === idx && styles.chipPurpleActive]}
                    onPress={() => setNausea(idx)}
                  >
                    <Text style={[styles.chipText, nausea === idx && styles.chipTextActive]}>
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>FATIGUE</Text>
              <View style={styles.chipWrap}>
                {SYMPTOM_LEVELS.map((lvl, idx) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.chip, fatigue === idx && styles.chipPurpleActive]}
                    onPress={() => setFatigue(idx)}
                  >
                    <Text style={[styles.chipText, fatigue === idx && styles.chipTextActive]}>
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.saveShotBtn}
                onPress={handleSaveShot}
                activeOpacity={0.85}
              >
                <Check size={16} color={colors.black} />
                <Text style={styles.saveShotText}>SAVE INJECTION</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
    letterSpacing: 1.5,
    lineHeight: 30,
  },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  logShotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  logShotText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(171, 71, 188, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(171, 71, 188, 0.35)',
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 14,
  },
  disclaimerText: { flex: 1, fontFamily: fonts.body, fontSize: 11, color: colors.frost, lineHeight: 16 },
  card: { marginBottom: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.frost,
    letterSpacing: 1.5,
  },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 17, marginTop: 2 },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipPurpleActive: { borderColor: '#AB47BC', backgroundColor: 'rgba(171,71,188,0.16)' },
  chipGoldActive: { borderColor: colors.gold, backgroundColor: 'rgba(214,167,86,0.15)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.frost },
  chipTextActive: { color: '#E1BEE7' },
  brandHint: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 6 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.frost },
  stepVal: { fontFamily: fonts.heading, fontSize: 18, color: colors.gold, minWidth: 46, textAlign: 'center' },
  waveTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  phaseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  phaseBadgeText: { fontFamily: fonts.heading, fontSize: 11, letterSpacing: 1 },
  countdownText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.frost },
  waveStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 12,
  },
  waveStat: { flex: 1, alignItems: 'center' },
  waveStatVal: { fontFamily: fonts.display, fontSize: 24, color: colors.blue },
  waveStatLbl: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  statSep: { width: 1, backgroundColor: colors.border },
  directiveLine: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 18 },
  directiveLabel: { fontFamily: fonts.bodyMedium, color: colors.frost },
  curveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nextSiteBadge: { fontFamily: fonts.bodyMedium, fontSize: 11, color: '#AB47BC' },
  emptyCurve: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyCurveText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center', maxWidth: 260 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  armorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  armorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(214,167,86,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircle: { alignItems: 'flex-end' },
  scoreVal: { fontFamily: fonts.display, fontSize: 32, color: colors.gold, lineHeight: 34 },
  scoreStatus: { fontFamily: fonts.heading, fontSize: 10, color: colors.gold, letterSpacing: 1 },
  armorBreakdown: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 },
  breakdownItem: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.frost },
  offRampHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  premPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(214,167,86,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.4)',
  },
  premPillText: { fontFamily: fonts.heading, fontSize: 9, color: colors.gold, letterSpacing: 1 },
  sectionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 10,
  },
  shotRowCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  shotTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  shotMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  shotSymptoms: { fontFamily: fonts.body, fontSize: 11, color: '#CE93D8', marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.gold, letterSpacing: 1.5 },
  saveShotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 16,
  },
  saveShotText: { fontFamily: fonts.heading, fontSize: 14, color: colors.black, letterSpacing: 1 },
});
