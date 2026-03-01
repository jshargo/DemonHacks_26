// Collections screen — shows user's named collections with saved places & events
// Owner: Person 4 (Collections + Saves)

import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useCollections } from '@/hooks/useCollections';

export default function CollectionsScreen() {
  const { collections, loading, deleteCollection } = useCollections();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Collections</Text>
      {loading && <Text style={styles.empty}>Loading...</Text>}
      {!loading && collections.length === 0 && (
        <Text style={styles.empty}>
          Save places and events to collections while exploring the map.
        </Text>
      )}
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.date}>
                Created {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            {item.name !== 'Favorites' && (
              <Pressable onPress={() => deleteCollection(item.id)}>
                <Text style={styles.remove}>Delete</Text>
              </Pressable>
            )}
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
  cardContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 12, color: '#999', marginTop: 2 },
  remove: { color: '#e74c3c', fontSize: 13, fontWeight: '500' },
});