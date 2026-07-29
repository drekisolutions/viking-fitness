import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useUserStore } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

export default function Index() {
  const { profile, setProfile } = useUserStore();
  const { initFromProfile } = useOnboardingStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (dbProfile && mounted) {
            const profileData = {
              id: session.user.id,
              name: dbProfile.name || 'Warrior',
              email: session.user.email || '',
              age: dbProfile.age || 25,
              sex: (dbProfile.sex as 'male' | 'female') || 'male',
              heightFt: dbProfile.height_ft || 5,
              heightIn: dbProfile.height_in || 10,
              weightLbs: dbProfile.weight_lbs || 180,
              goal: dbProfile.goal || 'build',
              mealPlan: dbProfile.meal_plan || 'balanced',
              calories: dbProfile.calories || 0,
              protein: dbProfile.protein || 0,
              carbs: dbProfile.carbs || 0,
              fat: dbProfile.fat || 0,
              bmi: dbProfile.bmi || 0,
              plan: (dbProfile.plan as 'free' | 'premium') || 'free',
              onboardingComplete: dbProfile.onboarding_complete ?? false,
            };
            setProfile(profileData);
            // Seed the onboarding store so macro/goal data is available
            // across tabs without requiring re-onboarding on every restart
            initFromProfile(profileData);
          }
        }
      } catch (_) {
        // Treat errors as logged-out
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkSession();
    return () => { mounted = false; };
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (profile?.onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
