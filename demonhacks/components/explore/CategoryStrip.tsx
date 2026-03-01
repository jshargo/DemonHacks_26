import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useExploreStore } from '@/stores/explore-store';
import type { DiscoverCategory } from '@/lib/types';

interface CategoryDef {
  key: DiscoverCategory;
  label: string;
  emoji: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'All', emoji: '🗺' },
  { key: 'food_drink', label: 'Food & Drink', emoji: '🍽' },
  { key: 'outdoors', label: 'Outdoors', emoji: '🌳' },
  { key: 'entertainment', label: 'Entertainment', emoji: '🎭' },
  { key: 'arts_culture', label: 'Arts & Culture', emoji: '🎨' },
  { key: 'events', label: 'Events', emoji: '🎫' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍' },
  { key: 'volunteering', label: 'Volunteering', emoji: '🤝' },
];

export default function CategoryStrip() {
  const activeCategory = useExploreStore((s) => s.activeCategory);
  const setActiveCategory = useExploreStore((s) => s.setActiveCategory);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.key;
        return (
          <Pressable
            key={cat.key}
            style={styles.item}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text style={styles.emoji}>{cat.emoji}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {cat.label}
            </Text>
            <View style={[styles.underline, isActive && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: 16,
    gap: 20,
    paddingBottom: 2,
  },
  item: {
    alignItems: 'center',
    paddingVertical: 8,
    minWidth: 56,
  },
  emoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  labelActive: {
    color: '#1a1a2e',
    fontWeight: '700',
  },
  underline: {
    height: 2,
    width: '100%',
    marginTop: 6,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: '#1a1a2e',
  },
});
