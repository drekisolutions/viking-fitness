import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: 'blue' | 'gold' | 'none';
}

export function Card({ children, style, glowColor = 'none' }: CardProps) {
  const glowStyle: ViewStyle =
    glowColor === 'gold'
      ? {
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        }
      : glowColor === 'blue'
      ? {
          shadowColor: colors.blue,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 6,
        }
      : {};

  return (
    <View style={[styles.card, glowStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
});
