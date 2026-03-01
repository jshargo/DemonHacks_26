import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface CheckInButtonProps {
  isWithinRange: boolean;
  isCheckedIn: boolean;
  distanceMeters: number | null;
  onCheckIn: () => void;
}

export default function CheckInButton({
  isWithinRange,
  isCheckedIn,
  distanceMeters,
  onCheckIn,
}: CheckInButtonProps) {
  if (isCheckedIn) {
    return (
      <Pressable style={[styles.button, styles.completed]} disabled>
        <Text style={styles.label}>Checked In</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.button, !isWithinRange && styles.disabled]}
      onPress={onCheckIn}
      disabled={!isWithinRange}
    >
      <Text style={styles.label}>
        {isWithinRange
          ? 'Check In'
          : `${distanceMeters != null ? Math.round(distanceMeters) + 'm away' : 'Locating...'}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radii.md,
    alignItems: 'center',
  },
  disabled: { backgroundColor: colors.border },
  completed: { backgroundColor: colors.textTertiary },
  label: { color: colors.textInverse, fontFamily: fonts.bold, fontSize: 15 },
});
