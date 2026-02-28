import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ENTITY_TYPES, ENTITY_TYPE_KEYS } from '@/lib/constants';
import type { EntityType } from '@/lib/types';

interface CategoryChipsProps {
  activeCategories: Set<EntityType>;
  onToggle: (entityType: EntityType) => void;
}

export default function CategoryChips({ activeCategories, onToggle }: CategoryChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {ENTITY_TYPE_KEYS.map((key) => {
        const active = activeCategories.has(key);
        return (
          <Pressable
            key={key}
            style={[styles.chip, active && { backgroundColor: ENTITY_TYPES[key].color }]}
            onPress={() => onToggle(key)}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>
              {ENTITY_TYPES[key].label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  label: { fontSize: 13, color: '#333' },
  activeLabel: { color: '#fff' },
});
