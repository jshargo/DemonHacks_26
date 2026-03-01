import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useExploreStore } from '@/stores/explore-store';
import { useCollectionStore } from '@/stores/collection-store';
import { useAuthStore } from '@/stores/auth-store';
import { useMapStore } from '@/stores/map-store';
import { useDiscoverFeed } from '@/hooks/useDiscoverFeed';
import { getPinLabel } from '@/lib/mock-data';
import type { MapPin as MapPinType, MapBounds, PinLabel, DiscoverItem, SearchResult } from '@/lib/types';

import TopBar from './TopBar';
import CardFeed from './CardFeed';
import DetailPanel from './DetailPanel';
import FiltersModal from './FiltersModal';
import { POIDetailPanel } from './SearchBar';
import MapViewComponent from '@/components/map/MapView';
import { useSearchStore } from '@/stores/search-store';
import { colors, fonts } from '@/lib/theme';
import { useFilteredFeed } from '@/hooks/useFilteredFeed';
import AIChatPanel from './AIChatPanel';

const BOUNDS_DEBOUNCE_MS = 300;

/** Minimum pixel distance between two pins before one is hidden */
const MIN_PIN_GAP_PX = 20;

/** Convert lat/lng to Mercator pixel position at a given zoom level */
function toPixel(lng: number, lat: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;
  return { x, y };
}

/** Drop pins whose center would overlap an already-kept pin at the current zoom */
function deduplicatePins(pins: MapPinType[], zoom: number): MapPinType[] {
  const kept: Array<{ x: number; y: number }> = [];
  const result: MapPinType[] = [];
  for (const pin of pins) {
    const p = toPixel(pin.lng, pin.lat, zoom);
    const overlaps = kept.some(
      (k) => Math.sqrt((p.x - k.x) ** 2 + (p.y - k.y) ** 2) < MIN_PIN_GAP_PX,
    );
    if (!overlaps) {
      kept.push(p);
      result.push(pin);
    }
  }
  return result;
}

type PanelMode = 'feed' | 'ai';

export default function DesktopLayout() {
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedViewportRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('feed');

  // Subscribe to store flyTarget (set by Tambo tools/components) and bridge into local state
  const storeFlyTarget = useMapStore((s) => s.flyTarget);
  const clearStoreFlyTarget = useMapStore((s) => s.setFlyTarget);
  useEffect(() => {
    if (storeFlyTarget) {
      setFlyTarget(storeFlyTarget);
      clearStoreFlyTarget(null);
    }
  }, [storeFlyTarget, clearStoreFlyTarget]);

  const { items: rawItems, count: rawCount, loading } = useDiscoverFeed();
  const { filteredItems: items, filteredCount: count } = useFilteredFeed(rawItems);

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

  const zoom = useMapStore((s) => s.viewport.zoom);

  // Convert DiscoverItems → MapPins, then drop pins that would visually overlap
  const mapPins: MapPinType[] = useMemo(() => {
    const all = items
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
      }));
    return deduplicatePins(all, zoom);
  }, [items, zoom]);

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
      setHoveredPinId(pin.id);
    },
    [items, openWithViewportSave, setHoveredPinId],
  );

  // Card press → open detail (all data already in the item from Supabase)
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
      setHoveredPinId(item.id);
      setSelectedResult(result);
    },
    [openWithViewportSave, setHoveredPinId, setSelectedResult],
  );

  // Close detail → restore saved viewport
  const handleBack = useCallback(() => {
    closeDetail();
    setHoveredPinId(null);
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
  }, [detailItem, closeDetail, setHoveredPinId]);

  // Toggle save on detail panel
  const handleToggleSaveDetail = useCallback(() => {
    if (!detailItem || !session) return;
    const userId = session.user.id;

    const existing = findSavedItem(detailItem.id);
    if (existing) {
      removeItem(existing.id);
    } else {
      addItem(userId, detailItem.entityType, detailItem.id);
    }
  }, [detailItem, session, findSavedItem, addItem, removeItem]);

  return (
    <View style={styles.container}>
      {/* Filters modal overlay */}
      <FiltersModal />

      {/* Left panel: TopBar + Toggle + (CardFeed/Detail or AI Chat) */}
      <View style={styles.leftPanel}>
        <TopBar showWordmark />

        {/* Segmented control: Explore | AI */}
        <View style={styles.toggleBar}>
          <Pressable
            style={[styles.toggleBtn, panelMode === 'feed' && styles.toggleBtnActive]}
            onPress={() => setPanelMode('feed')}
          >
            <Text style={[styles.toggleText, panelMode === 'feed' && styles.toggleTextActive]}>
              Explore
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, panelMode === 'ai' && styles.toggleBtnActive]}
            onPress={() => setPanelMode('ai')}
          >
            <Text style={[styles.toggleText, panelMode === 'ai' && styles.toggleTextActive]}>
              AI
            </Text>
          </Pressable>
        </View>

        {/* Feed panel — hidden when AI is active (keeps state) */}
        <View style={[styles.panelContent, panelMode !== 'feed' && styles.hidden]}>
          {detailItem ? (
            <DetailPanel
              item={detailItem}
              onBack={handleBack}
              isSaved={isSaved(detailItem.id)}
              onToggleSave={handleToggleSaveDetail}
            />
          ) : (
            <CardFeed
              items={items}
              count={count}
              onItemPress={handleItemPress}
              numColumns={2}
            />
          )}
        </View>

        {/* AI chat panel — hidden when Explore is active (preserves chat history) */}
        <View style={[styles.panelContent, panelMode !== 'ai' && styles.hidden]}>
          <AIChatPanel />
        </View>
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
          flyToCoordinate={flyTarget}
          onMapBackgroundClick={handleMapBackgroundClick}
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
    width: '40%' as unknown as number,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderLight,
  },
  rightPanel: {
    flex: 1,
  },
  toggleBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.white,
    // Web-only shadow for the active tab
    ...({ boxShadow: '0px 1px 3px rgba(0,0,0,0.08)' } as unknown as object),
  },
  toggleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textTertiary,
  },
  toggleTextActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  panelContent: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
