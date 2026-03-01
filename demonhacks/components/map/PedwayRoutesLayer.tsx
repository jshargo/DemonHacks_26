import { useState, useEffect } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import { useCTAStore } from '@/stores/cta-store';

export default function PedwayRoutesLayer() {
  const showPedwayRoutes = useCTAStore((s) => s.showPedwayRoutes);
  const [data, setData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!showPedwayRoutes || data) return;
    fetch('/pedway-routes.geojson')
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.warn('Failed to load Pedway routes:', err));
  }, [showPedwayRoutes, data]);

  const vis = showPedwayRoutes ? 'visible' : 'none';

  if (!data) return null;

  return (
    <Source id="pedway-routes" type="geojson" data={data}>
      <Layer
        id="pedway-routes-casing"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: vis }}
        paint={{
          'line-color': '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7],
          'line-opacity': 0.4,
        }}
      />
      <Layer
        id="pedway-routes-line"
        type="line"
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
          visibility: vis,
        }}
        paint={{
          'line-color': '#e07c24',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4],
          'line-opacity': 0.85,
          'line-dasharray': [2, 1],
        }}
      />
    </Source>
  );
}
