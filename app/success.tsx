import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { fetchAppProfile } from '@/lib/session';
import { useUserStore } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import { useTrackerStore } from '@/store/tracker';
import { colors, fonts, radius } from '@/constants/theme';

const MAX_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 1500;

export default function SuccessScreen() {
  const router = useRouter();
  const { setProfile } = useUserStore();
  const { initFromProfile } = useOnboardingStore();
  const [statusText, setStatusText] = useState('Activating your battle pass...');
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const poll = async (attempt: number) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!session?.user) {
          timerRef.current = setTimeout(() => {
            if (mounted) router.replace('/(tabs)');
          }, 1200);
          return;
        }

        const profileData = await fetchAppProfile(
          session.user.id,
          session.user.email || '',
        );
        if (!mounted) return;

        if (profileData) {
          setProfile(profileData);
          initFromProfile(profileData);
          await useTrackerStore.getState().hydrateFromSupabase(session.user.id);
          if (profileData.plan === 'premium' || profileData.plan === 'pro') {
            setStatusText(
              profileData.plan === 'pro'
                ? 'Viking Pro active! Entering the forge...'
                : 'Battle pass active! Entering the forge...'
            );
            timerRef.current = setTimeout(() => {
              if (mounted) router.replace('/(tabs)');
            }, 900);
            return;
          }
        }
      } catch (_) {
        // Retry until timeout
      }

      if (!mounted) return;

      if (attempt < MAX_ATTEMPTS) {
        setStatusText(`Syncing subscription (${attempt}/${MAX_ATTEMPTS})...`);
        timerRef.current = setTimeout(() => {
          if (mounted) poll(attempt + 1);
        }, POLL_INTERVAL_MS);
      } else {
        setTimedOut(true);
        setStatusText('Payment received — store sync may take a few more seconds.');
      }
    };

    poll(1);

    return () => {
      mounted = false;
      clearTimer();
    };
  }, [initFromProfile, router, setProfile]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚔️</Text>
      <Text style={styles.title}>WELCOME, WARRIOR</Text>
      <Text style={styles.subtitle}>{statusText}</Text>
      {!timedOut ? (
        <ActivityIndicator color={colors.gold} size="small" style={{ marginTop: 12 }} />
      ) : (
        <TouchableOpacity
          style={styles.enterBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={styles.enterBtnText}>ENTER THE FORGE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.gold,
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.headingLight,
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 20,
  },
  enterBtn: {
    marginTop: 16,
    backgroundColor: colors.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.sm,
  },
  enterBtnText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.black,
    letterSpacing: 1.5,
  },
});
