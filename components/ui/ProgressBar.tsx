import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  color = colors.blue,
  height = 8,
  backgroundColor = colors.border,
  style,
}: ProgressBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(Math.max(value, 0), 1), {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor, borderRadius: 999 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          animatedStyle,
          { height, backgroundColor: color, borderRadius: 999 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
