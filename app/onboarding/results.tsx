import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useOnboardingStore } from '@/store/onboarding';
import { getBMICategory } from '@/constants/calculations';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, fonts } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Ember particles
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
          withTiming(-100, { duration, easing: Easing.out(Easing.quad) }),
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
        { left: x, bottom: 100, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

function AnimatedNumber({
  target,
  duration,
  delay,
  style,
  decimals = 0,
}: {
  target: number;
  duration: number;
  delay: number;
  style: object;
  decimals?: number;
}) {
  const [display, setDisplay] = React.useState('0');

  useEffect(() => {
    if (target <= 0) {
      setDisplay('0');
      return;
    }

    let rafId = 0;
    let active = true;
    const delayTimer = setTimeout(() => {
      if (!active) return;
      const startTime = Date.now();
      const tick = () => {
        if (!active) return;
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / Math.max(duration, 1), 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = target * eased;
        setDisplay(
          decimals > 0 ? current.toFixed(decimals) : String(Math.round(current))
        );
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      active = false;
      clearTimeout(delayTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, duration, delay, decimals]);

  return <Text style={style}>{display}</Text>;
}

function getBMICategoryColor(bmi: number): string {
  if (bmi < 18.5) return colors.blue;
  if (bmi < 25) return '#3FB950';
  if (bmi < 30) return colors.gold;
  return colors.red;
}

function getBMICategoryTextColor(bmi: number): string {
  if (bmi >= 30) return colors.white;
  return colors.black;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { bmi, calories, protein, carbs, fat, calculateResults } = useOnboardingStore();

  useEffect(() => {
    calculateResults();
  }, []);

  // Entrance animations
  const topLabelOpacity = useSharedValue(0);
  const bmiCardY = useSharedValue(30);
  const bmiCardOpacity = useSharedValue(0);
  const dividerOpacity = useSharedValue(0);
  const calCardY = useSharedValue(30);
  const calCardOpacity = useSharedValue(0);
  const macroOpacity = useSharedValue(0);
  const bottomOpacity = useSharedValue(0);

  useEffect(() => {
    topLabelOpacity.value = withTiming(1, { duration: 500 });
    bmiCardOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    bmiCardY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    dividerOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    calCardOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    calCardY.value = withDelay(1000, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    macroOpacity.value = withDelay(1400, withTiming(1, { duration: 400 }));
    bottomOpacity.value = withDelay(1600, withTiming(1, { duration: 400 }));
  }, []);

  const topLabelStyle = useAnimatedStyle(() => ({ opacity: topLabelOpacity.value }));
  const bmiCardStyle = useAnimatedStyle(() => ({
    opacity: bmiCardOpacity.value,
    transform: [{ translateY: bmiCardY.value }],
  }));
  const dividerStyle = useAnimatedStyle(() => ({ opacity: dividerOpacity.value }));
  const calCardStyle = useAnimatedStyle(() => ({
    opacity: calCardOpacity.value,
    transform: [{ translateY: calCardY.value }],
  }));
  const macroStyle = useAnimatedStyle(() => ({ opacity: macroOpacity.value }));
  const bottomStyle = useAnimatedStyle(() => ({ opacity: bottomOpacity.value }));

  const bmiCategory = getBMICategory(bmi);
  const bmiColor = getBMICategoryColor(bmi);
  const bmiTextColor = getBMICategoryTextColor(bmi);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.black} />

      {PARTICLES.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      <SafeAreaView style={styles.safeArea}>
        <Animated.Text style={[styles.topLabel, topLabelStyle]}>
          YOUR WARRIOR PROFILE
        </Animated.Text>

        {/* BMI Card */}
        <Animated.View style={[{ paddingHorizontal: 24, marginTop: 24 }, bmiCardStyle]}>
          <Card glowColor="gold" style={styles.bmiCard}>
            <Text style={styles.cardLabel}>BODY MASS INDEX</Text>
            <View style={styles.bmiRow}>
              <AnimatedNumber
                target={bmi}
                duration={1000}
                delay={300}
                style={styles.bmiNumber}
                decimals={1}
              />
              <View
                style={[styles.bmiCategoryBadge, { backgroundColor: bmiColor }]}
              >
                <Text style={[styles.bmiCategoryText, { color: bmiTextColor }]}>
                  {bmiCategory}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Gold divider */}
        <Animated.View style={[styles.dividerWrap, dividerStyle]}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerPlus}>
            <Text style={styles.dividerPlusText}>+</Text>
          </View>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Calorie Card */}
        <Animated.View style={[{ paddingHorizontal: 24 }, calCardStyle]}>
          <Card glowColor="blue" style={styles.calCard}>
            <Text style={styles.cardLabel}>DAILY CALORIE TARGET</Text>
            <AnimatedNumber
              target={calories}
              duration={1200}
              delay={400}
              style={styles.calorieNumber}
            />
            <Text style={styles.calorieUnit}>calories per day</Text>

            {/* Macro row */}
            <Animated.View style={[styles.macroRow, macroStyle]}>
              {[
                { label: 'Protein', value: protein, dot: colors.gold },
                { label: 'Carbs', value: carbs, dot: colors.blue },
                { label: 'Fat', value: fat, dot: colors.muted },
              ].map((m) => (
                <View key={m.label} style={styles.macroCol}>
                  <View style={[styles.macroDot, { backgroundColor: m.dot }]} />
                  <Text style={styles.macroValue}>{m.value}g</Text>
                  <Text style={styles.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </Animated.View>
          </Card>
        </Animated.View>

        {/* Bottom */}
        <Animated.View style={[styles.bottomSection, bottomStyle]}>
          <Text style={styles.bottomNote}>
            Based on your profile. We'll help you hit these every day.
          </Text>
          <Button
            label="LET'S BUILD YOUR LEGEND →"
            onPress={() => router.push('/onboarding/account')}
            variant="gold"
            fullWidth
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  particle: { position: 'absolute', zIndex: 0 },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  topLabel: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.gold,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 24,
  },
  bmiCard: { padding: 20 },
  cardLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bmiNumber: {
    fontFamily: fonts.display,
    fontSize: 72,
    color: colors.frost,
    lineHeight: 72,
  },
  bmiCategoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bmiCategoryText: {
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gold,
    opacity: 0.3,
  },
  dividerPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  dividerPlusText: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.gold,
    lineHeight: 22,
  },
  calCard: { padding: 20 },
  calorieNumber: {
    fontFamily: fonts.display,
    fontSize: 72,
    color: colors.blue,
    lineHeight: 72,
  },
  calorieUnit: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  macroCol: { alignItems: 'center', gap: 4 },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  macroValue: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.frost,
  },
  macroLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 14,
  },
  bottomNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginHorizontal: 8,
    lineHeight: 19,
  },
});
