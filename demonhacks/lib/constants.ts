import type { EntityType, PlaceCategory, MapViewport } from './types';
import type { LightPreset } from './chicago-light';

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

/** Bounding box to constrain map panning to Chicago city limits + O'Hare */
export const CHICAGO_BOUNDS: [[number, number], [number, number]] = [
  [-87.945, 41.640], // Southwest corner [lng, lat]
  [-87.500, 42.030], // Northeast corner [lng, lat]
];

/** Proximity radius (meters) for quest check-ins */
export const CHECK_IN_RADIUS_METERS = 100;

/** Entity type definitions with display labels and colors for map pins */
export const ENTITY_TYPES: Record<EntityType, { label: string; color: string }> = {
  place: { label: 'Places', color: '#FF6B35' },
  event: { label: 'Events', color: '#9B5DE5' },
};

/** All entity type keys for iteration */
export const ENTITY_TYPE_KEYS = Object.keys(ENTITY_TYPES) as EntityType[];

/** Place category definitions with display labels, colors, and Lucide icon names */
export const PLACE_CATEGORIES: Record<PlaceCategory, { label: string; color: string; icon: string }> = {
  food_drink:    { label: 'Food & Drink',    color: '#FF6B35', icon: 'utensils-crossed' },
  outdoors:      { label: 'Outdoors',        color: '#00C49A', icon: 'tree-pine' },
  shopping:      { label: 'Shopping',        color: '#F77F00', icon: 'shopping-bag' },
  entertainment: { label: 'Entertainment',   color: '#9B5DE5', icon: 'music' },
  arts_culture:  { label: 'Arts & Culture',  color: '#00BBF9', icon: 'palette' },
  volunteering:  { label: 'Volunteering',    color: '#E63946', icon: 'heart-handshake' },
  other:         { label: 'Other',           color: '#888888', icon: 'map-pin' },
};

/** All place category keys for iteration */
export const PLACE_CATEGORY_KEYS = Object.keys(PLACE_CATEGORIES) as PlaceCategory[];

// ─── Fog Configs per Light Preset ───

export interface FogConfig {
  color: string;
  'high-color': string;
  'horizon-blend': number;
  'space-color': string;
  'star-intensity': number;
}

/** Atmospheric fog settings for each time-of-day preset */
export const FOG_CONFIGS: Record<LightPreset, FogConfig> = {
  dawn: {
    color: '#ffe4c4',
    'high-color': '#fdb87d',
    'horizon-blend': 0.04,
    'space-color': '#1a1a3e',
    'star-intensity': 0.1,
  },
  day: {
    color: '#d0e8ff',
    'high-color': '#87ceeb',
    'horizon-blend': 0.03,
    'space-color': '#1a1a3e',
    'star-intensity': 0.0,
  },
  dusk: {
    color: '#ffa07a',
    'high-color': '#d2691e',
    'horizon-blend': 0.05,
    'space-color': '#0a0a2e',
    'star-intensity': 0.3,
  },
  night: {
    color: '#0a0a2e',
    'high-color': '#0d1b2a',
    'horizon-blend': 0.06,
    'space-color': '#000010',
    'star-intensity': 0.8,
  },
};

// ─── Pin SVG Icon Paths (24×24 viewBox) ───

/** SVG path data for category icons rendered inside map pins */
export const PIN_ICONS: Record<EntityType, string> = {
  // Map pin icon — places
  place:
    'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  // Calendar icon — events
  event:
    'M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z',
};
