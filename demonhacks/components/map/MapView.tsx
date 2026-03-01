// MapView — Immersive 3D Chicago map with Mapbox Standard style
// Features: real-time lighting, atmospheric fog, animated pins,
// neighborhood hover overlay, auto-rotate, compass in 3D mode,
// CTA transit overlays with live train tracking.

import { useRef, useCallback, useEffect, useState } from 'react';
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
import { useDrawStore } from '@/stores/draw-store';

import AnimatedPin from './AnimatedPin';
import LabelPin from './LabelPin';
import CityMaskLayer from './CityMaskLayer';
import NeighborhoodLayer from './NeighborhoodLayer';
import CTARoutesLayer from './CTARoutesLayer';
import CTAStopsLayer from './CTAStopsLayer';
import CTATrainLayer from './CTATrainLayer';
import CTAToggle from './CTAToggle';
import DivvyStationsLayer from './DivvyStationsLayer';
import BikeRoutesLayer from './BikeRoutesLayer';
import BikeToggle from './BikeToggle';
import PedwayRoutesLayer from './PedwayRoutesLayer';
import TrainPopup from './TrainPopup';
import TicketmasterLayer from './TicketmasterLayer';
import DrawControl from './DrawControl';

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
  /** Coordinate to fly the camera to (e.g. when detail opens or closes) */
  flyToCoordinate?: { lat: number; lng: number; zoom?: number } | null;
  /** Called when empty map area is clicked (not a pin or train) */
  onMapBackgroundClick?: () => void;
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
  flyToCoordinate,
  onMapBackgroundClick,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  // Guard: when a pin is clicked, its onClick fires before the Map onClick.
  // This flag prevents the Map onClick from treating a pin click as a background click.
  const pinClickedRef = useRef(false);

  const {
    viewport,
    setViewport,
    is3D,
    toggle3D,
    lightPreset,
    setLightPreset,
    mapLoaded,
    setMapLoaded,
  } = useMapStore();

  const selectTrain = useCTAStore((s) => s.selectTrain);
  const showLiveTrains = useCTAStore((s) => s.showLiveTrains);

  // ─── Draw mode (used only for cursor hint; drawing handled by DrawControl) ───
  const isDrawMode = useDrawStore((s) => s.isDrawMode);
  const toggleDrawMode = useDrawStore((s) => s.toggleDrawMode);
  const drawnPolygon = useDrawStore((s) => s.drawnPolygon);
  const isDrawing = useDrawStore((s) => s.isDrawing);
  const [showBikeRoutes, setShowBikeRoutes] = useState(false);

  // ─── Auto-rotate in 3D mode ───
  useAutoRotate({ mapRef, enabled: is3D });

  // ─── CTA train icons + live polling ───
  useCTATrainIcons(mapRef, mapLoaded);
  useCTATrains(mapRef);

  // ─── Map onLoad: configure Standard style ───
  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const configureMap = () => {
      // Configure Standard basemap
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
      map.setConfigProperty('basemap', 'showTransitLabels', false);
      map.setConfigProperty('basemap', 'showRoadLabels', false);

      // Set initial light preset from Chicago time
      const preset = getChicagoLightPreset();
      map.setConfigProperty('basemap', 'lightPreset', preset);
      setLightPreset(preset);
      setMapLoaded(true);
    };

    // Standard style may still be loading when onLoad fires — wait for it
    if (map.isStyleLoaded()) {
      configureMap();
    } else {
      map.once('style.load', configureMap);
    }
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

  // ─── Fly to coordinate (detail open/close) ───
  useEffect(() => {
    if (!flyToCoordinate || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToCoordinate.lng, flyToCoordinate.lat],
      zoom: flyToCoordinate.zoom ?? Math.max(mapRef.current.getZoom(), 14),
      duration: 800,
    });
  }, [flyToCoordinate]);

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

  // ─── Train cursor ───
  const handleMouseMove = useCallback(
    (evt: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const trainFeature = evt.features?.find((f) => f.layer?.id === 'cta-trains');
      map.getCanvas().style.cursor = trainFeature ? 'pointer' : '';
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.getCanvas().style.cursor = '';
  }, []);

  // ─── Map click handler (trains + background dismiss) ───
  const handleClick = useCallback(
    (evt: MapMouseEvent) => {
      // A pin's DOM onClick fires before the map's canvas onClick.
      // If a pin was just clicked, skip — it's not a background click.
      if (pinClickedRef.current) {
        pinClickedRef.current = false;
        return;
      }

      // Draw mode: clicks are consumed by the DrawControl overlay
      if (isDrawMode) return;

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
        return;
      }
      // No interactive feature clicked — dismiss selection
      onMapBackgroundClick?.();
    },
    [selectTrain, onMapBackgroundClick, isDrawMode],
  );

  // ─── Native fallback ───
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.nativeMsg}>Native map coming soon</Text>
      </View>
    );
  }

  // Build interactive layer IDs (disabled in draw mode)
  const interactiveLayerIds = mapLoaded && !isDrawMode
    ? [...(showLiveTrains ? ['cta-trains'] : [])]
    : [];

  // ─── 3-state marker visibility ───
  // pen OFF → show all pins
  // pen ON + actively drawing → show none
  // pen ON + not drawing + polygon exists → show pins (already spatially filtered by useFilteredFeed)
  // pen ON + not drawing + no polygon yet → show none (pen just turned on)
  const showPins = !isDrawMode || (!isDrawing && drawnPolygon !== null);

  return (
    <View style={styles.container}>
      {/* CTA toggle stack — pen icon lives in the train slot */}
      {mapLoaded && (
        <CTAToggle
          isDrawMode={isDrawMode}
          onToggleDrawMode={toggleDrawMode}
        />
      )}

      {/* Bike Routes Toggle — hidden in draw mode */}
      {!isDrawMode && mapLoaded && (
        <BikeToggle active={showBikeRoutes} onPress={() => setShowBikeRoutes((v) => !v)} />
      )}

      {/* 3D Toggle Button — hidden in draw mode */}
      {!isDrawMode && (
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
      )}

      {/* Draw mode hints */}
      {isDrawMode && !isDrawing && !drawnPolygon && (
        <View style={styles.drawHint}>
          <Text style={styles.drawHintText}>
            Click & drag to draw a boundary
          </Text>
        </View>
      )}
      {isDrawMode && drawnPolygon && (
        <View style={styles.drawHint}>
          <Text style={styles.drawHintText}>
            Tap ✏️ again to clear & exit
          </Text>
        </View>
      )}

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
        onMouseMove={mapLoaded && !isDrawMode ? handleMouseMove : undefined}
        onMouseLeave={mapLoaded && !isDrawMode ? handleMouseLeave : undefined}
        onClick={mapLoaded && !isDrawMode ? handleClick : undefined}
      >
        {/* City mask — hides everything outside Chicago; must render first (below neighborhoods) */}
        {mapLoaded && <CityMaskLayer />}

        {/* Neighborhood overlay — invisible until hovered */}
        {mapLoaded && <NeighborhoodLayer />}

        {/* CTA transit overlays — rail lines, stations, bus routes/stops */}
        {mapLoaded && <CTARoutesLayer />}
        {mapLoaded && <CTAStopsLayer />}
        {mapLoaded && <CTATrainLayer />}

        {/* Divvy bike stations */}
        {mapLoaded && <DivvyStationsLayer />}

        {/* Ticketmaster events */}
        {mapLoaded && <TicketmasterLayer />}

        {/* Chicago bike routes */}
        {mapLoaded && <BikeRoutesLayer visible={showBikeRoutes} />}

        {/* Chicago Pedway underground routes */}
        {mapLoaded && <PedwayRoutesLayer />}

        {/* Train detail popup (hidden in draw mode) */}
        {mapLoaded && !isDrawMode && <TrainPopup />}

        {/* Draw polygon layers (DrawControl manages map interactions) */}
        {mapLoaded && <DrawControl mapRef={mapRef} />}

        {/* Compass — 3D mode only, hidden in draw mode */}
        {is3D && !isDrawMode && (
          <NavigationControl
            position="bottom-left"
            showCompass
            showZoom={false}
            visualizePitch
          />
        )}

        {/* Map pins — visibility controlled by 3-state logic */}
        {showPins && pins.map((pin, index) => (
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
                onClick={() => { pinClickedRef.current = true; onPinPress?.(pin); }}
                onMouseEnter={() => onPinHover?.(pin.id)}
                onMouseLeave={() => onPinHoverEnd?.()}
              />
            ) : (
              <AnimatedPin
                entityType={pin.entityType}
                index={index}
                onClick={() => { pinClickedRef.current = true; onPinPress?.(pin); }}
              />
            )}
          </Marker>
        ))}

        {/* Search result pin — hidden in draw mode */}
        {showPins && searchResult && (
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
  // ── Draw mode hint styles ─────────────────────────────────────────
  drawHint: {
    position: 'absolute',
    top: 16,
    left: '50%',
    // @ts-ignore web-only transform
    transform: [{ translateX: '-50%' }],
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  } as any,
  drawHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
