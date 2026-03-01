// BikeToggle — Standalone toggle button for the Chicago bike routes layer.
// Positioned bottom-left, separate from the CTA overlay buttons.

import { Pressable, View, StyleSheet } from 'react-native';
import { Route } from 'lucide-react-native';
import { colors, spacing, shadows } from '@/lib/theme';

interface Props {
  active: boolean;
  onPress: () => void;
}

export default function BikeToggle({ active, onPress }: Props) {
  return (
    <Pressable style={[styles.btn, active && styles.btnActive]} onPress={onPress}>
      <Route size={20} color={active ? colors.textInverse : colors.textPrimary} />
      {active && <View style={styles.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    overflow: 'hidden',
  },
  btnActive: {
    backgroundColor: colors.primary,
  },
  accent: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
});
