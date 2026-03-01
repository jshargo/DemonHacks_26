// DivvyStationsLayer — Divvy bike station markers with live availability.
// Loads static GeoJSON for locations, fetches live status every 60s,
// merges by station_id, and shows popup on click.

import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Source, Layer, Popup, useMap } from 'react-map-gl/mapbox';
import type { FeatureCollection, Feature, Point } from 'geojson';
import { useCTAStore } from '@/stores/cta-store';

const STATUS_URL = 'https://gbfs.divvybikes.com/gbfs/en/station_status.json';
const REFRESH_MS = 60_000;

interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_ebikes_available: number;
  num_docks_available: number;
  is_renting: boolean;
  is_returning: boolean;
}

interface SelectedStation {
  longitude: number;
  latitude: number;
  name: string;
  bikesAvailable: number;
  ebikesAvailable: number;
  docksAvailable: number;
  totalDocks: string;
}

export default function DivvyStationsLayer() {
  const showDivvyStations = useCTAStore((s) => s.showDivvyStations);
  const { current: map } = useMap();

  const [baseData, setBaseData] = useState<FeatureCollection | null>(null);
  const [mergedData, setMergedData] = useState<FeatureCollection | null>(null);
  const [selected, setSelected] = useState<SelectedStation | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load static GeoJSON on first toggle
  useEffect(() => {
    if (!showDivvyStations || baseData) return;
    fetch('/divvy-stations.geojson')
      .then((r) => r.json())
      .then(setBaseData)
      .catch((err) => console.warn('Failed to load Divvy stations:', err));
  }, [showDivvyStations, baseData]);

  // Fetch live status and merge with base GeoJSON
  const fetchAndMerge = useCallback(async () => {
    if (!baseData) return;
    try {
      const res = await fetch(STATUS_URL);
      const json = await res.json();
      const stations: StationStatus[] = json.data?.stations ?? [];

      // Build lookup by station_id
      const statusMap = new Map<string, StationStatus>();
      for (const s of stations) {
        statusMap.set(s.station_id, s);
      }

      // Merge into GeoJSON properties
      const merged: FeatureCollection = {
        type: 'FeatureCollection',
        features: baseData.features.map((f) => {
          const props = f.properties ?? {};
          const status = statusMap.get(props.id);
          return {
            ...f,
            properties: {
              ...props,
              bikes_available: status?.num_bikes_available ?? 0,
              ebikes_available: status?.num_ebikes_available ?? 0,
              docks_available: status?.num_docks_available ?? 0,
              is_renting: status?.is_renting ?? false,
            },
          };
        }),
      };

      setMergedData(merged);
    } catch (err) {
      console.warn('Failed to fetch Divvy status:', err);
    }
  }, [baseData]);

  // Fetch on base data load + refresh every 60s
  useEffect(() => {
    if (!baseData || !showDivvyStations) return;

    fetchAndMerge();
    intervalRef.current = setInterval(fetchAndMerge, REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [baseData, showDivvyStations, fetchAndMerge]);

  // Clear interval when layer hidden
  useEffect(() => {
    if (!showDivvyStations && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [showDivvyStations]);

  // Click handler for station markers
  useEffect(() => {
    const m = map?.getMap();
    if (!m || !showDivvyStations) return;

    const handleClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      const feature = e.features?.[0];
      if (!feature || !feature.properties) return;

      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const p = feature.properties;

      setSelected({
        longitude: coords[0],
        latitude: coords[1],
        name: p.station_name ?? 'Unknown Station',
        bikesAvailable: Number(p.bikes_available ?? 0),
        ebikesAvailable: Number(p.ebikes_available ?? 0),
        docksAvailable: Number(p.docks_available ?? 0),
        totalDocks: p.total_docks ?? '0',
      });
    };

    m.on('click', 'divvy-stations', handleClick);

    // Cursor pointer on hover
    const onEnter = () => { m.getCanvas().style.cursor = 'pointer'; };
    const onLeave = () => { m.getCanvas().style.cursor = ''; };
    m.on('mouseenter', 'divvy-stations', onEnter);
    m.on('mouseleave', 'divvy-stations', onLeave);

    return () => {
      m.off('click', 'divvy-stations', handleClick);
      m.off('mouseenter', 'divvy-stations', onEnter);
      m.off('mouseleave', 'divvy-stations', onLeave);
    };
  }, [map, showDivvyStations]);

  // Close popup when layer hidden
  useEffect(() => {
    if (!showDivvyStations) setSelected(null);
  }, [showDivvyStations]);

  const vis = showDivvyStations ? 'visible' : 'none';
  const data = mergedData ?? baseData;

  return (
    <>
      {data && (
        <Source id="divvy-stations" type="geojson" data={data}>
          <Layer
            id="divvy-stations"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 8],
              'circle-color': '#00a1de',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': 0.9,
            }}
            layout={{ visibility: vis }}
          />
          <Layer
            id="divvy-station-labels"
            type="symbol"
            minzoom={14}
            layout={{
              'text-field': ['get', 'station_name'],
              'text-size': 11,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-anchor': 'left',
              'text-offset': [1, 0],
              'text-allow-overlap': false,
              'text-max-width': 8,
              visibility: vis,
            }}
            paint={{
              'text-color': '#0077b6',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            }}
          />
        </Source>
      )}

      {selected && (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          anchor="bottom"
          offset={14}
          closeOnClick={false}
          onClose={() => setSelected(null)}
          style={{ maxWidth: '240px' }}
        >
          <View style={styles.popup}>
            <View style={styles.colorBand} />
            <View style={styles.content}>
              <Text style={styles.name}>{selected.name}</Text>
              <View style={styles.row}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{selected.bikesAvailable}</Text>
                  <Text style={styles.statLabel}>bikes</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{selected.ebikesAvailable}</Text>
                  <Text style={styles.statLabel}>e-bikes</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{selected.docksAvailable}</Text>
                  <Text style={styles.statLabel}>docks free</Text>
                </View>
              </View>
              <Text style={styles.capacity}>
                {selected.totalDocks} total docks
              </Text>
            </View>
          </View>
        </Popup>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  popup: {
    minWidth: 180,
  },
  colorBand: {
    height: 4,
    backgroundColor: '#00a1de',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  content: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00a1de',
  },
  statLabel: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  capacity: {
    fontSize: 11,
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 8,
  },
});
