/** Mapbox access token from environment */
export const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

if (!MAPBOX_ACCESS_TOKEN) {
  console.warn(
    'Missing EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN. Copy .env.example to .env and fill in your token.'
  );
}

/** Default Mapbox map style */
export const MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';
