import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
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
          // Re-fetch profile — webhook should have upgraded plan to premium by now
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (dbProfile) {
            setProfile({
              id: session.user.id,
              name: dbProfile.name || 'Warrior',
              email: session.user.email || '',
              age: dbProfile.age || 25,
              sex: dbProfile.sex || 'male',
              heightFt: dbProfile.height_ft || 5,
              heightIn: dbProfile.height_in || 10,
              weightLbs: dbProfile.weight_lbs || 180,
              goal: dbProfile.goal || 'build',
              mealPlan: dbProfile.meal_plan || 'balanced',
              calories: dbProfile.calories || 0,
              protein: dbProfile.protein || 0,
              carbs: dbProfile.carbs || 0,
              fat: dbProfile.fat || 0,
              onboardingComplete: dbProfile.onboarding_complete || true,
            });
          }
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
