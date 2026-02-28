// Saved spots screen — shows user's bookmarked restaurants, events, activities
// Owner: Person 4 (Collections + Saves)

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSavedSpots } from '@/hooks/useSavedSpots';
import { ENTITY_TYPES } from '@/lib/constants';

export default function SavedScreen() {
  const { savedSpots, loading, unsaveSpot } = useSavedSpots();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Spots</Text>
      {loading && <Text style={styles.empty}>Loading...</Text>}
      {!loading && savedSpots.length === 0 && (
        <Text style={styles.empty}>
          Save spots while exploring the map to see them here.
        </Text>
      )}
      <FlatList
        data={savedSpots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.badge, { backgroundColor: ENTITY_TYPES[item.entity_type]?.color ?? '#333' }]}>
              <Text style={styles.badgeText}>{item.entity_type}</Text>
            </View>
            <Text style={styles.entityId}>{item.entity_id}</Text>
            <Pressable onPress={() => unsaveSpot(item.id)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  empty: { fontSize: 15, color: '#999', marginTop: 24, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  entityId: { flex: 1, fontSize: 13, color: '#666' },
  remove: { color: '#e74c3c', fontSize: 13, fontWeight: '500' },
});
