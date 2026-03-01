import { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useExploreStore } from '@/stores/explore-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import { useMapStore } from '@/stores/map-store';
import { useDiscoverFeed } from '@/hooks/useDiscoverFeed';
import { getPinLabel } from '@/lib/mock-data';
import type { MapPin as MapPinType, MapBounds, PinLabel, DiscoverItem, SearchResult } from '@/lib/types';

import TopBar from './TopBar';
import DiscoverCard from './DiscoverCard';
import DetailPanel from './DetailPanel';
import { POIDetailPanel } from './SearchBar';
import MapViewComponent from '@/components/map/MapView';
import { useSearchStore } from '@/stores/search-store';
import { colors, spacing, radii, zIndex as zIndexTokens } from '@/lib/theme';

const SNAP_POINTS = ['12%', '50%', '90%'];
const BOUNDS_DEBOUNCE_MS = 300;

export default function MobileLayout() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedViewportRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const { items, loading } = useDiscoverFeed();

  const detailItem = useExploreStore((s) => s.detailItem);
  const openDetail = useExploreStore((s) => s.openDetail);
  const closeDetail = useExploreStore((s) => s.closeDetail);
  const hoveredItemId = useExploreStore((s) => s.hoveredItemId);
  const setHoveredPinId = useExploreStore((s) => s.setHoveredPinId);
  const setMapBounds = useExploreStore((s) => s.setMapBounds);

  const searchResult = useSearchStore((s) => s.selectedResult);
  const setSelectedResult = useSearchStore((s) => s.setSelectedResult);
  const clearSelectedResult = useSearchStore((s) => s.clearSelectedResult);

  const isSaved = useCollectionStore((s) => s.isSaved);
  const addItem = useCollectionStore((s) => s.addItem);
  const removeItem = useCollectionStore((s) => s.removeItem);
  const findSavedItem = useCollectionStore((s) => s.findSavedItem);
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

  /** Snapshot current viewport and open the detail panel */
  const openWithViewportSave = useCallback(
    (item: DiscoverItem) => {
      const v = useMapStore.getState().viewport;
      savedViewportRef.current = { lat: v.latitude, lng: v.longitude, zoom: v.zoom };
      openDetail(item);
      setFlyTarget({ lat: item.lat, lng: item.lng });
    },
    [openDetail],
  );

  // Pin click → open detail directly (Airbnb pattern)
  const handlePinPress = useCallback(
    (pin: MapPinType) => {
      const item = items.find((i) => i.id === pin.id);
      if (!item) return;
      openWithViewportSave(item);
      bottomSheetRef.current?.snapToIndex(2); // 90% — show detail
      setHoveredPinId(pin.id);
    },
    [items, openWithViewportSave, setHoveredPinId],
  );

  const handleItemPress = useCallback(
    (item: DiscoverItem) => {
      const result: SearchResult | null =
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

      openWithViewportSave(item);
      bottomSheetRef.current?.snapToIndex(2);
      setHoveredPinId(item.id);
      setSelectedResult(result);
    },
    [openWithViewportSave, setHoveredPinId, setSelectedResult],
  );

  // Close detail → restore saved viewport
  const handleBack = useCallback(() => {
    closeDetail();
    setHoveredPinId(null);
    bottomSheetRef.current?.snapToIndex(1); // Back to 50%
    const saved = savedViewportRef.current;
    if (saved) {
      setFlyTarget({ lat: saved.lat, lng: saved.lng, zoom: saved.zoom });
      savedViewportRef.current = null;
    } else {
      setFlyTarget(null);
    }
  }, [closeDetail, setHoveredPinId]);

  // Click empty map area → dismiss detail, stay in place
  const handleMapBackgroundClick = useCallback(() => {
    if (!detailItem) return;
    closeDetail();
    setHoveredPinId(null);
    savedViewportRef.current = null;
    bottomSheetRef.current?.snapToIndex(1); // Back to 50%
  }, [detailItem, closeDetail, setHoveredPinId]);

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
    ({ item }: { item: DiscoverItem }) => (
      <DiscoverCard
        item={item}
        onPress={() => handleItemPress(item)}
        isSaved={isSaved(item.id)}
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
        flyToCoordinate={flyTarget}
        onMapBackgroundClick={handleMapBackgroundClick}
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
            isSaved={isSaved(detailItem.id)}
            onToggleSave={() => handleToggleSave(detailItem)}
          />
        ) : (
          <BottomSheetFlatList
            data={items}
            keyExtractor={(item: DiscoverItem) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
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
    zIndex: zIndexTokens.sticky,
  },
  sheetBackground: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHandle: {
    backgroundColor: colors.border,
    width: 40,
  },
  sheetList: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
});
