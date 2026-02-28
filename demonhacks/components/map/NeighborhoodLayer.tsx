// NeighborhoodLayer — Official Chicago community areas (77 neighborhoods)
// Invisible by default. On hover, reveals tinted fill + border + name label
// using Mapbox feature-state for performant GPU-driven toggling.
// Data is fetched at runtime from the official city boundary GeoJSON.

import { useState, useEffect } from 'react';
import { Source, Layer, type LayerProps } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import { transformCommunityAreas } from '@/lib/chicago-neighborhoods';

const FILL_LAYER: LayerProps = {
  id: 'neighborhood-fill',
  type: 'fill',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.2,
      0,
    ],
  },
};

const LINE_LAYER: LayerProps = {
  id: 'neighborhood-line',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2.5,
    'line-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.9,
      0,
    ],
  },
};

const SYMBOL_LAYER: LayerProps = {
  id: 'neighborhood-label',
  type: 'symbol',
  layout: {
    'text-field': ['get', 'name'],
    'text-size': 14,
    'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
    'text-anchor': 'center',
    'text-allow-overlap': false,
  },
  paint: {
    'text-color': ['get', 'color'],
    'text-halo-color': '#fff',
    'text-halo-width': 1.5,
    'text-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      1,
      0,
    ],
  },
};

export default function NeighborhoodLayer() {
  const [data, setData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch('/chicago-communities.geojson')
      .then((res) => res.json())
      .then((raw) => setData(transformCommunityAreas(raw)))
      .catch((err) => console.warn('Failed to load community areas:', err));
  }, []);

  if (!data) return null;

  return (
    <Source id="neighborhoods" type="geojson" data={data} generateId>
      <Layer {...FILL_LAYER} />
      <Layer {...LINE_LAYER} />
      <Layer {...SYMBOL_LAYER} />
    </Source>
  );
}
