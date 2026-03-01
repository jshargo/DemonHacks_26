// BikeRoutesLayer — Chicago bike route lines from static GeoJSON.
// Self-contained: manages its own visibility state independently of the CTA store.

import { useState, useEffect } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';

interface Props {
  visible: boolean;
}

export default function BikeRoutesLayer({ visible }: Props) {
  const [data, setData] = useState<FeatureCollection | null>(null);

  // Lazy-load on first toggle
  useEffect(() => {
    if (!visible || data) return;
    fetch('/bike-routes.geojson')
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.warn('Failed to load bike routes:', err));
  }, [visible, data]);

  const vis = visible ? 'visible' : 'none';

  if (!data) return null;

  return (
    <Source id="bike-routes" type="geojson" data={data}>
      {/* White casing for contrast */}
      <Layer
        id="bike-routes-casing"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: vis }}
        paint={{
          'line-color': '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7],
          'line-opacity': 0.35,
        }}
      />
      {/* Green lines, shaded by route type */}
      <Layer
        id="bike-routes-line"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: vis }}
        paint={{
          'line-color': [
            'match', ['get', 'displayrou'],
            'Protected Bike Lane', '#00c853',
            'Buffered Bike Lane',  '#2ecc71',
            'Marked Shared Lane',  '#52b788',
            '#43a047',
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 13, 2.5, 15, 4],
          'line-opacity': 0.9,
        }}
      />
    </Source>
  );
}
