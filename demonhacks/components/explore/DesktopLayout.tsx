import { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useExploreStore } from '@/stores/explore-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDiscoverFeed } from '@/hooks/useDiscoverFeed';
import { getPinLabel } from '@/lib/mock-data';
import type { MapPin as MapPinType, MapBounds, PinLabel, DiscoverItem, SearchResult } from '@/lib/types';

import TopBar from './TopBar';
import CardFeed, { type CardFeedHandle } from './CardFeed';
import DetailPanel from './DetailPanel';
import { POIDetailPanel } from './SearchBar';
import MapViewComponent from '@/components/map/MapView';
import { useSearchStore } from '@/stores/search-store';
import { createSearchSession, searchRetrieve } from '@/lib/mapbox-search';

const BOUNDS_DEBOUNCE_MS = 300;

export default function DesktopLayout() {
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedRef = useRef<CardFeedHandle>(null);
  const feedSelectionSeqRef = useRef(0);

  const { items, count, loading } = useDiscoverFeed();

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

  // Debounced bounds change
  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(() => setMapBounds(bounds), BOUNDS_DEBOUNCE_MS);
    },
    [setMapBounds],
  );

  // Pin click → open detail + scroll to card
  const handlePinPress = useCallback(
    (pin: MapPinType) => {
      const item = items.find((i) => i.id === pin.id);
      if (item) {
        // Keep feed visible and scroll to the corresponding card.
        closeDetail();
        feedRef.current?.scrollToItem(item.id);
      }
      setHoveredPinId(pin.id);
    },
    [items, closeDetail, setHoveredPinId],
  );

  // Card press → open detail
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

      // Optimistic path: update detail + search result immediately so camera movement is instant.
      openDetail(item);
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
          console.warn('[DesktopLayout] failed to retrieve feed POI:', err);
        });
    },
    [openDetail, rotateSessionToken, setHoveredPinId, setSelectedResult],
  );

  // Toggle save on detail panel
  const handleToggleSaveDetail = useCallback(() => {
    if (!detailItem || !session) return;
    const favorites = collections.find((c) => c.name === 'Favorites');
    if (!favorites) return;

    const saved = isSaved(detailItem.entityType, detailItem.id);
    if (saved) {
      const ci = collectionItems.find(
        (i) => i.item_type === detailItem.entityType && i.item_id === detailItem.id,
      );
      if (ci) removeItem(ci.id);
    } else {
      addItem(favorites.id, detailItem.entityType, detailItem.id);
    }
  }, [detailItem, session, collections, collectionItems, isSaved, addItem, removeItem]);

  return (
    <View style={styles.container}>
      {/* Left panel: TopBar + (CardFeed or DetailPanel) */}
      <View style={styles.leftPanel}>
        <TopBar />
        {detailItem ? (
          <DetailPanel
            item={detailItem}
            onBack={closeDetail}
            isSaved={isSaved(detailItem.entityType, detailItem.id)}
            onToggleSave={handleToggleSaveDetail}
          />
        ) : (
          <CardFeed
            ref={feedRef}
            items={items}
            count={count}
            onItemPress={handleItemPress}
            numColumns={2}
          />
        )}
      </View>

      {/* Right panel: Map */}
      <View style={styles.rightPanel}>
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
        {searchResult && (
          <POIDetailPanel result={searchResult} onDismiss={clearSelectedResult} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  rightPanel: {
    flex: 1,
  },
});
