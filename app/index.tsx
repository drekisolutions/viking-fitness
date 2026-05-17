import { Redirect } from 'expo-router';
import { useUserStore } from '@/store/user';

export default function Index() {
  const profile = useUserStore((s) => s.profile);

  if (profile?.onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
