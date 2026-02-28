import type { EntityType, MapViewport } from './types';

/** Chicago city center coordinates */
export const CHICAGO_CENTER = {
  latitude: 41.8781,
  longitude: -87.6298,
} as const;

/** Default map viewport */
export const DEFAULT_VIEWPORT: MapViewport = {
  ...CHICAGO_CENTER,
  zoom: 12,
};

/** Bounding box to constrain map panning to Chicago metro area */
export const CHICAGO_BOUNDS: [[number, number], [number, number]] = [
  [-88.0, 41.6], // Southwest corner [lng, lat]
  [-87.2, 42.2], // Northeast corner [lng, lat]
];

/** Proximity radius (meters) for check-ins */
export const CHECK_IN_RADIUS_METERS = 100;

/** Entity type definitions with display labels and colors for map pins */
export const ENTITY_TYPES: Record<EntityType, { label: string; color: string }> = {
  restaurant: { label: 'Restaurants', color: '#FF6B35' },
  event: { label: 'Events', color: '#9B5DE5' },
  activity: { label: 'Activities', color: '#00C49A' },
};

/** All entity type keys for iteration */
export const ENTITY_TYPE_KEYS = Object.keys(ENTITY_TYPES) as EntityType[];
