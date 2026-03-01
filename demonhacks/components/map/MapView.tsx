// MapView — Immersive 3D Chicago map with Mapbox Standard style
// Features: real-time lighting, atmospheric fog, animated pins,
// neighborhood hover overlay, auto-rotate, compass in 3D mode,
// CTA transit overlays with live train tracking.

import { useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type ViewStateChangeEvent,
  type MapMouseEvent,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MAPBOX_ACCESS_TOKEN, MAP_STYLE } from '@/lib/mapbox';
import { DEFAULT_VIEWPORT, CHICAGO_BOUNDS, FOG_CONFIGS } from '@/lib/constants';
import { getChicagoLightPreset, subscribeLightPreset } from '@/lib/chicago-light';
import { useMapStore } from '@/stores/map-store';
import { useCTAStore } from '@/stores/cta-store';
import { useAutoRotate } from '@/hooks/useAutoRotate';
import { useCTATrainIcons } from '@/hooks/useCTATrainIcons';
import { useCTATrains } from '@/hooks/useCTATrains';
import type { MapPin as MapPinType, PinLabel, MapBounds, SearchResult } from '@/lib/types';
import type { CTATrain } from '@/lib/cta';

import AnimatedPin from './AnimatedPin';
import LabelPin from './LabelPin';
import CityMaskLayer from './CityMaskLayer';
import NeighborhoodLayer from './NeighborhoodLayer';
import CTARoutesLayer from './CTARoutesLayer';
import CTAStopsLayer from './CTAStopsLayer';
import CTATrainLayer from './CTATrainLayer';
import CTAToggle from './CTAToggle';
import TrainPopup from './TrainPopup';

/** Camera settings for 3D tilted view */
const VIEW_3D = { pitch: 60, bearing: -17.6 } as const;
/** Camera settings for flat bird's eye view */
const VIEW_2D = { pitch: 0, bearing: 0 } as const;

interface MapViewProps {
  pins: MapPinType[];
  loading?: boolean;
  onPinPress?: (pin: MapPinType) => void;
  /** 'animated' (default) = bouncing circle pins; 'label' = Airbnb-style pill pins */
  pinStyle?: 'animated' | 'label';
  /** Pin label content for label-style pins, keyed by pin ID */
  pinLabels?: Map<string, PinLabel>;
  /** ID of pin to highlight (hovered from card feed) */
  highlightedPinId?: string;
  /** ID of selected pin (detail open) */
  selectedPinId?: string;
  /** Called when mouse enters a pin */
  onPinHover?: (pinId: string) => void;
  /** Called when mouse leaves a pin */
  onPinHoverEnd?: () => void;
  /** Called when map viewport bounds change */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Search result to display as a pin and fly to */
  searchResult?: SearchResult | null;
  /** Called when search result pin is dismissed */
  onSearchResultDismiss?: () => void;
}

