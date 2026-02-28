/** Mapbox access token from environment */
export const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

if (!MAPBOX_ACCESS_TOKEN) {
  console.warn(
    'Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN. Copy .env.example to .env and fill in your token.'
  );
}

/** Default Mapbox map style — Standard gives us photorealistic 3D buildings,
 *  real-time lighting presets, and atmospheric fog out of the box. */
export const MAP_STYLE = 'mapbox://styles/mapbox/standard';
