import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useUserStore } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import { supabase } from '@/lib/supabase';
import { fetchAppProfile } from '@/lib/session';
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
          const profileData = await fetchAppProfile(
            session.user.id,
            session.user.email || '',
          );
          if (profileData && mounted) {
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
