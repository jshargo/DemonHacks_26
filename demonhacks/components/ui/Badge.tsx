import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, fonts, spacing, radii } from '@/lib/theme';

type BadgeVariant = 'filled' | 'outlined' | 'subtle';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  text: string;
  color?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export function Badge({
  text,
  color = colors.primary,
  variant = 'filled',
  size = 'sm',
  style,
}: BadgeProps) {
  const bgColor =
    variant === 'filled'
      ? color
      : variant === 'subtle'
        ? color + '18' // ~10% opacity hex
        : 'transparent';

  const textColor =
    variant === 'filled' ? colors.textInverse : color;

  const borderColor = variant === 'outlined' ? color : 'transparent';

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: bgColor, borderColor },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1.5,
  },
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontFamily: fonts.bold,
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
});
