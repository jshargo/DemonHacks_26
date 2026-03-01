// Saved items screen — shows all places and events the user has saved.
// Tap an item to navigate to it on the map.

import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCollections } from '@/hooks/useCollections';
import { useExploreStore } from '@/stores/explore-store';
import { PLACE_CATEGORIES } from '@/lib/constants';
import type { SavedItemWithPlace, PlaceCategory, DiscoverItem } from '@/lib/types';

export default function CollectionsScreen() {
  const router = useRouter();
  const { items, loading, removeItem } = useCollections();
  const openDetail = useExploreStore((s) => s.openDetail);

  const handleItemPress = useCallback(
    (item: SavedItemWithPlace) => {
      if (!item.place) return;

      const discoverItem: DiscoverItem = {
        id: item.item_id,
        entityType: item.item_type,
        name: item.place.name,
        lat: item.place.lat,
        lng: item.place.lng,
        category: item.place.category,
        subcategory: null,
        description: item.place.description,
        imageUrl: item.place.image_url,
        neighborhood: item.place.address ?? '',
        rating: null,
        priceRange: null,
        tags: [],
        startsAt: null,
        endsAt: null,
        venueName: null,
        attendingCount: null,
        websiteUrl: item.place.website_url,
      };

      openDetail(discoverItem);
      router.push('/');
    },
    [openDetail, router],
  );

  const getBadgeColor = (category: PlaceCategory): string =>
    PLACE_CATEGORIES[category]?.color ?? '#888';

  const getBadgeLabel = (category: PlaceCategory): string =>
    PLACE_CATEGORIES[category]?.label ?? 'Place';

  const renderItem = ({ item }: { item: SavedItemWithPlace }) => (
    <Pressable style={styles.itemRow} onPress={() => handleItemPress(item)}>
      {/* Thumbnail */}
      {item.place?.image_url ? (
        <Image
          source={{ uri: item.place.image_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}

      {/* Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.place?.name ?? 'Unknown Place'}
        </Text>
        {item.place?.category && (
          <View
            style={[styles.badge, { backgroundColor: getBadgeColor(item.place.category) }]}
          >
            <Text style={styles.badgeText}>{getBadgeLabel(item.place.category)}</Text>
          </View>
        )}
      </View>

      {/* Remove */}
      <Pressable
        onPress={() => removeItem(item.id)}
        hitSlop={8}
        style={styles.removeBtn}
      >
        <Text style={styles.removeText}>{'\u2715'}</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved</Text>

      {loading && <Text style={styles.empty}>Loading...</Text>}

      {!loading && items.length === 0 && (
        <Text style={styles.empty}>
          Save places and events while exploring the map.
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    padding: 16,
    paddingBottom: 8,
  },
  empty: {
    fontSize: 15,
    color: '#999',
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#e8e8e8',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  removeBtn: {
    padding: 8,
  },
  removeText: {
    fontSize: 16,
    color: '#999',
  },
});
