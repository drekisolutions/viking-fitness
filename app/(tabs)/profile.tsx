import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Settings, ChevronRight, Target, Utensils, Bell, Shield, LogOut, Trash2, Crown, RotateCcw, CreditCard as Edit3 } from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import { supabase } from '@/lib/supabase';
import { restorePremium } from '@/lib/upgrade';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';

const SETTINGS_GROUPS = [
  {
    title: 'PREFERENCES',
    items: [
      { icon: Target, label: 'Goals & Targets', sub: 'Adjust calorie & macro goals' },
      { icon: Utensils, label: 'Nutrition Plan', sub: 'Change your meal plan type' },
      { icon: Bell, label: 'Notifications', sub: 'Reminders & alerts' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { icon: Shield, label: 'Privacy & Security', sub: 'Password, data, privacy' },
      { icon: Settings, label: 'App Settings', sub: 'Units, theme, language' },
    ],
  },
];

const STATS = [
  { label: 'Workouts', value: '47' },
  { label: 'Days Active', value: '62' },
  { label: 'lbs Lost', value: '3.7' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { name, goal, mealPlan, calories, protein, carbs, fat, bmi } = useOnboardingStore();
  const { profile, updateProfile, clearProfile } = useUserStore();
  const [restoring, setRestoring] = useState(false);

  const displayName = name || 'Warrior';
  const isPremium = profile?.plan === 'premium';

  const handleRestore = async () => {
    if (!profile) return;
    setRestoring(true);
    try {
      const outcome = await restorePremium(profile.id);
      if (outcome.status === 'purchased') {
        updateProfile({ plan: 'premium' });
        Alert.alert('Restored', 'Your premium subscription is active again.');
      } else if (outcome.status === 'unavailable' || outcome.status === 'error') {
        Alert.alert('Restore', outcome.message);
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            clearProfile();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your fitness data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const { error } = await supabase.functions.invoke('delete-account');
                if (error) throw error;
                await supabase.auth.signOut();
              }
              clearProfile();
              router.replace('/');
            } catch (e: any) {
              Alert.alert('Deletion failed', e.message ?? 'Please try again or contact dreki.solutions@gmail.com.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <TouchableOpacity style={styles.settingsBtn}>
            <Settings size={22} color={colors.frost} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200' }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <TouchableOpacity style={styles.editAvatar}>
              <Edit3 size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{displayName.toUpperCase()}</Text>
          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>
              {goal.toUpperCase()} · {mealPlan.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {STATS.map((s, idx) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {idx < STATS.length - 1 && <View style={styles.statDivider} />}
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
                <Text style={styles.upgradeSub}>AI plans, analytics & all ranks</Text>
              </View>
              <ChevronRight size={18} color={colors.gold} />
            </Card>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>MY TARGETS</Text>
        <Card glowColor="blue" style={styles.targetsCard}>
          <View style={styles.targetGrid}>
            {[
              { label: 'Calories', value: `${calories > 0 ? calories.toLocaleString() : '—'}`, unit: 'kcal/day', color: colors.blue },
              { label: 'Protein', value: `${protein > 0 ? protein : '—'}g`, unit: 'per day', color: colors.blue },
              { label: 'Carbs', value: `${carbs > 0 ? carbs : '—'}g`, unit: 'per day', color: colors.gold },
              { label: 'Fat', value: `${fat > 0 ? fat : '—'}g`, unit: 'per day', color: '#E57373' },
              { label: 'BMI', value: `${bmi > 0 ? bmi : '—'}`, unit: 'body mass', color: '#4CAF50' },
            ].map((t) => (
              <View key={t.label} style={styles.targetItem}>
                <Text style={[styles.targetValue, { color: t.color }]}>{t.value}</Text>
                <Text style={styles.targetLabel}>{t.label}</Text>
                <Text style={styles.targetUnit}>{t.unit}</Text>
              </View>
            ))}
          </View>
        </Card>

        {SETTINGS_GROUPS.map((group) => (
          <View key={group.title}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <Card style={styles.settingsCard}>
              {group.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
                    <View style={styles.settingsIcon}>
                      <item.icon size={18} color={colors.blue} />
                    </View>
                    <View style={styles.settingsInfo}>
                      <Text style={styles.settingsLabel}>{item.label}</Text>
                      <Text style={styles.settingsSub}>{item.sub}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.muted} />
                  </TouchableOpacity>
                  {idx < group.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

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
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.white,
    letterSpacing: 2,
    lineHeight: 40,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.gold,
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.black,
  },
  profileName: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.white,
    letterSpacing: 2,
    lineHeight: 36,
    marginBottom: 8,
  },
  goalBadge: {
    backgroundColor: 'rgba(214, 167, 86, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(214, 167, 86, 0.3)',
  },
  goalBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 1.5,
  },
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
  statValue: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.white,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(214,167,86,0.3)',
  },
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
  premiumBadgeText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.gold,
    letterSpacing: 2,
  },
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  restoreRowText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  targetsCard: { marginBottom: 24 },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  targetItem: { minWidth: '28%' },
  targetValue: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 24,
  },
  targetLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    letterSpacing: 1,
  },
  targetUnit: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  settingsCard: { padding: 0, overflow: 'hidden', marginBottom: 24 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
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
  logoutText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.red,
    letterSpacing: 2,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 24,
  },
  deleteText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  versionRow: { alignItems: 'center', gap: 4, marginBottom: 8 },
  versionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
  },
  taglineText: {
    fontFamily: fonts.headingLight,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 2,
  },
});
