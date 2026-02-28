// MapView — Immersive 3D Chicago map with Mapbox Standard style
// Features: real-time lighting, atmospheric fog, animated pins,
// neighborhood hover overlay, auto-rotate, compass in 3D mode.

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
import { useAutoRotate } from '@/hooks/useAutoRotate';
import type { MapPin as MapPinType } from '@/lib/types';

import AnimatedPin from './AnimatedPin';
import CityMaskLayer from './CityMaskLayer';
import NeighborhoodLayer from './NeighborhoodLayer';

/** Camera settings for 3D tilted view */
const VIEW_3D = { pitch: 60, bearing: -17.6 } as const;
/** Camera settings for flat bird's eye view */
const VIEW_2D = { pitch: 0, bearing: 0 } as const;

interface MapViewProps {
  pins: MapPinType[];
  loading?: boolean;
  onPinPress?: (pin: MapPinType) => void;
}

export default function MapViewComponent({ pins, loading, onPinPress }: MapViewProps) {
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

  // ─── Auto-rotate in 3D mode ───
  useAutoRotate({ mapRef, enabled: is3D });

  // ─── Map onLoad: configure Standard style ───
  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Configure Standard basemap
    map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
    map.setConfigProperty('basemap', 'showTransitLabels', false);

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

  // ─── Viewport sync ───
  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setViewport({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
        pitch: evt.viewState.pitch,
        bearing: evt.viewState.bearing,
      });
    },
    [setViewport],
  );

  // ─── Neighborhood hover ───
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

  // ─── Native fallback ───
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.nativeMsg}>Native map coming soon</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        interactiveLayerIds={mapLoaded ? ['neighborhood-fill'] : []}
        onMouseMove={mapLoaded ? handleMouseMove : undefined}
        onMouseLeave={mapLoaded ? handleMouseLeave : undefined}
      >
        {/* City mask — hides everything outside Chicago; must render first (below neighborhoods) */}
        {mapLoaded && <CityMaskLayer />}

        {/* Neighborhood overlay — invisible until hovered */}
        {mapLoaded && <NeighborhoodLayer />}

        {/* Compass — 3D mode only */}
        {is3D && (
          <NavigationControl
            position="bottom-left"
            showCompass
            showZoom={false}
            visualizePitch
          />
        )}

        {/* Animated pins */}
        {pins.map((pin, index) => (
          <Marker
            key={`${pin.entityType}-${pin.id}`}
            latitude={pin.lat}
            longitude={pin.lng}
            anchor="center"
          >
            <AnimatedPin
              entityType={pin.entityType}
              index={index}
              onClick={() => onPinPress?.(pin)}
            />
          </Marker>
        ))}
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
