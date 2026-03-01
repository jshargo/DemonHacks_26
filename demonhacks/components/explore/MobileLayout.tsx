import { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetFlatList,
  type BottomSheetFlatListMethods,
} from '@gorhom/bottom-sheet';
import { useExploreStore } from '@/stores/explore-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDiscoverFeed } from '@/hooks/useDiscoverFeed';
import { getPinLabel } from '@/lib/mock-data';
import type { MapPin as MapPinType, MapBounds, PinLabel, DiscoverItem, SearchResult } from '@/lib/types';

import TopBar from './TopBar';
import DiscoverCard from './DiscoverCard';
import DetailPanel from './DetailPanel';
import { POIDetailPanel } from './SearchBar';
import MapViewComponent from '@/components/map/MapView';
import { useSearchStore } from '@/stores/search-store';
import { createSearchSession, searchRetrieve } from '@/lib/mapbox-search';

const SNAP_POINTS = ['12%', '50%', '90%'];
const BOUNDS_DEBOUNCE_MS = 300;

export default function MobileLayout() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<BottomSheetFlatListMethods>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedSelectionSeqRef = useRef(0);

  const { items, loading } = useDiscoverFeed();

  const detailItem = useExploreStore((s) => s.detailItem);
  const openDetail = useExploreStore((s) => s.openDetail);
  const closeDetail = useExploreStore((s) => s.closeDetail);
  const hoveredItemId = useExploreStore((s) => s.hoveredItemId);
  const setHoveredPinId = useExploreStore((s) => s.setHoveredPinId);
  const setMapBounds = useExploreStore((s) => s.setMapBounds);

  const searchResult = useSearchStore((s) => s.selectedResult);
  const setSelectedResult = useSearchStore((s) => s.setSelectedResult);
  const rotateSessionToken = useSearchStore((s) => s.rotateSessionToken);
  const clearSelectedResult = useSearchStore((s) => s.clearSelectedResult);

  const isSaved = useCollectionStore((s) => s.isSaved);
  const addItem = useCollectionStore((s) => s.addItem);
  const removeItem = useCollectionStore((s) => s.removeItem);
  const collections = useCollectionStore((s) => s.collections);
  const collectionItems = useCollectionStore((s) => s.items);
  const session = useAuthStore((s) => s.session);

  // Convert DiscoverItems → MapPins (only items with coordinates)
  const mapPins: MapPinType[] = useMemo(
    () =>
      items
        .filter((item) => item.lat !== 0 && item.lng !== 0)
        .map((item) => ({
          id: item.id,
          entityType: item.entityType,
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          imageUrl: item.imageUrl,
        })),
    [items],
  );

  // Build pin labels map
  const pinLabels: Map<string, PinLabel> = useMemo(() => {
    const m = new Map<string, PinLabel>();
    items.forEach((item) => m.set(item.id, getPinLabel(item)));
    return m;
  }, [items]);

  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(() => setMapBounds(bounds), BOUNDS_DEBOUNCE_MS);
    },
    [setMapBounds],
  );

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

  const handlePinPress = useCallback(
    (pin: MapPinType) => {
      const item = items.find((i) => i.id === pin.id);
      if (!item) return;

      closeDetail();
      setHoveredPinId(pin.id);
      bottomSheetRef.current?.snapToIndex(1); // Show list view

      const index = items.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        try {
          listRef.current?.scrollToIndex({ index, animated: true, viewOffset: 16 });
        } catch {
          handleScrollToIndexFailed({ index, averageItemLength: 260 });
        }
      }
    },
    [closeDetail, handleScrollToIndexFailed, items, setHoveredPinId],
  );

  const handleItemPress = useCallback(
    (item: DiscoverItem) => {
      const requestSeq = ++feedSelectionSeqRef.current;

      const optimisticResult: SearchResult | null =
        item.lat !== 0 && item.lng !== 0
          ? {
              mapbox_id: item.mapboxId ?? item.id,
              name: item.name,
              address: item.placeFormatted ?? '',
              full_address: item.placeFormatted ?? '',
              lat: item.lat,
              lng: item.lng,
              category: item.subcategory ?? undefined,
              poi_categories: item.subcategory ? [item.subcategory] : [],
              website: item.websiteUrl ?? undefined,
            }
          : null;

      // Optimistic path: open detail and move map immediately.
      openDetail(item);
      bottomSheetRef.current?.snapToIndex(2);
      setHoveredPinId(item.id);
      setSelectedResult(optimisticResult);

      if (!item.mapboxId) return;

      const retrieveSessionToken = item.mapboxSessionToken?.trim() || createSearchSession();
      void searchRetrieve(item.mapboxId, retrieveSessionToken)
        .then((retrieved) => {
          if (!retrieved || requestSeq !== feedSelectionSeqRef.current) return;

          openDetail({
            ...item,
            lat: retrieved.lat,
            lng: retrieved.lng,
            subcategory: item.subcategory ?? retrieved.category ?? null,
            websiteUrl: item.websiteUrl ?? retrieved.website ?? null,
          });
          setSelectedResult(retrieved);
          rotateSessionToken();
        })
        .catch((err) => {
          console.warn('[MobileLayout] failed to retrieve feed POI:', err);
        });
    },
    [openDetail, rotateSessionToken, setHoveredPinId, setSelectedResult],
  );

  const handleBack = useCallback(() => {
    closeDetail();
    bottomSheetRef.current?.snapToIndex(1); // Back to 50%
  }, [closeDetail]);

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
    ({ item }: { item: DiscoverItem }) => (
      <DiscoverCard
        item={item}
        onPress={() => handleItemPress(item)}
        isSaved={isSaved(item.entityType, item.id)}
        onToggleSave={() => handleToggleSave(item)}
      />
    ),
    [handleItemPress, isSaved, handleToggleSave],
  );

  return (
    <View style={styles.container}>
      {/* Fullscreen map */}
      <MapViewComponent
        pins={mapPins}
        loading={loading}
        onPinPress={handlePinPress}
        pinStyle="label"
        pinLabels={pinLabels}
        highlightedPinId={hoveredItemId ?? undefined}
        selectedPinId={detailItem?.id}
        onPinHover={(id) => setHoveredPinId(id)}
        onPinHoverEnd={() => setHoveredPinId(null)}
        onBoundsChange={handleBoundsChange}
        searchResult={searchResult}
        onSearchResultDismiss={clearSelectedResult}
      />

      {/* POI detail panel for search results */}
      {searchResult && (
        <POIDetailPanel result={searchResult} onDismiss={clearSelectedResult} />
      )}

      {/* TopBar overlay */}
      <View style={styles.topBarOverlay}>
        <TopBar />
      </View>

      {/* Bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={SNAP_POINTS}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        {detailItem ? (
          <DetailPanel
            item={detailItem}
            onBack={handleBack}
            isSaved={isSaved(detailItem.entityType, detailItem.id)}
            onToggleSave={() => handleToggleSave(detailItem)}
          />
        ) : (
          <BottomSheetFlatList
            ref={listRef}
            data={items}
            keyExtractor={(item: DiscoverItem) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={handleScrollToIndexFailed}
          />
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: '#ccc',
    width: 40,
  },
  sheetList: {
    padding: 16,
    paddingBottom: 32,
  },
});
