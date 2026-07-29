import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { fetchAppProfile } from '@/lib/session';
import { useUserStore } from '@/store/user';
import { colors, fonts } from '@/constants/theme';

export default function SuccessScreen() {
  const router = useRouter();
  const { setProfile, profile } = useUserStore();

  useEffect(() => {
    const syncAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Re-fetch profile — the webhook should have flipped plan to premium by now.
          const profileData = await fetchAppProfile(
            session.user.id,
            session.user.email || '',
          );
          if (profileData) setProfile(profileData);
        }
      } catch (_) {
        // Ignore, just redirect
      }

      // Give the user a moment to see the success message, then enter the app
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2500);
    };

    syncAndRedirect();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚔️</Text>
      <Text style={styles.title}>WELCOME, WARRIOR</Text>
      <Text style={styles.subtitle}>Your premium battle pass is active.</Text>
      <Text style={styles.subtitle}>Entering the forge...</Text>
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
  },
});
