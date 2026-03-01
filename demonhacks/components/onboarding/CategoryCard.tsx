import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';

interface CategoryCardProps {
  emoji: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

export function CategoryCard({ emoji, label, selected, disabled, onPress }: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled && !selected}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && !selected && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, disabled && !selected && styles.labelDisabled]}>{label}</Text>
      {selected && <View style={styles.checkDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1,
    margin: 5,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  cardDisabled: {
    opacity: 0.35,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  labelDisabled: {
    color: colors.textTertiary,
  },
  checkDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
});
