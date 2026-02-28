// Bottom sheet for spot/pin detail
// Owner: Person 2 (Map + Spots)

import { View, Text, StyleSheet } from 'react-native';
import { ENTITY_TYPES } from '@/lib/constants';
import type { MapPin } from '@/lib/types';

interface SpotBottomSheetProps {
  pin: MapPin | null;
  onClose: () => void;
}

export default function SpotBottomSheet({ pin, onClose }: SpotBottomSheetProps) {
  if (!pin) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: ENTITY_TYPES[pin.entityType]?.color }]}>
        <Text style={styles.badgeText}>{ENTITY_TYPES[pin.entityType]?.label}</Text>
      </View>
      <Text style={styles.name}>{pin.name}</Text>
      {pin.type && <Text style={styles.type}>{pin.type}</Text>}
      {pin.description && <Text style={styles.desc}>{pin.description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  type: { fontSize: 14, color: '#666', textTransform: 'capitalize', marginBottom: 4 },
  desc: { fontSize: 14, color: '#555', marginTop: 4 },
});