export default function MapViewComponent({
  pins,
  loading,
  onPinPress,
  pinStyle = 'animated',
  pinLabels,
  highlightedPinId,
  selectedPinId,
  onPinHover,
  onPinHoverEnd,
  onBoundsChange,
  searchResult,
  onSearchResultDismiss,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const hoveredFeatureId = useRef<number | null>(null);

  const {
    viewport,
    setViewport,
    is3D,
    toggle3D,
    lightPreset,
    setLightPreset,
    mapLoaded,
    setMapLoaded,
    setHoveredNeighborhood,
  } = useMapStore();

  const selectTrain = useCTAStore((s) => s.selectTrain);
  const showLiveTrains = useCTAStore((s) => s.showLiveTrains);

  // ─── Auto-rotate in 3D mode ───
  useAutoRotate({ mapRef, enabled: is3D });

  // ─── CTA train icons + live polling ───
  useCTATrainIcons(mapRef, mapLoaded);
  useCTATrains(mapRef);

  // ─── Map onLoad: configure Standard style ───
  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Configure Standard basemap
    map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
    map.setConfigProperty('basemap', 'showTransitLabels', false);
    map.setConfigProperty('basemap', 'showRoadLabels', false);

    // Set initial light preset from Chicago time
    const preset = getChicagoLightPreset();
    map.setConfigProperty('basemap', 'lightPreset', preset);
    setLightPreset(preset);
    setMapLoaded(true);
  }, [setLightPreset, setMapLoaded]);

  // ─── Subscribe to light preset changes (every 5 min) ───
  useEffect(() => {
    if (!mapLoaded) return;

    return subscribeLightPreset((preset) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      map.setConfigProperty('basemap', 'lightPreset', preset);
      setLightPreset(preset);
    });
  }, [mapLoaded, setLightPreset]);

  // ─── 3D toggle: animate camera + manage fog ───
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const target = is3D ? VIEW_3D : VIEW_2D;
    mapRef.current!.easeTo({
      pitch: target.pitch,
      bearing: target.bearing,
      duration: 800,
    });

    if (is3D) {
      const fogConfig = FOG_CONFIGS[lightPreset];
      map.setFog(fogConfig);
    } else {
      map.setFog(null as unknown as mapboxgl.FogSpecification);
    }
  }, [is3D, lightPreset]);

  // ─── Fly to search result ───
  useEffect(() => {
    if (!searchResult || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [searchResult.lng, searchResult.lat],
      zoom: 15,
      duration: 1500,
    });
  }, [searchResult]);

  // ─── Viewport sync + bounds reporting ───
  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setViewport({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
        pitch: evt.viewState.pitch,
        bearing: evt.viewState.bearing,
      });

      if (onBoundsChange) {
        const map = mapRef.current?.getMap();
        if (map) {
          const b = map.getBounds();
          if (b) {
            onBoundsChange({
              north: b.getNorth(),
              south: b.getSouth(),
              east: b.getEast(),
              west: b.getWest(),
            });
          }
        }
      }
    },
    [setViewport, onBoundsChange],
  );

  // ─── Neighborhood hover + train cursor ───
  const handleMouseMove = useCallback(
    (evt: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Clear previous hover
      if (hoveredFeatureId.current !== null) {
        map.setFeatureState(
          { source: 'neighborhoods', id: hoveredFeatureId.current },
          { hover: false },
        );
      }

      // Check for train feature hover (cursor change)
      const trainFeature = evt.features?.find((f) => f.layer?.id === 'cta-trains');
      if (trainFeature) {
        map.getCanvas().style.cursor = 'pointer';
        hoveredFeatureId.current = null;
        setHoveredNeighborhood(null);
        return;
      }

      const feature = evt.features?.[0];
      if (feature && feature.id !== undefined) {
        hoveredFeatureId.current = feature.id as number;
        map.setFeatureState(
          { source: 'neighborhoods', id: feature.id },
          { hover: true },
        );
        setHoveredNeighborhood(feature.properties?.name ?? null);
        map.getCanvas().style.cursor = 'pointer';
      } else {
        hoveredFeatureId.current = null;
        setHoveredNeighborhood(null);
        map.getCanvas().style.cursor = '';
      }
    },
    [setHoveredNeighborhood],
  );

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (hoveredFeatureId.current !== null) {
      map.setFeatureState(
        { source: 'neighborhoods', id: hoveredFeatureId.current },
        { hover: false },
      );
      hoveredFeatureId.current = null;
    }
    setHoveredNeighborhood(null);
    map.getCanvas().style.cursor = '';
  }, [setHoveredNeighborhood]);

  // ─── Train click handler ───
  const handleClick = useCallback(
    (evt: MapMouseEvent) => {
      const trainFeature = evt.features?.find((f) => f.layer?.id === 'cta-trains');
      if (trainFeature && trainFeature.properties) {
        const p = trainFeature.properties;
        const train: CTATrain = {
          rn: String(p.rn),
          rt: String(p.rt),
          lat: (trainFeature.geometry as GeoJSON.Point).coordinates[1],
          lon: (trainFeature.geometry as GeoJSON.Point).coordinates[0],
          heading: Number(p.heading),
          destNm: String(p.destNm),
          nextStaNm: String(p.nextStaNm),
          isDly: p.isDly === true || p.isDly === 'true',
          isApp: p.isApp === true || p.isApp === 'true',
          prdt: String(p.prdt ?? ''),
          arrT: String(p.arrT ?? ''),
        };
        selectTrain(train);
      }
    },
    [selectTrain],
  );

  // ─── Native fallback ───
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.nativeMsg}>Native map coming soon</Text>
      </View>
    );
  }

  // Build interactive layer IDs
  const interactiveLayerIds = mapLoaded
    ? ['neighborhood-fill', ...(showLiveTrains ? ['cta-trains'] : [])]
    : [];

  return (
    <View style={styles.container}>
      {/* CTA Toggle Buttons */}
      {mapLoaded && <CTAToggle />}

      {/* 3D Toggle Button */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleBtn, is3D && styles.toggleBtnActive]}
          onPress={toggle3D}
        >
          <Text style={[styles.toggleIcon, is3D && styles.toggleIconActive]}>
            {is3D ? '3D' : '2D'}
          </Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading pins...</Text>
        </View>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          ...DEFAULT_VIEWPORT,
          pitch: VIEW_2D.pitch,
          bearing: VIEW_2D.bearing,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        maxBounds={CHICAGO_BOUNDS}
        maxPitch={85}
        onMove={handleMove}
        onLoad={handleLoad}
        interactiveLayerIds={interactiveLayerIds}
        onMouseMove={mapLoaded ? handleMouseMove : undefined}
        onMouseLeave={mapLoaded ? handleMouseLeave : undefined}
        onClick={mapLoaded ? handleClick : undefined}
      >
        {/* City mask — hides everything outside Chicago; must render first (below neighborhoods) */}
        {mapLoaded && <CityMaskLayer />}

        {/* Neighborhood overlay — invisible until hovered */}
        {mapLoaded && <NeighborhoodLayer />}

        {/* CTA transit overlays — rail lines, stations, bus routes/stops */}
        {mapLoaded && <CTARoutesLayer />}
        {mapLoaded && <CTAStopsLayer />}
        {mapLoaded && <CTATrainLayer />}

        {/* Train detail popup */}
        {mapLoaded && <TrainPopup />}

        {/* Compass — 3D mode only */}
        {is3D && (
          <NavigationControl
            position="bottom-left"
            showCompass
            showZoom={false}
            visualizePitch
          />
        )}

        {/* Map pins — animated circles or Airbnb-style labels */}
        {pins.map((pin, index) => (
          <Marker
            key={`${pin.entityType}-${pin.id}`}
            latitude={pin.lat}
            longitude={pin.lng}
            anchor="center"
          >
            {pinStyle === 'label' && pinLabels?.has(pin.id) ? (
              <LabelPin
                label={pinLabels.get(pin.id)!}
                isSelected={selectedPinId === pin.id}
                isHighlighted={highlightedPinId === pin.id}
                onClick={() => onPinPress?.(pin)}
                onMouseEnter={() => onPinHover?.(pin.id)}
                onMouseLeave={() => onPinHoverEnd?.()}
              />
            ) : (
              <AnimatedPin
                entityType={pin.entityType}
                index={index}
                onClick={() => onPinPress?.(pin)}
              />
            )}
          </Marker>
        ))}

        {/* Search result pin */}
        {searchResult && (
          <Marker
            key={`search-${searchResult.mapbox_id}`}
            latitude={searchResult.lat}
            longitude={searchResult.lng}
            anchor="center"
          >
            <LabelPin
              label={{ text: searchResult.name, type: 'rating' }}
              isSelected
              onClick={onSearchResultDismiss}
            />
          </Marker>
        )}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nativeMsg: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  },
  toggleContainer: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    zIndex: 10,
  },
  toggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
  },
  toggleBtnActive: {
    backgroundColor: '#1a1a2e',
  },
  toggleIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  toggleIconActive: {
    color: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
  },
});
