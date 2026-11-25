import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useUserStore } from '@/store/user';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import { STRIPE_PRICES, type StripePlan } from '@/lib/stripe';
import { upgradeToPremium, restorePremium } from '@/lib/upgrade';
import { getNativePrices, type NativePrices } from '@/lib/purchases';
import { trackEvent } from '@/lib/analytics';

const PREMIUM_FEATURES = [
  'AI-generated meal plans (macro & GLP-1 wave tuned)',
  'AI-generated workouts & Battlefield Pivots',
  'AI Salvage My Day & voice/text food parser',
  'GLP-1 Reverse-Diet & Taper Off-Ramp',
  'Unlimited AI tactical macro & workout adaptations',
];

const PRO_FEATURES = [
  'Everything in Viking Premium',
  '24/7 Mimir AI Coach (context-aware training & nutrition)',
  'Plate Photo Macro Scan + GLP-1 tolerance score',
  'Priority AI coaching & deep progress guidance',
];

const TIER_PLANS: Record<'premium' | 'pro', StripePlan[]> = {
  premium: ['monthly', 'annual'],
  pro: ['pro_monthly', 'pro_annual'],
};

export default function UpgradeScreen() {
  const router = useRouter();
  const { tier: tierParam } = useLocalSearchParams<{ tier?: string }>();
  const { profile, updateProfile } = useUserStore();

  const initialTier: 'premium' | 'pro' = tierParam === 'pro' ? 'pro' : 'premium';
  const [selectedTier, setSelectedTier] = useState<'premium' | 'pro'>(initialTier);
  const [selectedTerm, setSelectedTerm] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [nativePrices, setNativePrices] = useState<NativePrices>({});

  const selectedPlan: StripePlan =
    selectedTier === 'pro'
      ? selectedTerm === 'annual'
        ? 'pro_annual'
        : 'pro_monthly'
      : selectedTerm;

  const alreadyActive =
    profile?.plan === 'pro' ||
    (selectedTier === 'premium' && profile?.plan === 'premium');

  // On native, show the real localized store price (Play/Apple) rather than the
  // hardcoded USD Stripe figure, which would mislead non-USD users.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    getNativePrices().then((p) => {
      if (active) setNativePrices(p);
    });
    return () => {
      active = false;
    };
  }, []);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleUpgrade = async () => {
    if (!profile) {
      Alert.alert('Sign in required', 'Please create an account before upgrading.');
      return;
    }
    setLoading(true);
    try {
      const outcome = await upgradeToPremium(profile.id, selectedPlan);
      switch (outcome.status) {
        case 'redirecting':
          trackEvent('subscription_checkout_started', { plan: selectedPlan, platform: Platform.OS });
          break; // web: page navigates to Stripe
        case 'purchased':
          updateProfile({ plan: outcome.plan });
          trackEvent('subscription_started', { plan: selectedPlan, platform: Platform.OS });
          Alert.alert(
            'Welcome, Warrior',
            outcome.plan === 'pro'
              ? 'Your Viking Pro membership is active.'
              : 'Your premium battle pass is active.',
            [{ text: 'Enter', onPress: goBack }]
          );
          break;
        case 'cancelled':
          break; // user backed out — no message
        case 'unavailable':
        case 'error':
          Alert.alert(
            outcome.status === 'unavailable' ? 'Upgrade Unavailable' : 'Purchase Failed',
            outcome.message,
          );
          break;
      }
    } catch {
      Alert.alert('Something went wrong', 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!profile) return;
    setRestoring(true);
    try {
      const outcome = await restorePremium(profile.id);
      if (outcome.status === 'purchased') {
        updateProfile({ plan: outcome.plan });
        Alert.alert('Restored', 'Your subscription is active again.', [
          { text: 'Great', onPress: goBack },
        ]);
      } else if (outcome.status === 'unavailable' || outcome.status === 'error') {
        Alert.alert('Restore', outcome.message);
      }
    } catch {
      Alert.alert('Something went wrong', 'Please try again in a moment.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>⭐ VIKING</Text>
          <Text style={styles.title}>{selectedTier === 'pro' ? 'PRO' : 'PREMIUM'}</Text>
          <Text style={styles.subtitle}>
            {selectedTier === 'pro'
              ? '24/7 Mimir AI Coach + Plate Photo Macro Scan on top of every Premium tool.'
              : 'Unlock the full arsenal and forge your legend without limits.'}
          </Text>

          <View style={styles.tierSwitchRow}>
            {(['premium', 'pro'] as const).map((tier) => {
              const active = selectedTier === tier;
              return (
                <TouchableOpacity
                  key={tier}
                  style={[styles.tierSwitchBtn, active && styles.tierSwitchBtnActive]}
                  onPress={() => setSelectedTier(tier)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tierSwitchText, active && styles.tierSwitchTextActive]}>
                    {tier === 'pro' ? 'PRO · $24.99/MO' : 'PREMIUM · $14.99/MO'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {alreadyActive ? (
            <Card glowColor="gold" style={styles.activeCard}>
              <Text style={styles.activeTitle}>
                {profile?.plan === 'pro' ? "YOU'RE VIKING PRO" : "YOU'RE PREMIUM"}
              </Text>
              <Text style={styles.activeSub}>
                {profile?.plan === 'pro'
                  ? 'All Pro & Premium weapons are active. Fight on, warrior.'
                  : 'Your Premium pass is active. Switch to Pro above for Mimir AI Coach & Photo Scan.'}
              </Text>
            </Card>
          ) : (
            <>
              <Card style={styles.featureCard}>
                {(selectedTier === 'pro' ? PRO_FEATURES : PREMIUM_FEATURES).map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Check size={16} color={colors.gold} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </Card>

              <View style={styles.plansRow}>
                {TIER_PLANS[selectedTier].map((plan) => {
                  const p = STRIPE_PRICES[plan];
                  const active = selectedTerm === p.term;
                  const displayPrice = nativePrices[plan] ?? p.label;
                  return (
                    <TouchableOpacity
                      key={plan}
                      style={[styles.planOption, active && styles.planOptionActive]}
                      onPress={() => setSelectedTerm(p.term)}
                      activeOpacity={0.85}
                    >
                      {p.savings && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>{p.savings}</Text>
                        </View>
                      )}
                      <Text style={[styles.planName, active && styles.planNameActive]}>
                        {p.term === 'annual' ? 'ANNUAL' : 'MONTHLY'}
                      </Text>
                      <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                        {displayPrice}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={handleUpgrade}
                activeOpacity={0.85}
                disabled={loading || restoring}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : (
                  <Text style={styles.upgradeBtnText}>UNLOCK POWER</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.trialNote}>7-day free trial · Cancel anytime</Text>

              <Text style={styles.disclosure}>
                Subscription automatically renews unless canceled at least 24 hours before the
                end of the current period. Manage or cancel anytime in your{' '}
                {Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'store'}{' '}
                account settings.
              </Text>

              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={handleRestore}
                  disabled={loading || restoring}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color={colors.muted} />
                  ) : (
                    <Text style={styles.restoreText}>Restore purchases</Text>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.legalRow}>
                <TouchableOpacity onPress={() => router.push('/terms')} hitSlop={8}>
                  <Text style={styles.legalLink}>Terms of Use</Text>
                </TouchableOpacity>
                <Text style={styles.legalDot}>·</Text>
                <TouchableOpacity onPress={() => router.push('/privacy')} hitSlop={8}>
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrow: {
    fontFamily: fonts.headingLight,
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 2,
    marginTop: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 52,
    color: colors.frost,
    lineHeight: 54,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    lineHeight: 20,
  },
  tierSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tierSwitchBtnActive: {
    backgroundColor: colors.gold,
  },
  tierSwitchText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  tierSwitchTextActive: {
    color: colors.black,
  },
  featureCard: { padding: 20, marginTop: 24, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontFamily: fonts.body, fontSize: 14, color: colors.frost, flex: 1 },
  plansRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  planOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  planOptionActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(214,167,86,0.08)',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  savingsText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.black,
    letterSpacing: 0.5,
  },
  planName: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 1.5,
  },
  planNameActive: { color: colors.gold },
  planPrice: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.frost,
    marginTop: 4,
  },
  planPriceActive: { color: colors.frost },
  upgradeBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.black,
    letterSpacing: 1,
  },
  trialNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 14,
  },
  disclosure: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
  },
  restoreBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  restoreText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  legalLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.blue,
    textDecorationLine: 'underline',
  },
  legalDot: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  activeCard: { padding: 24, marginTop: 24, alignItems: 'center', gap: 8 },
  activeTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.gold,
    letterSpacing: 2,
  },
  activeSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
});
