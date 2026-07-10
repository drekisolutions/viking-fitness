import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { upgradeToPremium } from '@/lib/upgrade';

const FREE_FEATURES = ['Meal tracking', 'Macro tracking', 'Basic workouts', 'Warrior ranks I–II'];
const PREMIUM_FEATURES = [
  'Everything free',
  'AI meal plans',
  'AI workouts',
  'Progress photos',
  'Full analytics',
  'All ranks',
];

export default function AccountScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const { setProfile } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');

  const saveProfileToSupabase = async (userId: string, plan: 'free' | 'premium') => {
    await supabase.from('profiles').update({
      name: onboarding.name,
      age: onboarding.age,
      sex: onboarding.sex,
      height_ft: onboarding.heightFt,
      height_in: onboarding.heightIn,
      weight_lbs: onboarding.weightLbs,
      goal: onboarding.goal,
      meal_plan: onboarding.mealPlan,
      activity_level: onboarding.activityLevel,
      activity_label: onboarding.activityLabel,
      calories: onboarding.calories,
      protein: onboarding.protein,
      carbs: onboarding.carbs,
      fat: onboarding.fat,
      bmi: onboarding.bmi,
      plan,
      onboarding_complete: true,
    }).eq('id', userId);
  };

  const enterApp = (userId: string, userEmail: string, plan: 'free' | 'premium') => {
    setProfile({
      id: userId,
      name: onboarding.name,
      email: userEmail,
      age: onboarding.age,
      sex: onboarding.sex,
      heightFt: onboarding.heightFt,
      heightIn: onboarding.heightIn,
      weightLbs: onboarding.weightLbs,
      goal: onboarding.goal,
      mealPlan: onboarding.mealPlan,
      calories: onboarding.calories,
      protein: onboarding.protein,
      carbs: onboarding.carbs,
      fat: onboarding.fat,
      plan,
      onboardingComplete: true,
    });
    router.replace('/(tabs)');
  };

  const handleEmailSignUp = async (plan: 'free' | 'premium') => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        await saveProfileToSupabase(data.user.id, plan);
        enterApp(data.user.id, email, plan);
      }
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueFree = () => handleEmailSignUp('free');

  const handleContinuePremium = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        // Save as free first — the payment webhook upgrades to premium
        await saveProfileToSupabase(data.user.id, 'free');

        // Single compliant path: web→Stripe, native→Play Billing/IAP, else fallback
        const outcome = await upgradeToPremium(data.user.id, 'monthly');
        switch (outcome.status) {
          case 'redirecting':
            // Web: the page is navigating to Stripe — nothing more to do.
            break;
          case 'purchased':
            enterApp(data.user.id, email, 'premium');
            break;
          case 'cancelled':
            enterApp(data.user.id, email, 'free');
            break;
          case 'unavailable':
          case 'error':
            Alert.alert(
              outcome.status === 'unavailable' ? 'Upgrade Unavailable' : 'Checkout Unavailable',
              `${outcome.message} You can upgrade anytime from your profile.`,
            );
            enterApp(data.user.id, email, 'free');
            break;
        }
      }
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Guest mode — local only, no Supabase
    setProfile({
      id: 'guest-' + Date.now(),
      name: onboarding.name || 'Warrior',
      email: '',
      age: onboarding.age,
      sex: onboarding.sex,
      heightFt: onboarding.heightFt,
      heightIn: onboarding.heightIn,
      weightLbs: onboarding.weightLbs,
      goal: onboarding.goal,
      mealPlan: onboarding.mealPlan,
      calories: onboarding.calories,
      protein: onboarding.protein,
      carbs: onboarding.carbs,
      fat: onboarding.fat,
      plan: 'free',
      onboardingComplete: true,
    });
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={colors.black} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>CLAIM YOUR</Text>
          <Text style={styles.title}>LEGEND</Text>
          <Text style={styles.subtitle}>
            Save your warrior profile and begin your ascent.
          </Text>

          {/* Email/password */}
          <Card style={styles.authCard}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="warrior@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.muted} />
                ) : (
                  <Eye size={18} color={colors.muted} />
                )}
              </TouchableOpacity>
            </View>
          </Card>

          {/* Plan selection */}
          <View style={styles.plansRow}>
            {/* Free card */}
            <Card style={styles.planCard}>
              <Text style={styles.planTitle}>FREE</Text>
              <Text style={styles.planRank}>Thrall</Text>
              <View style={styles.planDivider} />
              {FREE_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, { color: colors.blue }]}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.freePlanBtn}
                onPress={handleContinueFree}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.blue} />
                ) : (
                  <Text style={styles.freePlanBtnText}>START FREE</Text>
                )}
              </TouchableOpacity>
            </Card>

            {/* Premium card */}
            <Card glowColor="gold" style={[styles.planCard, styles.premiumCard]}>
              <Text style={styles.premiumTitle}>⭐ PREMIUM</Text>
              <Text style={styles.premiumPrice}>$9.99/mo</Text>
              <View style={styles.planDivider} />
              {PREMIUM_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, { color: colors.gold }]}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.premiumPlanBtn}
                onPress={handleContinuePremium}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : (
                  <Text style={styles.premiumPlanBtnText}>UNLOCK POWER</Text>
                )}
              </TouchableOpacity>
            </Card>
          </View>

          <Text style={styles.trialNote}>
            7-day free trial included · Cancel anytime
          </Text>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Continue without account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  eyebrow: {
    fontFamily: fonts.headingLight,
    fontSize: 18,
    color: colors.muted,
    letterSpacing: 2,
    marginTop: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.frost,
    lineHeight: 50,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    marginBottom: 0,
    lineHeight: 20,
  },
  authCard: { padding: 20, marginTop: 24 },
  fieldLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  fieldInput: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.frost,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: { padding: 8 },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  planCard: {
    flex: 1,
    padding: 14,
  },
  premiumCard: {
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  planTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.frost,
    lineHeight: 26,
  },
  planRank: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 12,
  },
  premiumTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.gold,
    lineHeight: 24,
  },
  premiumPrice: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 12,
  },
  planDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  featureCheck: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  featureText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.frost,
    flex: 1,
    lineHeight: 17,
  },
  freePlanBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freePlanBtnText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.blue,
    letterSpacing: 0.5,
  },
  premiumPlanBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPlanBtnText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.black,
    letterSpacing: 0.5,
  },
  trialNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 16,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
