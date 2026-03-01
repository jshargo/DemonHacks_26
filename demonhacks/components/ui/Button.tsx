import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
  type PressableProps,
} from 'react-native';
import { colors, fonts, spacing, radii } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 16 };
const H_PADDING: Record<ButtonSize, number> = { sm: 14, md: 20, lg: 24 };

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  leftIcon,
  loading,
  disabled,
  fullWidth,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: H_PADDING[size],
        },
        variantStyles[variant],
        pressed && !isDisabled && pressedStyles[variant],
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconWrap}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              { fontSize: FONT_SIZE[size] },
              textStyles[variant],
              isDisabled && styles.disabledText,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    marginRight: 2,
  },
  text: {
    fontFamily: fonts.bold,
  },
  fullWidth: {
    width: '100%' as unknown as number,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    opacity: 0.7,
  },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
};

const pressedStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primaryDark },
  secondary: { backgroundColor: colors.primaryLight },
  ghost: { backgroundColor: colors.primaryLight },
  danger: { backgroundColor: '#CC2F27' },
};

const textStyles: Record<ButtonVariant, { color: string }> = {
  primary: { color: colors.textInverse },
  secondary: { color: colors.primary },
  ghost: { color: colors.primary },
  danger: { color: colors.textInverse },
};
