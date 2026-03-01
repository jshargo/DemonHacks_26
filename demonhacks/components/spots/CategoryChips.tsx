import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ENTITY_TYPES, ENTITY_TYPE_KEYS, PLACE_CATEGORIES, PLACE_CATEGORY_KEYS } from '@/lib/constants';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import type { EntityType, PlaceCategory } from '@/lib/types';

interface CategoryChipsProps {
  activeCategories: Set<EntityType>;
  activePlaceCategories?: Set<PlaceCategory>;
  onToggle: (entityType: EntityType) => void;
  onTogglePlaceCategory?: (category: PlaceCategory) => void;
}

export default function CategoryChips({
  activeCategories,
  activePlaceCategories,
  onToggle,
  onTogglePlaceCategory,
}: CategoryChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {/* Entity type chips (Places / Events) */}
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

      {/* Place category chips (Food, Outdoors, etc.) */}
      {onTogglePlaceCategory && (
        <>
          <View style={styles.divider} />
          {PLACE_CATEGORY_KEYS.map((key) => {
            const active = activePlaceCategories?.has(key) ?? false;
            return (
              <Pressable
                key={key}
                style={[styles.chip, active && { backgroundColor: PLACE_CATEGORIES[key].color }]}
                onPress={() => onTogglePlaceCategory(key)}
              >
                <Text style={[styles.label, active && styles.activeLabel]}>
                  {PLACE_CATEGORIES[key].label}
                </Text>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  label: { fontSize: 13, fontFamily: fonts.medium, color: colors.textPrimary },
  activeLabel: { color: colors.textInverse },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
    marginVertical: 4,
  },
});
