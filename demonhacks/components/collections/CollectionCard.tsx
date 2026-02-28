// Collection card for list views
// Owner: Person 4 (Collections + Saves)

import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Collection } from '@/lib/types';

interface CollectionCardProps {
  collection: Collection;
  onPress: (collection: Collection) => void;
}

export default function CollectionCard({ collection, onPress }: CollectionCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(collection)}>
      <Text style={styles.name}>{collection.name}</Text>
      <Text style={styles.date}>
        Created {new Date(collection.created_at).toLocaleDateString()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 12, color: '#999', marginTop: 2 },
});
