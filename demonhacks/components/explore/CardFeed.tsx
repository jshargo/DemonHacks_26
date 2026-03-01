import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, FlatList, Switch, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { useExploreStore } from '@/stores/explore-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import type { DiscoverItem } from '@/lib/types';
import DiscoverCard from './DiscoverCard';

interface CardFeedProps {
  items: DiscoverItem[];
  count: number;
  onItemPress: (item: DiscoverItem) => void;
  numColumns?: number;
}

export interface CardFeedHandle {
  scrollToItem: (itemId: string) => void;
}

const CardFeed = forwardRef<CardFeedHandle, CardFeedProps>(function CardFeed(
  { items, count, onItemPress, numColumns = 1 },
  ref,
) {
  const listRef = useRef<FlatList<DiscoverItem>>(null);

  const searchAsIMove = useExploreStore((s) => s.searchAsIMove);
  const setSearchAsIMove = useExploreStore((s) => s.setSearchAsIMove);
  const hoveredPinId = useExploreStore((s) => s.hoveredPinId);
  const setHoveredItemId = useExploreStore((s) => s.setHoveredItemId);

  const isSaved = useCollectionStore((s) => s.isSaved);
  const addItem = useCollectionStore((s) => s.addItem);
  const removeItem = useCollectionStore((s) => s.removeItem);
  const collections = useCollectionStore((s) => s.collections);
  const collectionItems = useCollectionStore((s) => s.items);
  const session = useAuthStore((s) => s.session);

  const handleScrollToIndexFailed = useCallback(
    ({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: Math.max(0, index * averageItemLength),
        animated: true,
      });

      setTimeout(() => {
        listRef.current?.scrollToIndex({ index, animated: true, viewOffset: 16 });
      }, 80);
    },
    [],
  );

  /** Scroll to a specific item by ID (called when a pin is clicked on the map) */
  const scrollToItem = useCallback(
    (itemId: string) => {
      const index = items.findIndex((i) => i.id === itemId);
      if (index < 0 || !listRef.current) return;

      try {
        listRef.current.scrollToIndex({ index, animated: true, viewOffset: 16 });
      } catch {
        handleScrollToIndexFailed({ index, averageItemLength: 260 });
      }
    },
    [handleScrollToIndexFailed, items],
  );

  useImperativeHandle(ref, () => ({ scrollToItem }), [scrollToItem]);

  const handleToggleSave = useCallback(
    (item: DiscoverItem) => {
      if (!session) return;
      const favorites = collections.find((c) => c.name === 'Favorites');
      if (!favorites) return;

      const saved = isSaved(item.entityType, item.id);
      if (saved) {
        const ci = collectionItems.find(
          (i) => i.item_type === item.entityType && i.item_id === item.id,
        );
        if (ci) removeItem(ci.id);
      } else {
        addItem(favorites.id, item.entityType, item.id);
      }
    },
    [session, collections, collectionItems, isSaved, addItem, removeItem],
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
          isSaved={isSaved(item.entityType, item.id)}
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
        {count} {count === 1 ? 'thing' : 'things'} to do in this area
      </Text>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Search as I move the map</Text>
        <Switch
          value={searchAsIMove}
          onValueChange={setSearchAsIMove}
          trackColor={{ false: '#ccc', true: '#1a1a2e' }}
        />
      </View>
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.list}
      key={numColumns}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={handleScrollToIndexFailed}
    />
  );
});

export default CardFeed;

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  countText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 13,
    color: '#666',
  },
  columnWrapper: {
    gap: 12,
  },
  columnItem: {
    flex: 1,
  },
});
