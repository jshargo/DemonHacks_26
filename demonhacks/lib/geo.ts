/**
 * Parse a PostgreSQL `point` column value into lat/lng.
 *
 * PostgreSQL returns point values as the string "(x,y)".
 * For geographic data, x = longitude, y = latitude.
 *
 * Example: "(−87.6298,41.8781)" → { lat: 41.8781, lng: -87.6298 }
 */
export function parsePoint(point: string): { lat: number; lng: number } {
  // Strip parentheses and split on comma
  const cleaned = point.replace(/[()]/g, '');
  const [lngStr, latStr] = cleaned.split(',');
  return {
    lat: parseFloat(latStr),
    lng: parseFloat(lngStr),
  };
}
