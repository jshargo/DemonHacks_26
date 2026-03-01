import { useCallback } from 'react';
import { View, Text, FlatList, Switch, Pressable, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { useExploreStore } from '@/stores/explore-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFilterStore } from '@/stores/filter-store';
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

  const openModal = useFilterStore((s) => s.openModal);
  const activeCount = useFilterStore((s) => s.activeCount);
  const filterCount = activeCount();

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
      <View style={styles.controlRow}>
        {/* Filters button */}
        <Pressable style={styles.filtersBtn} onPress={openModal}>
          <Text style={styles.filtersBtnIcon}>☰</Text>
          <Text style={styles.filtersBtnText}>Filters</Text>
          {filterCount > 0 && (
            <View style={styles.filtersBadge}>
              <Text style={styles.filtersBadgeText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Search as I move</Text>
          <Switch
            value={searchAsIMove}
            onValueChange={setSearchAsIMove}
            trackColor={{ false: '#ccc', true: '#1a1a2e' }}
          />
        </View>
      </View>
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
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  filtersBtnIcon: {
    fontSize: 14,
    color: '#1a1a2e',
  },
  filtersBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  filtersBadge: {
    backgroundColor: '#1a1a2e',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filtersBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    color: '#666',
  },
  columnWrapper: {
    gap: spacing.md,
  },
  columnItem: {
    flex: 1,
  },
});
