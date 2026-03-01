// BikeToggle — Standalone toggle button for the Chicago bike routes layer.
// Positioned bottom-left, separate from the CTA overlay buttons.

import { Pressable, Text, View, StyleSheet } from 'react-native';

interface Props {
  active: boolean;
  onPress: () => void;
}

export default function BikeToggle({ active, onPress }: Props) {
  return (
    <Pressable style={[styles.btn, active && styles.btnActive]} onPress={onPress}>
      <Text style={styles.icon}>🛣️</Text>
      {active && <View style={styles.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  btnActive: {
    backgroundColor: '#1a1a2e',
  },
  icon: {
    fontSize: 20,
  },
  accent: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2ecc71',
  },
});
