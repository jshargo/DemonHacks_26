import { useRef, useCallback } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import Map, { Marker, type MapRef, type ViewStateChangeEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MAPBOX_ACCESS_TOKEN, MAP_STYLE } from '@/lib/mapbox';
import { DEFAULT_VIEWPORT, CHICAGO_BOUNDS, ENTITY_TYPES } from '@/lib/constants';
import { useMapStore } from '@/stores/map-store';
import { useMapPins } from '@/hooks/useMapPins';
import CategoryChips from '@/components/spots/CategoryChips';

export default function MapScreen() {
  const mapRef = useRef<MapRef>(null);
  const { viewport, setViewport, activeFilters, toggleFilter, selectPin } =
    useMapStore();

  const { pins, loading } = useMapPins({ entityTypes: activeFilters });

  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setViewport({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
      });
    },
    [setViewport]
  );

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <CategoryChips activeCategories={activeFilters} onToggle={toggleFilter} />
        <Text style={styles.nativeMsg}>Native map coming soon</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipsOverlay}>
        <CategoryChips activeCategories={activeFilters} onToggle={toggleFilter} />
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading pins...</Text>
        </View>
      )}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        initialViewState={DEFAULT_VIEWPORT}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        maxBounds={CHICAGO_BOUNDS}
        onMove={handleMove}
      >
        {pins.map((pin) => (
          <Marker
            key={`${pin.entityType}-${pin.id}`}
            latitude={pin.lat}
            longitude={pin.lng}
            onClick={() => selectPin(pin)}
          >
            <View
              style={[
                styles.pin,
                { backgroundColor: ENTITY_TYPES[pin.entityType]?.color ?? '#333' },
              ]}
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
  chipsOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
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
  nativeMsg: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
