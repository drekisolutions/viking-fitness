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
import { ChevronLeft, MailCheck } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { Card } from '@/components/ui/Card';
import { colors, fonts, radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

function getResetRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }
  return Linking.createURL('/reset-password');
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter the email address on your account.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: getResetRedirectUrl(),
      });
      if (error) {
        Alert.alert('Could not send reset email', error.message);
        return;
      }
      setSent(true);
    } catch (e: any) {
      Alert.alert('Request failed', e?.message ?? 'Something went wrong. Please try again.');
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
        <StatusBar style="light" />

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
          <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
          <Text style={styles.title}>RESET PASSWORD</Text>
          <Text style={styles.subtitle}>
            Enter your email and we’ll send a link to choose a new password.
          </Text>

          {sent ? (
            <Card glowColor="blue" style={styles.sentCard}>
              <View style={styles.sentIconWrap}>
                <MailCheck size={28} color={colors.blue} />
              </View>
              <Text style={styles.sentTitle}>CHECK YOUR INBOX</Text>
              <Text style={styles.sentBody}>
                We sent a password reset link to{' '}
                <Text style={{ color: colors.frost }}>{email.trim()}</Text>. Open the link on this
                device to set a new password.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/signin')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>BACK TO SIGN IN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => setSent(false)}
                hitSlop={8}
              >
                <Text style={styles.resendText}>Use a different email</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <>
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
                  returnKeyType="done"
                  onSubmitEditing={handleSendReset}
                />
              </Card>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSendReset}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : (
                  <Text style={styles.primaryBtnText}>SEND RESET LINK</Text>
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
  authCard: { padding: 20, marginTop: 24 },
  sentCard: { padding: 24, marginTop: 24, alignItems: 'center' },
  sentIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(79, 195, 247, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sentTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.frost,
    letterSpacing: 1.5,
  },
  sentBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
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
  primaryBtn: {
    marginTop: 24,
    width: '100%',
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
  resendBtn: { marginTop: 16, padding: 6 },
  resendText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.blue },
});
