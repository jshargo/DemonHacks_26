// Transforms the official Chicago city boundary (MultiPolygon) into a
// reverse-mask Polygon: a world-covering rectangle with Chicago punched
// out as holes. When rendered as a fill layer, everything outside the
// city limits is hidden.

import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';

// Outer ring — covers the whole world (counter-clockwise)
const WORLD_RING: [number, number][] = [
  [-180, -85],
  [-180, 85],
  [180, 85],
  [180, -85],
  [-180, -85],
];

/**
 * Convert a Chicago city boundary FeatureCollection (MultiPolygon) into
 * a mask Feature (Polygon) where the city is cut out as holes.
 *
 * The official data has 2 polygons:
 *   - Polygon 0: O'Hare airport (1 outer ring)
 *   - Polygon 1: Main city body (1 outer ring + 3 enclave holes)
 *
 * We take only the outer rings (index 0) from each polygon as holes
 * in the world-covering mask. The enclave inner rings are ignored —
 * those tiny non-Chicago pockets within the boundary stay visible,
 * which is visually correct at map zoom levels.
 */
export function buildCityMask(
  boundaryData: FeatureCollection,
): Feature<Polygon> {
  const feature = boundaryData.features[0];
  const multiPoly = feature.geometry as MultiPolygon;

  // Extract the outer ring from each polygon in the MultiPolygon
  const holes = multiPoly.coordinates.map(
    (polygon) => polygon[0] as [number, number][],
  );

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [WORLD_RING, ...holes],
    },
  };
}
