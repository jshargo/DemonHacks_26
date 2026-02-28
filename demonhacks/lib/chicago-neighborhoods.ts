// Transforms the official Chicago community areas GeoJSON into the format
// expected by NeighborhoodLayer: each feature gets a title-cased `name`
// and a `color` from a rotating palette.

import type { FeatureCollection } from 'geojson';

/** 18-color palette — enough variety for 77 areas without close repeats */
const PALETTE = [
  '#FF6B35', '#9B5DE5', '#00C49A', '#FF85A1', '#FFD166',
  '#06D6A0', '#118AB2', '#EF476F', '#7209B7', '#F77F00',
  '#3A86FF', '#8338EC', '#FB5607', '#FF006E', '#E63946',
  '#2EC4B6', '#FCBF49', '#90BE6D',
];

/** Title-case a string: "ROGERS PARK" → "Rogers Park" */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Transform the official community areas FeatureCollection.
 * Adds `name` (title-cased) and `color` (from palette) to each feature's
 * properties so the NeighborhoodLayer paint expressions work unchanged.
 */
export function transformCommunityAreas(
  raw: FeatureCollection,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: raw.features.map((feature, i) => ({
      ...feature,
      properties: {
        ...feature.properties,
        name: titleCase((feature.properties?.community as string) ?? ''),
        color: PALETTE[i % PALETTE.length],
      },
    })),
  };
}
