import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Compass, UtensilsCrossed, TreePine, Music, Palette,
  Calendar, ShoppingBag, HeartHandshake,
} from 'lucide-react-native';
import { useExploreStore } from '@/stores/explore-store';
import type { DiscoverCategory } from '@/lib/types';
import { colors, fonts, spacing } from '@/lib/theme';

interface CategoryDef {
  key: DiscoverCategory;
  label: string;
  Icon: typeof Compass;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'All', Icon: Compass },
  { key: 'food_drink', label: 'Food & Drink', Icon: UtensilsCrossed },
  { key: 'outdoors', label: 'Outdoors', Icon: TreePine },
  { key: 'entertainment', label: 'Entertainment', Icon: Music },
  { key: 'arts_culture', label: 'Arts & Culture', Icon: Palette },
  { key: 'events', label: 'Events', Icon: Calendar },
  { key: 'shopping', label: 'Shopping', Icon: ShoppingBag },
  { key: 'volunteering', label: 'Volunteering', Icon: HeartHandshake },
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
            <cat.Icon
              size={22}
              color={isActive ? colors.primary : colors.textTertiary}
              strokeWidth={isActive ? 2.2 : 1.6}
            />
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
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 2,
  },
  item: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minWidth: 56,
  },
  label: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: fonts.medium,
    marginTop: spacing.xs,
  },
  labelActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  underline: {
    height: 2,
    width: '100%' as unknown as number,
    marginTop: spacing.xs,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: colors.primary,
  },
});
