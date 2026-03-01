import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows } from '@/lib/theme';

interface SearchPillProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

export function SearchPill({
  value,
  onChangeText,
  placeholder = 'Search Chicago...',
  onClear,
  onFocus,
  onBlur,
  style,
}: SearchPillProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.pill,
        focused && styles.pillFocused,
        style,
      ]}
    >
      <Search size={18} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          hitSlop={8}
        >
          <X size={16} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
  },
  pillFocused: {
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    outlineStyle: 'none',
  } as any,
});
