import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { inject } from '@vercel/analytics';
import { useFonts } from 'expo-font';
import {
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  Oswald_300Light,
  Oswald_400Regular,
  Oswald_600SemiBold,
} from '@expo-google-fonts/oswald';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import {
  Cinzel_400Regular,
  Cinzel_700Bold,
} from '@expo-google-fonts/cinzel';
import * as SplashScreen from 'expo-splash-screen';
import { colors, fonts } from '@/constants/theme';
import { initAnalytics } from '@/lib/analytics';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    initAnalytics();
    if (Platform.OS === 'web') {
      inject();
    }
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    Oswald_300Light,
    Oswald_400Regular,
    Oswald_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Cinzel_400Regular,
    Cinzel_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>VIKING FITNESS</Text>
        <Text style={styles.loadingTagline}>Forge Your Legacy</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.black } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="landing" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="signin" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="glp1" />
        <Stack.Screen name="coach" />
        <Stack.Screen name="warband" />
        <Stack.Screen name="workout-session" />
        <Stack.Screen name="success" />
        <Stack.Screen name="upgrade" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 48,
    color: colors.gold,
    letterSpacing: 4,
  },
  loadingTagline: {
    fontFamily: 'Oswald_300Light',
    fontSize: 16,
    color: colors.muted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
