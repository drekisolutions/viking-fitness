import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: Math.random() * (width - 20) + 10,
  size: 4 + Math.random() * 4,
  color: Math.random() > 0.5 ? colors.gold : colors.red,
  opacity: 0.3 + Math.random() * 0.3,
  duration: 3000 + Math.random() * 2000,
  delay: Math.random() * 2000,
}));

function Particle({ x, size, color, opacity, duration, delay }: (typeof PARTICLES)[0]) {
  const translateY = useSharedValue(0);
  const particleOpacity = useSharedValue(0);

  useEffect(() => {
    particleOpacity.value = withDelay(delay, withTiming(opacity, { duration: 500 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-80 - Math.random() * 60, { duration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: x, bottom: 80, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

function VikingHelmet() {
  return (
    <View style={styles.helmetContainer}>
      {/* Dome */}
      <View style={styles.helmetDome} />
      {/* Brim */}
      <View style={styles.helmetBrim} />
      {/* Nose guard */}
      <View style={styles.helmetNoseGuard} />
      {/* Gold accent band */}
      <View style={styles.helmetGoldBand} />
      {/* Left horn */}
      <View style={styles.helmetHornLeft} />
      {/* Right horn */}
      <View style={styles.helmetHornRight} />
    </View>
  );
}

export default function OnboardingWelcome() {
  const router = useRouter();
  const [phase, setPhase] = useState<'splash' | 'welcome'>('splash');

  // Phase 1 animations
  const splashOpacity = useSharedValue(0);
  // Phase 2 animations
  const welcomeOpacity = useSharedValue(0);
  const titleY = useSharedValue(30);
  const bottomY = useSharedValue(40);

  useEffect(() => {
    // Splash fade in
    splashOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));

    // Transition to welcome after 2000ms
    const timer = setTimeout(() => {
      setPhase('welcome');
      welcomeOpacity.value = withTiming(1, { duration: 600 });
      titleY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
      bottomY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const splashStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [{ translateY: bottomY.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor={colors.black} />

      {/* Ember particles — always visible */}
      {PARTICLES.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      {/* Phase 1: Splash */}
      {phase === 'splash' && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.splashCenter, splashStyle]}>
          <VikingHelmet />
          <Text style={styles.splashTitle}>VIKING FITNESS</Text>
        </Animated.View>
      )}

      {/* Phase 2: Welcome */}
      {phase === 'welcome' && (
        <LinearGradient
          colors={['#0D1117', colors.black]}
          style={StyleSheet.absoluteFill}
        >
          {/* Nordic knotwork pattern */}
          <View style={styles.knotworkPattern} pointerEvents="none">
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.knotLine,
                  {
                    top: 60 + i * 40,
                    width: 200 + (i % 3) * 60,
                    left: (i % 2 === 0) ? -20 : width - 180 - (i % 3) * 60,
                  },
                ]}
              />
            ))}
          </View>

          <SafeAreaView style={styles.safeArea}>
            {/* Upper 60% */}
            <Animated.View style={[styles.upperSection, titleStyle]}>
              <Text style={styles.readyLabel}>ARE YOU READY TO</Text>
              <Text style={styles.forgeText}>FORGE YOUR</Text>
              <Text style={styles.legendText}>LEGEND?</Text>
              <Text style={styles.tagline}>
                Build the body. Earn the rank. Become the warrior.
              </Text>
            </Animated.View>

            {/* Bottom CTA */}
            <Animated.View style={[styles.bottomSection, bottomStyle]}>
              <TouchableOpacity
                style={styles.beginBtn}
                onPress={() => router.push('/onboarding/profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.beginBtnText}>BEGIN THE ASCENT</Text>
              </TouchableOpacity>

              <View style={styles.signinRow}>
                <Text style={styles.signinText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/signin')}>
                  <Text style={styles.signinLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  particle: {
    position: 'absolute',
    zIndex: 10,
  },
  splashCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  helmetContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  helmetDome: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: 50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#2A2D32',
    borderWidth: 1.5,
    borderColor: '#3A3D45',
  },
  helmetBrim: {
    position: 'absolute',
    bottom: 14,
    width: 72,
    height: 12,
    backgroundColor: '#2A2D32',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3A3D45',
  },
  helmetNoseGuard: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 22,
    backgroundColor: '#2A2D32',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#3A3D45',
  },
  helmetGoldBand: {
    position: 'absolute',
    bottom: 25,
    width: 68,
    height: 4,
    backgroundColor: colors.gold,
    borderRadius: 2,
    opacity: 0.8,
  },
  helmetHornLeft: {
    position: 'absolute',
    top: 8,
    left: 0,
    width: 10,
    height: 28,
    backgroundColor: '#2A2D32',
    borderRadius: 5,
    transform: [{ rotate: '-25deg' }],
    borderWidth: 1,
    borderColor: '#3A3D45',
  },
  helmetHornRight: {
    position: 'absolute',
    top: 8,
    right: 0,
    width: 10,
    height: 28,
    backgroundColor: '#2A2D32',
    borderRadius: 5,
    transform: [{ rotate: '25deg' }],
    borderWidth: 1,
    borderColor: '#3A3D45',
  },
  splashTitle: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.gold,
    letterSpacing: 6,
  },
  knotworkPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
    overflow: 'hidden',
  },
  knotLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  upperSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  readyLabel: {
    fontFamily: fonts.headingLight,
    fontSize: 20,
    color: colors.muted,
    letterSpacing: 3,
    marginBottom: 4,
    textAlign: 'center',
  },
  forgeText: {
    fontFamily: fonts.display,
    fontSize: 56,
    color: colors.frost,
    lineHeight: 56,
    textAlign: 'center',
  },
  legendText: {
    fontFamily: fonts.display,
    fontSize: 56,
    color: colors.gold,
    lineHeight: 56,
    marginBottom: 20,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
  },
  beginBtn: {
    height: 56,
    backgroundColor: colors.gold,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginBtnText: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.black,
    letterSpacing: 1,
  },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
  },
  signinText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  signinLink: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.blue,
  },
});
