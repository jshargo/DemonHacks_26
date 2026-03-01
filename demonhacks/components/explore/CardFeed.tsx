import { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { useExploreStore } from '@/stores/explore-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import type { DiscoverItem } from '@/lib/types';
import DiscoverCard from './DiscoverCard';
import { colors, typography, spacing } from '@/lib/theme';

interface CardFeedProps {
  items: DiscoverItem[];
  count: number;
  onItemPress: (item: DiscoverItem) => void;
  numColumns?: number;
}

export default function CardFeed({ items, count, onItemPress, numColumns = 1 }: CardFeedProps) {
  const hoveredPinId = useExploreStore((s) => s.hoveredPinId);
  const setHoveredItemId = useExploreStore((s) => s.setHoveredItemId);

  const isSaved = useCollectionStore((s) => s.isSaved);
  const addItem = useCollectionStore((s) => s.addItem);
  const removeItem = useCollectionStore((s) => s.removeItem);
  const findSavedItem = useCollectionStore((s) => s.findSavedItem);
  const session = useAuthStore((s) => s.session);

  const handleToggleSave = useCallback(
    (item: DiscoverItem) => {
      if (!session) return;
      const userId = session.user.id;

      const existing = findSavedItem(item.id);
      if (existing) {
        removeItem(existing.id);
      } else {
        addItem(userId, item.entityType, item.id);
      }
    },
    [session, findSavedItem, addItem, removeItem],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<DiscoverItem>) => (
      <View style={numColumns > 1 ? styles.columnItem : undefined}>
        <DiscoverCard
          item={item}
          onPress={() => onItemPress(item)}
          onHover={() => setHoveredItemId(item.id)}
          onHoverEnd={() => setHoveredItemId(null)}
          isHighlighted={hoveredPinId === item.id}
          isSaved={isSaved(item.id)}
          onToggleSave={() => handleToggleSave(item)}
        />
      </View>
    ),
    [onItemPress, setHoveredItemId, hoveredPinId, isSaved, handleToggleSave, numColumns],
  );

  const keyExtractor = useCallback((item: DiscoverItem) => item.id, []);

  const ListHeader = (
    <View style={styles.header}>
      <Text style={styles.countText}>
        {count >= 1000 ? '999+' : count} {count === 1 ? 'thing' : 'things'} to do in this area
      </Text>
    </View>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.list}
      key={numColumns}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing.lg,
  },
  countText: {
    ...typography.headingMd,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  columnItem: {
    flex: 1,
  },
});
