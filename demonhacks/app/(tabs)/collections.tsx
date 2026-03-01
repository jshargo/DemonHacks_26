// Saved items screen — shows all places and events the user has saved.
// Tap an item to navigate to it on the map.

import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCollections } from '@/hooks/useCollections';
import { useExploreStore } from '@/stores/explore-store';
import { PLACE_CATEGORIES } from '@/lib/constants';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';
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
        photoUrls: item.place.photo_urls ?? [],
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
    PLACE_CATEGORIES[category]?.color ?? colors.textTertiary;

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
        <X size={16} color={colors.textTertiary} />
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
    backgroundColor: colors.background,
  },
  title: {
    ...typography.displaySm,
    color: colors.textPrimary,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  empty: {
    ...typography.bodyMd,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginTop: spacing['2xl'],
    textAlign: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.surface,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    ...typography.headingSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm + 2,
  },
  badgeText: {
    ...typography.caption,
    fontFamily: fonts.bold,
    color: colors.textInverse,
  },
  removeBtn: {
    padding: spacing.sm,
  },
});
