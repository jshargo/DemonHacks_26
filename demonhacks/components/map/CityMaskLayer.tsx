// CityMaskLayer — Solid fill covering everything outside Chicago city limits.
// Fetches the official city boundary GeoJSON at runtime and converts it
// into a reverse-mask polygon. Renders below neighborhood & pin layers.

import { useState, useEffect } from 'react';
import { Source, Layer, type LayerProps } from 'react-map-gl/mapbox';
import type { Feature, Polygon } from 'geojson';
import { buildCityMask } from '@/lib/chicago-mask';

const MASK_FILL: LayerProps = {
  id: 'city-mask',
  type: 'fill',
  paint: {
    'fill-color': '#f0f0f0',
    'fill-opacity': 1,
  },
};

export default function CityMaskLayer() {
  const [mask, setMask] = useState<Feature<Polygon> | null>(null);

  useEffect(() => {
    fetch('/chicago-boundary.geojson')
      .then((res) => res.json())
      .then((data) => setMask(buildCityMask(data)))
      .catch((err) => console.warn('Failed to load city boundary:', err));
  }, []);

  if (!mask) return null;

  return (
    <Source id="city-mask" type="geojson" data={mask}>
      <Layer {...MASK_FILL} />
    </Source>
  );
}
