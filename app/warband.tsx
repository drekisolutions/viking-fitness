import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Shield,
  Users,
  Sword,
  Trophy,
  Plus,
  LogOut,
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
  getLiftPRs,
  getDateKeyDaysAgo,
} from '@/store/tracker';
import {
  getWeekStartKey,
  computeMemberWeeklyRaidDamage,
  computeRaidProgress,
  STRENGTH_STANDARDS,
  getStrengthTier,
  evaluateCampaignWeek,
} from '@/constants/warband';
import { showAlert, showConfirm } from '@/lib/confirm';

export default function WarbandScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const onboarding = useOnboardingStore();
  const {
    workoutSessions,
    foodLogs,
    waterByDate,
    weightLogs,
    glp1Profile,
    shieldWallPasses,
    protectedWeeks,
    claimedCampaignWeeks,
    warband,
    activateShieldWallPass,
    claimWeeklyCampaignPass,
    createWarband,
    joinWarbandByCode,
    syncWarbandDamage,
    leaveWarband,
  } = useTrackerStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [bandNameInput, setBandNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [busy, setBusy] = useState(false);

  const displayName = onboarding.name || profile?.name || 'Warrior';
  const currentWeight =
    weightLogs[weightLogs.length - 1]?.weightLbs ?? onboarding.weightLbs ?? 180;
  const proteinTarget = Math.max(
    glp1Profile.enabled ? glp1Profile.proteinFloorG : 0,
    onboarding.protein || 140
  );

  const weekStartKey = getWeekStartKey();

  // Compute caller's stats within the current Mon-Sun campaign week
  const weekStats = useMemo(() => {
    const sessionsThisWeek = workoutSessions.filter(
      (s) => s.completedAt.slice(0, 10) >= weekStartKey
    );
    const workoutsThisWeek = sessionsThisWeek.length;
    const prCountThisWeek = sessionsThisWeek.reduce(
      (sum, s) => sum + s.sets.filter((st) => st.isPr).length,
      0
    );

    const proByDay = new Map<string, number>();
    for (const f of foodLogs) {
      if (f.logDate >= weekStartKey) {
        proByDay.set(f.logDate, (proByDay.get(f.logDate) ?? 0) + (f.protein || 0));
      }
    }
    const threshold = Math.max(60, Math.round(proteinTarget * 0.8));
    let proteinShieldDaysThisWeek = 0;
    for (const totalPro of proByDay.values()) {
      if (totalPro >= threshold) proteinShieldDaysThisWeek += 1;
    }

    let electrolyteDaysThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const k = getDateKeyDaysAgo(i);
      if (k >= weekStartKey && waterByDate[k]?.electrolytesTaken) {
        electrolyteDaysThisWeek += 1;
      }
    }

    const damage = computeMemberWeeklyRaidDamage({
      workoutsThisWeek,
      prCountThisWeek,
      proteinShieldDaysThisWeek,
      electrolyteDaysThisWeek,
    });

    return {
      workoutsThisWeek,
      prCountThisWeek,
      proteinShieldDaysThisWeek,
      electrolyteDaysThisWeek,
      damage,
    };
  }, [workoutSessions, foodLogs, waterByDate, proteinTarget, weekStartKey]);

  // Keep warband member score synced when stats update
  useEffect(() => {
    if (!warband) return;
    syncWarbandDamage(profile?.id, displayName, {
      damage: weekStats.damage,
      workouts: weekStats.workoutsThisWeek,
      proteinDays: weekStats.proteinShieldDaysThisWeek,
    });
  }, [
    warband?.id,
    weekStats.damage,
    weekStats.workoutsThisWeek,
    weekStats.proteinShieldDaysThisWeek,
    profile?.id,
    displayName,
  ]);

  const raidMembers = useMemo(() => {
    if (warband && warband.members.length > 0) return warband.members;
    return [
      {
        userId: profile?.id || 'solo',
        displayName,
        weeklyDamage: weekStats.damage,
        weeklyWorkouts: weekStats.workoutsThisWeek,
        weeklyProteinDays: weekStats.proteinShieldDaysThisWeek,
      },
    ];
  }, [warband, profile?.id, displayName, weekStats]);

  const raid = useMemo(() => computeRaidProgress(raidMembers), [raidMembers]);

  const campaignEval = useMemo(
    () =>
      evaluateCampaignWeek({
        workoutsThisWeek: weekStats.workoutsThisWeek,
        proteinShieldDaysThisWeek: weekStats.proteinShieldDaysThisWeek,
        weekStartKey,
        protectedWeeks,
        claimedWeeks: claimedCampaignWeeks,
        currentPasses: shieldWallPasses,
      }),
    [weekStats, weekStartKey, protectedWeeks, claimedCampaignWeeks, shieldWallPasses]
  );

  const prs = useMemo(() => getLiftPRs(workoutSessions), [workoutSessions]);

  const handleCreateWarband = async () => {
    if (!bandNameInput.trim()) {
      showAlert('Name required', 'Give your Longship squad a name.');
      return;
    }
    setBusy(true);
    try {
      const res = await createWarband(profile?.id, bandNameInput, displayName, {
        damage: weekStats.damage,
        workouts: weekStats.workoutsThisWeek,
        proteinDays: weekStats.proteinShieldDaysThisWeek,
      });
      if (res.ok) {
        setBandNameInput('');
        setCreateModalOpen(false);
      } else {
        showAlert('Could not forge Warband', res.error ?? 'Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleJoinWarband = async () => {
    if (!joinCodeInput.trim()) {
      showAlert('Code required', 'Enter the 6-character Warband invite code.');
      return;
    }
    setBusy(true);
    try {
      const res = await joinWarbandByCode(profile?.id, joinCodeInput, displayName, {
        damage: weekStats.damage,
        workouts: weekStats.workoutsThisWeek,
        proteinDays: weekStats.proteinShieldDaysThisWeek,
      });
      if (res.ok) {
        setJoinCodeInput('');
        setJoinModalOpen(false);
      } else {
        showAlert('Join Failed', res.error ?? 'Check the invite code and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    showConfirm(
      'Leave Warband?',
      'You can always forge a new Longship or rejoin with an invite code.',
      () => {
        leaveWarband(profile?.id);
      },
      'Leave',
      true
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.black} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            style={styles.backBtn}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>WARBAND & RAIDS</Text>
            <Text style={styles.headerSub}>Anti-Fragile Co-op Boss Campaigns</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Weekly Raid Boss Card */}
          <Card glowColor="gold" style={styles.card}>
            <View style={styles.bossTopRow}>
              <View style={[styles.bossBadge, { borderColor: raid.boss.accentColor }]}>
                <Sword size={14} color={raid.boss.accentColor} />
                <Text style={[styles.bossBadgeText, { color: raid.boss.accentColor }]}>
                  WEEKLY BOSS RAID · {raid.daysLeft}D LEFT
                </Text>
              </View>
              {raid.defeated && (
                <View style={styles.defeatedPill}>
                  <Trophy size={12} color={colors.black} />
                  <Text style={styles.defeatedText}>SLAIN</Text>
                </View>
              )}
            </View>

            <Text style={styles.bossName}>{raid.boss.name}</Text>
            <Text style={styles.bossTitle}>{raid.boss.title}</Text>
            <Text style={styles.bossLore}>{raid.boss.lore}</Text>

            <View style={styles.hpRow}>
              <Text style={styles.hpLabel}>
                {raid.totalDamage.toLocaleString()} / {raid.maxHp.toLocaleString()} DMG
              </Text>
              <Text style={styles.hpPct}>{raid.progressPct}%</Text>
            </View>
            <ProgressBar
              value={raid.progressPct / 100}
              color={raid.defeated ? '#3FB950' : raid.boss.accentColor}
              height={8}
            />
            <Text style={styles.damageLegend}>
              +180 DMG/lift · +90 DMG/Protein Shield day · +40 DMG/PR · +30 DMG/electrolytes
            </Text>
          </Card>

          {/* Shield Wall Passes (Anti-Fragile Consistency) */}
          <Card glowColor="blue" style={styles.card}>
            <View style={styles.shieldHeader}>
              <View style={styles.shieldIcon}>
                <Shield size={20} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>SHIELD WALL PASSES</Text>
                <Text style={styles.cardSub}>
                  {shieldWallPasses}/3 stored · Protects your weekly campaign during illness or travel
                </Text>
              </View>
            </View>

            <View style={styles.weekStatusRow}>
              <Text style={styles.weekMetric}>
                This Week: {weekStats.workoutsThisWeek}/3 lifts · {weekStats.proteinShieldDaysThisWeek}/5 protein days
              </Text>
              {campaignEval.weekSecured && (
                <Text style={styles.securedTag}>
                  {campaignEval.isProtected ? '🛡 PROTECTED' : '✓ QUOTA MET'}
                </Text>
              )}
            </View>

            {campaignEval.eligibleForNewPass && (
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={() => claimWeeklyCampaignPass(weekStartKey)}
              >
                <Check size={14} color={colors.black} />
                <Text style={styles.claimBtnText}>CLAIM EARNED SHIELD WALL PASS (+1)</Text>
              </TouchableOpacity>
            )}

            {!campaignEval.weekSecured && (
              <TouchableOpacity
                style={[
                  styles.activatePassBtn,
                  shieldWallPasses <= 0 && { opacity: 0.4 },
                ]}
                disabled={shieldWallPasses <= 0}
                onPress={() => {
                  const ok = activateShieldWallPass(weekStartKey);
                  if (ok) {
                    showAlert(
                      'Shield Wall Raised',
                      'Your current week is protected against streak penalties. Rest, recover, and return strong.'
                    );
                  }
                }}
              >
                <Shield size={14} color={colors.blue} />
                <Text style={styles.activatePassText}>
                  ACTIVATE PASS FOR THIS WEEK ({shieldWallPasses} LEFT)
                </Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Warband Squad Roster */}
          <Card style={styles.card}>
            <View style={styles.squadHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {warband ? warband.name.toUpperCase() : 'SOLO RAIDER MODE'}
                </Text>
                <Text style={styles.cardSub}>
                  {warband
                    ? `Invite Code: ${warband.inviteCode} · ${warband.members.length}/5 Raiders`
                    : 'Team up with 2–5 friends — damage is bodyweight-normalized so everyone fights fairly.'}
                </Text>
              </View>
              {warband && (
                <TouchableOpacity onPress={handleLeave} hitSlop={8}>
                  <LogOut size={18} color={colors.red} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ marginTop: 14, gap: 10 }}>
              {raid.contributions.map((m) => (
                <View key={m.userId} style={styles.memberRow}>
                  <View style={styles.memberTop}>
                    <Text style={styles.memberName}>{m.displayName}</Text>
                    <Text style={styles.memberDmg}>
                      {m.weeklyDamage} DMG ({m.sharePct}%)
                    </Text>
                  </View>
                  <ProgressBar
                    value={Math.min(1, m.weeklyDamage / 1000)}
                    color={colors.gold}
                    height={5}
                    style={{ marginVertical: 5 }}
                  />
                  <Text style={styles.memberSub}>
                    {m.weeklyWorkouts} lifts · {m.weeklyProteinDays} Protein Shield days
                  </Text>
                </View>
              ))}
            </View>

            {!warband && (
              <View style={styles.squadActions}>
                <TouchableOpacity
                  style={styles.forgeBandBtn}
                  onPress={() => setCreateModalOpen(true)}
                >
                  <Plus size={14} color={colors.black} />
                  <Text style={styles.forgeBandText}>FORGE WARBAND</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.joinBandBtn}
                  onPress={() => setJoinModalOpen(true)}
                >
                  <Users size={14} color={colors.blue} />
                  <Text style={styles.joinBandText}>JOIN BY CODE</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Bodyweight Strength Ranks */}
          <Text style={styles.sectionTitle}>BODYWEIGHT STRENGTH STANDARDS ({currentWeight} LBS)</Text>
          <Card style={styles.card}>
            {STRENGTH_STANDARDS.map((std, idx) => {
              const matchingPr = prs.find((p) =>
                std.matchTokens.some((tok) => p.lift.toLowerCase().includes(tok))
              );
              const tier = getStrengthTier(std, matchingPr?.estimated1rm ?? 0, currentWeight);
              return (
                <View
                  key={std.key}
                  style={[
                    styles.stdRow,
                    idx < STRENGTH_STANDARDS.length - 1 && styles.stdDivider,
                  ]}
                >
                  <View style={styles.stdTop}>
                    <Text style={styles.stdName}>{std.label}</Text>
                    <Text style={styles.stdTier}>
                      {tier.tier.toUpperCase()} ({tier.ratio}× BW)
                    </Text>
                  </View>
                  <ProgressBar
                    value={tier.progress}
                    color={colors.gold}
                    height={5}
                    style={{ marginVertical: 6 }}
                  />
                  <Text style={styles.stdSub}>
                    {matchingPr
                      ? `Best Est. 1RM: ${matchingPr.estimated1rm} lbs`
                      : 'No logged lift yet'}
                    {tier.nextTier && tier.nextTargetLbs
                      ? ` · Next (${tier.nextTier}): ${tier.nextTargetLbs} lbs`
                      : ''}
                  </Text>
                </View>
              );
            })}
          </Card>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Forge Warband Modal */}
      <Modal
        visible={createModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>FORGE A WARBAND</Text>
              <TouchableOpacity onPress={() => setCreateModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>LONGSHIP SQUAD NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Iron Wolves"
              placeholderTextColor={colors.muted}
              value={bandNameInput}
              onChangeText={setBandNameInput}
            />
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={handleCreateWarband}
              disabled={busy}
            >
              <Text style={styles.modalSaveText}>{busy ? 'FORGING...' : 'CREATE & GET CODE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Join Warband Modal */}
      <Modal
        visible={joinModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>JOIN A WARBAND</Text>
              <TouchableOpacity onPress={() => setJoinModalOpen(false)} hitSlop={8}>
                <X size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>6-CHARACTER INVITE CODE</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. A7K9P2"
              placeholderTextColor={colors.muted}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              autoCapitalize="characters"
              maxLength={8}
            />
            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.blue }]}
              onPress={handleJoinWarband}
              disabled={busy}
            >
              <Text style={styles.modalSaveText}>{busy ? 'BOARDING...' : 'BOARD LONGSHIP'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.display, fontSize: 30, color: colors.white, letterSpacing: 1.5, lineHeight: 32 },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 14 },

  bossTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bossBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  bossBadgeText: { fontFamily: fonts.heading, fontSize: 10, letterSpacing: 1 },
  defeatedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3FB950', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  defeatedText: { fontFamily: fonts.heading, fontSize: 10, color: colors.black },
  bossName: { fontFamily: fonts.display, fontSize: 32, color: colors.frost, lineHeight: 34 },
  bossTitle: { fontFamily: fonts.headingLight, fontSize: 13, color: colors.gold, letterSpacing: 1 },
  bossLore: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 18 },
  hpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  hpLabel: { fontFamily: fonts.heading, fontSize: 14, color: colors.frost },
  hpPct: { fontFamily: fonts.heading, fontSize: 14, color: colors.gold },
  damageLegend: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 8 },

  shieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shieldIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(75,163,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.heading, fontSize: 13, color: colors.frost, letterSpacing: 1.5 },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  weekStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  weekMetric: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.frost },
  securedTag: { fontFamily: fonts.heading, fontSize: 11, color: '#3FB950', letterSpacing: 0.5 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#3FB950', borderRadius: radius.sm, paddingVertical: 11, marginTop: 12 },
  claimBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 1 },
  activatePassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.blue, borderRadius: radius.sm, paddingVertical: 11, marginTop: 12 },
  activatePassText: { fontFamily: fonts.heading, fontSize: 12, color: colors.blue, letterSpacing: 1 },

  squadHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  memberRow: { backgroundColor: colors.surfaceLight, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },
  memberTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.frost },
  memberDmg: { fontFamily: fonts.heading, fontSize: 13, color: colors.gold },
  memberSub: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  squadActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  forgeBandBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 12 },
  forgeBandText: { fontFamily: fonts.heading, fontSize: 12, color: colors.black, letterSpacing: 1 },
  joinBandBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.blue, borderRadius: radius.sm, paddingVertical: 12 },
  joinBandText: { fontFamily: fonts.heading, fontSize: 12, color: colors.blue, letterSpacing: 1 },

  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, letterSpacing: 2, marginTop: 4, marginBottom: 10 },
  stdRow: { paddingVertical: 10 },
  stdDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  stdTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stdName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.frost },
  stdTier: { fontFamily: fonts.heading, fontSize: 12, color: colors.gold },
  stdSub: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.gold, letterSpacing: 1.5 },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.muted, letterSpacing: 1.5, marginBottom: 6 },
  modalInput: { backgroundColor: colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.frost, fontFamily: fonts.bodyMedium, fontSize: 15, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14 },
  modalSaveBtn: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  modalSaveText: { fontFamily: fonts.heading, fontSize: 14, color: colors.black, letterSpacing: 1 },
});
