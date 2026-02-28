// Collection picker modal — lets user save a place/event to a named collection
// Owner: Person 4 (Collections + Saves)

import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import type { EntityType, Collection } from '@/lib/types';

interface AddToCollectionProps {
  visible: boolean;
  entityType: EntityType;
  entityId: string;
  collections: Collection[];
  onSelect: (collectionId: string) => void;
  onClose: () => void;
}

export default function AddToCollection({
  visible,
  collections,
  onSelect,
  onClose,
}: AddToCollectionProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Save to Collection</Text>
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.option} onPress={() => onSelect(item.id)}>
            <Text style={styles.optionText}>{item.name}</Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: { fontSize: 15 },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: '#999', fontSize: 15 },
});
