// Save/unsave a spot — simplified for saved_spots schema
// Owner: Person 4 (Collections + Saves)

import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { EntityType } from '@/lib/types';

interface AddToCollectionProps {
  visible: boolean;
  entityType: EntityType;
  entityId: string;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onClose: () => void;
}

export default function AddToCollection({
  visible,
  entityType,
  isSaved,
  onSave,
  onUnsave,
  onClose,
}: AddToCollectionProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSaved ? 'Remove from Saved' : 'Save this spot'}</Text>
      <Pressable style={styles.button} onPress={isSaved ? onUnsave : onSave}>
        <Text style={styles.buttonText}>{isSaved ? 'Unsave' : 'Save'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  button: { backgroundColor: '#333', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
