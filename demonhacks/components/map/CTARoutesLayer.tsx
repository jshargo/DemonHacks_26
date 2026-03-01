// CTARoutesLayer — CTA L rail lines and bus route line overlays.
// Rail lines use data-driven coloring from the `color` property.
// Bus routes are lazy-loaded and shown only at zoom >= 12.

import { useState, useEffect } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import { useCTAStore } from '@/stores/cta-store';

export default function CTARoutesLayer() {
  const showRailLines = useCTAStore((s) => s.showRailLines);
  const showBusRoutes = useCTAStore((s) => s.showBusRoutes);

  const [railData, setRailData] = useState<FeatureCollection | null>(null);
  const [busData, setBusData] = useState<FeatureCollection | null>(null);

  // Load rail lines on first toggle
  useEffect(() => {
    if (!showRailLines || railData) return;
    fetch('/cta-rail-lines.geojson')
      .then((r) => r.json())
      .then(setRailData)
      .catch((err) => console.warn('Failed to load rail lines:', err));
  }, [showRailLines, railData]);

  // Lazy-load bus routes on first toggle
  useEffect(() => {
    if (!showBusRoutes || busData) return;
    fetch('/cta-bus-routes.geojson')
      .then((r) => r.json())
      .then(setBusData)
      .catch((err) => console.warn('Failed to load bus routes:', err));
  }, [showBusRoutes, busData]);

  const railVisibility = showRailLines ? 'visible' : 'none';
  const busVisibility = showBusRoutes ? 'visible' : 'none';

  return (
    <>
      {railData && (
        <Source id="cta-rail-lines" type="geojson" data={railData}>
          <Layer
            id="cta-rail-lines"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4],
              'line-opacity': 0.85,
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
              visibility: railVisibility,
            }}
          />
        </Source>
      )}

      {busData && (
        <Source id="cta-bus-routes" type="geojson" data={busData}>
          <Layer
            id="cta-bus-routes"
            type="line"
            minzoom={12}
            paint={{
              'line-color': '#1a73e8',
              'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 2.5],
              'line-opacity': 0.5,
              'line-dasharray': [2, 2],
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
              visibility: busVisibility,
            }}
          />
        </Source>
      )}
    </>
  );
}
