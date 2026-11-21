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
import { fetchAppProfile } from '@/lib/session';
import { useTrackerStore } from '@/store/tracker';

export default function SignInScreen() {
  const router = useRouter();
  const { setProfile } = useUserStore();
  const { initFromProfile } = useOnboardingStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Closes the returning-unconfirmed-user gap: signUp with email-confirmation on
  // returns no session, so such a user could never get back in. Here they can
  // request a fresh confirmation link and then sign in.
  const resendConfirmation = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    Alert.alert(
      error ? 'Could not resend' : 'Confirmation sent',
      error
        ? error.message
        : 'We sent a new confirmation link to your email. Confirm it, then sign in.',
    );
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const unconfirmed =
          (error as any).code === 'email_not_confirmed' || /not confirmed/i.test(error.message);
        if (unconfirmed) {
          Alert.alert(
            'Confirm your email',
            'Your email hasn’t been confirmed yet. Check your inbox, or resend the link.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Resend link', onPress: resendConfirmation },
            ],
          );
        } else if (/invalid login credentials/i.test(error.message)) {
          Alert.alert('Sign in failed', 'That email or password doesn’t match our records.');
        } else {
          Alert.alert('Sign in failed', error.message);
        }
        return;
      }

      if (data.user) {
        const profileData = await fetchAppProfile(data.user.id, data.user.email || '');
        if (profileData) {
          setProfile(profileData);
          // Seed the onboarding store so macro/goal data is available across tabs.
          initFromProfile(profileData);
          await useTrackerStore.getState().hydrateFromSupabase(data.user.id);
          router.replace(profileData.onboardingComplete ? '/(tabs)' : '/onboarding');
        } else {
          // Authenticated but no profile row yet — send them to finish setup.
          router.replace('/onboarding');
        }
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.title}>RETURN</Text>
          <Text style={styles.subtitle}>Sign in to resume your ascent.</Text>

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
                placeholder="Your password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
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

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <Text style={styles.signInBtnText}>SIGN IN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.createRow}>
            <Text style={styles.createPrompt}>New to Viking Fitness? </Text>
            <TouchableOpacity onPress={() => router.replace('/onboarding')} hitSlop={8}>
              <Text style={styles.createLink}>Create account</Text>
            </TouchableOpacity>
          </View>
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
  signInBtn: {
    marginTop: 24,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.black,
    letterSpacing: 1,
  },
  createRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  createPrompt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  createLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.blue,
  },
});
