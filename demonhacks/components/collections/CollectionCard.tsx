// Saved spot card
// Owner: Person 4 (Collections + Saves)

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ENTITY_TYPES } from '@/lib/constants';
import type { SavedSpot } from '@/lib/types';

interface CollectionCardProps {
  savedSpot: SavedSpot;
  onPress: (savedSpot: SavedSpot) => void;
}

export default function CollectionCard({ savedSpot, onPress }: CollectionCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(savedSpot)}>
      <View style={[styles.badge, { backgroundColor: ENTITY_TYPES[savedSpot.entity_type]?.color }]}>
        <Text style={styles.badgeText}>{savedSpot.entity_type}</Text>
      </View>
      <Text style={styles.id}>{savedSpot.entity_id}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  id: { fontSize: 13, color: '#666', flex: 1 },
});
