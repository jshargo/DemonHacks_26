// Spot card for list views
// Owner: Person 2 (Map + Spots)

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ENTITY_TYPES } from '@/lib/constants';
import type { MapPin } from '@/lib/types';

interface SpotCardProps {
  pin: MapPin;
  onPress: (pin: MapPin) => void;
}

export default function SpotCard({ pin, onPress }: SpotCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(pin)}>
      <Text style={styles.name}>{pin.name}</Text>
      <Text style={[styles.type, { color: ENTITY_TYPES[pin.entityType]?.color }]}>
        {ENTITY_TYPES[pin.entityType]?.label}
      </Text>
      {pin.type && <Text style={styles.subtype}>{pin.type}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  type: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  subtype: { fontSize: 12, color: '#999', marginTop: 2, textTransform: 'capitalize' },
});
