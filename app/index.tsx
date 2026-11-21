import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useUserStore } from '@/store/user';
import { useOnboardingStore } from '@/store/onboarding';
import { useTrackerStore } from '@/store/tracker';
import { supabase } from '@/lib/supabase';
import { fetchAppProfile } from '@/lib/session';
import { colors } from '@/constants/theme';

export default function Index() {
  const { profile, _hasHydrated, setProfile } = useUserStore();
  const { initFromProfile } = useOnboardingStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const profileData = await fetchAppProfile(
            session.user.id,
            session.user.email || ''
          );
          if (profileData && mounted) {
            setProfile(profileData);
            initFromProfile(profileData);
            await useTrackerStore.getState().hydrateFromSupabase(session.user.id);
          }
        }
      } catch (_) {
        // Treat errors as logged-out or fall back to persisted guest state
      } finally {
        if (mounted) setSessionChecked(true);
      }
    };

    checkSession();
    return () => {
      mounted = false;
    };
  }, [initFromProfile, setProfile]);

  if (!_hasHydrated || !sessionChecked) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.black,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (profile?.onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
