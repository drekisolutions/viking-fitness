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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { useOnboardingStore } from '@/store/onboarding';
import { useUserStore } from '@/store/user';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';

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

  const goToApp = () => {
    setProfile({
      id: Math.random().toString(36).slice(2),
      name: onboarding.name,
      email: email || 'warrior@vikingfitness.app',
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

            {/* Social auth */}
            <View style={styles.socialSection}>
              <TouchableOpacity style={styles.socialBtn} onPress={goToApp} activeOpacity={0.8}>
                <Text style={styles.socialIcon}>🍎</Text>
                <Text style={styles.socialBtnText}>Continue with Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} onPress={goToApp} activeOpacity={0.8}>
                <Text style={styles.socialIcon}>🌐</Text>
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            {/* OR divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

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
                  onPress={goToApp}
                  activeOpacity={0.8}
                >
                  <Text style={styles.freePlanBtnText}>START FREE</Text>
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
                  onPress={goToApp}
                  activeOpacity={0.8}
                >
                  <Text style={styles.premiumPlanBtnText}>UNLOCK POWER</Text>
                </TouchableOpacity>
              </Card>
            </View>

            <Text style={styles.trialNote}>
              7-day free trial included · Cancel anytime
            </Text>
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
  socialSection: {
    marginTop: 32,
    gap: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  socialIcon: { fontSize: 20 },
  socialBtnText: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 16,
    color: colors.frost,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  authCard: { padding: 20 },
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
  eyeBtn: {
    padding: 8,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  planCard: {
    flex: 1,
    padding: 14,
    gap: 0,
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
});
