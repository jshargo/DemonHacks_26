// CTAStopsLayer — CTA rail station markers and bus stop overlays.
// Rail stations: colored circles with labels at zoom >= 13.
// Bus stops: clustered points, visible at zoom >= 14.

import { useState, useEffect } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import { useCTAStore } from '@/stores/cta-store';

export default function CTAStopsLayer() {
  const showRailStations = useCTAStore((s) => s.showRailStations);
  const showBusStops = useCTAStore((s) => s.showBusStops);

  const [stationData, setStationData] = useState<FeatureCollection | null>(null);
  const [busStopData, setBusStopData] = useState<FeatureCollection | null>(null);

  // Load rail stations on first toggle
  useEffect(() => {
    if (!showRailStations || stationData) return;
    fetch('/cta-rail-stations.geojson')
      .then((r) => r.json())
      .then(setStationData)
      .catch((err) => console.warn('Failed to load rail stations:', err));
  }, [showRailStations, stationData]);

  // Lazy-load bus stops on first toggle
  useEffect(() => {
    if (!showBusStops || busStopData) return;
    fetch('/cta-bus-stops.geojson')
      .then((r) => r.json())
      .then(setBusStopData)
      .catch((err) => console.warn('Failed to load bus stops:', err));
  }, [showBusStops, busStopData]);

  const stationVis = showRailStations ? 'visible' : 'none';
  const busStopVis = showBusStops ? 'visible' : 'none';

  return (
    <>
      {stationData && (
        <Source id="cta-rail-stations" type="geojson" data={stationData}>
          <Layer
            id="cta-rail-stations"
            type="circle"
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 7],
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            }}
            layout={{ visibility: stationVis }}
          />
          <Layer
            id="cta-rail-station-labels"
            type="symbol"
            minzoom={13}
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-anchor': 'left',
              'text-offset': [1, 0],
              'text-allow-overlap': false,
              'text-max-width': 8,
              visibility: stationVis,
            }}
            paint={{
              'text-color': '#27272a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            }}
          />
        </Source>
      )}

      {busStopData && (
        <Source
          id="cta-bus-stops"
          type="geojson"
          data={busStopData}
          cluster
          clusterRadius={50}
          clusterMaxZoom={16}
        >
          <Layer
            id="cta-bus-stop-clusters"
            type="circle"
            minzoom={14}
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#1a73e8',
              'circle-radius': ['step', ['get', 'point_count'], 12, 10, 16, 50, 20],
              'circle-opacity': 0.7,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            }}
            layout={{ visibility: busStopVis }}
          />
          <Layer
            id="cta-bus-stop-cluster-count"
            type="symbol"
            minzoom={14}
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count_abbreviated}',
              'text-size': 10,
              'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              visibility: busStopVis,
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
          <Layer
            id="cta-bus-stops"
            type="circle"
            minzoom={14}
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2, 17, 5],
              'circle-color': '#1a73e8',
              'circle-opacity': 0.6,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
            }}
            layout={{ visibility: busStopVis }}
          />
          <Layer
            id="cta-bus-stop-labels"
            type="symbol"
            minzoom={16}
            filter={['!', ['has', 'point_count']]}
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 10,
              'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
              'text-anchor': 'left',
              'text-offset': [0.8, 0],
              'text-allow-overlap': false,
              'text-max-width': 7,
              visibility: busStopVis,
            }}
            paint={{
              'text-color': '#1a73e8',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1,
            }}
          />
        </Source>
      )}
    </>
  );
}
