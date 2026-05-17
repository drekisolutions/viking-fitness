import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';

interface MacroRingProps {
  label: string;
  grams: number;
  percentage: number;
  color: string;
  size?: number;
}

export function MacroRing({
  label,
  grams,
  percentage,
  color,
  size = 90,
}: MacroRingProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(percentage / 100, 1));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <View
          style={[
            styles.ringBackground,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: colors.border,
            },
          ]}
        />
        <View style={[styles.centerContent, { width: size, height: size }]}>
          <Text style={[styles.grams, { color }]}>{grams}g</Text>
          <Text style={styles.pct}>{Math.round(percentage)}%</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBackground: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grams: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 20,
  },
  pct: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
