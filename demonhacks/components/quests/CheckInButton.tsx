// TODO: GPS-verified check-in button
// Owner: Person 3 (Quests + Check-ins)
// - Shows "Check In" when user is within CHECK_IN_RADIUS_METERS of the stop
// - Disabled with distance hint when too far away
// - Uses useCheckIn hook for proximity verification

import { Pressable, Text, StyleSheet } from 'react-native';

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
    backgroundColor: '#00C49A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabled: { backgroundColor: '#ccc' },
  completed: { backgroundColor: '#999' },
  label: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
