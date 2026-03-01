import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '@/lib/theme';

interface SubcategoryChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: object;
}

export function SubcategoryChip({ label, selected, onPress, style }: SubcategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    margin: spacing.xs,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.75,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.textInverse,
  },
});
