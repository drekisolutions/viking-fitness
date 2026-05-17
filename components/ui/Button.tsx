import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = true,
  loading = false,
}: ButtonProps) {
  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    fullWidth ? styles.fullWidth : styles.contentWidth,
    disabled || loading ? styles.disabled : {},
  ];

  const textStyle: TextStyle[] = [styles.baseText, styles[`${variant}Text`]];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'gold' ? colors.black : colors.blue}
          size="small"
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  contentWidth: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.4,
  },
  primary: {
    backgroundColor: colors.blue,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.blue,
  },
  gold: {
    backgroundColor: colors.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  baseText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  primaryText: {
    color: colors.black,
  },
  secondaryText: {
    color: colors.blue,
  },
  goldText: {
    color: colors.black,
  },
  ghostText: {
    color: colors.muted,
  },
});
