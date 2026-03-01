import React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type PressableProps,
} from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme';

type IconButtonVariant = 'primary' | 'ghost' | 'outline' | 'surface';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  badge?: number;
  style?: ViewStyle;
}

const DIM: Record<IconButtonSize, number> = { sm: 36, md: 44, lg: 52 };

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  active,
  badge,
  style,
  ...rest
}: IconButtonProps) {
  const dim = DIM[size];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { width: dim, height: dim, borderRadius: dim / 2 },
        variantStyles[variant],
        active && styles.active,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {icon}
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
});

const variantStyles: Record<IconButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    ...shadows.sm,
  },
  surface: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
};
