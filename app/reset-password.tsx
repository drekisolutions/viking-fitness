import React, { useEffect, useState } from 'react';
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
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; token_hash?: string; type?: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const initRecoverySession = async () => {
      try {
        // 1. Check if Supabase already established a session (e.g. detectSessionInUrl on web)
        const existing = await supabase.auth.getSession();
        if (existing.data.session) {
          if (active) setReady(true);
          return;
        }

        // 2. Check PKCE code or token_hash in query params
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (!error && active) {
            setReady(true);
            return;
          }
        }
        if (params.token_hash && params.type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: params.token_hash,
            type: 'recovery',
          });
          if (!error && active) {
            setReady(true);
            return;
          }
        }

        // 3. Parse hash fragment from web URL or native deep link
        const rawUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();

        if (rawUrl && rawUrl.includes('#')) {
          const hash = rawUrl.split('#')[1];
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && active) {
              setReady(true);
              return;
            }
          }
        }

        if (active) {
          setSessionError('This reset link is invalid or has expired. Please request a new one.');
        }
      } catch {
        if (active) {
          setSessionError('Could not verify your reset link. Please request a new one.');
        }
      }
    };

    initRecoverySession();
    return () => {
      active = false;
    };
  }, [params.code, params.token_hash, params.type]);

  const handleUpdatePassword = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Please use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Make sure both password fields match.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Update failed', error.message);
        return;
      }
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        { text: 'Continue', onPress: () => router.replace('/signin') },
      ]);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/signin')}
            style={styles.backBtn}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={colors.blue} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={styles.title}>NEW PASSWORD</Text>
          <Text style={styles.subtitle}>Choose a strong new password for your account.</Text>

          {!ready && !sessionError ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.blue} />
              <Text style={styles.verifyingText}>Verifying reset link…</Text>
            </View>
          ) : sessionError ? (
            <Card style={styles.authCard}>
              <Text style={styles.errorText}>{sessionError}</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/forgot-password' as Href)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>REQUEST NEW LINK</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <>
              <Card style={styles.authCard}>
                <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
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

                <Text style={[styles.fieldLabel, { marginTop: 20 }]}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.muted}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleUpdatePassword}
                />
              </Card>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleUpdatePassword}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : (
                  <Text style={styles.primaryBtnText}>UPDATE PASSWORD</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    fontSize: 44,
    color: colors.frost,
    lineHeight: 48,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    lineHeight: 20,
  },
  centerBox: { marginTop: 48, alignItems: 'center', gap: 12 },
  verifyingText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  authCard: { padding: 20, marginTop: 24 },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: '#E57373', lineHeight: 20 },
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
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 8 },
  primaryBtn: {
    marginTop: 24,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.black,
    letterSpacing: 1,
  },
});
