/**
 * Geographic utilities.
 *
 * Note: The current schema uses separate lat/lng columns (not PostgreSQL point type),
 * so parsePoint() is no longer needed for standard queries. It's kept for any
 * legacy data or raw SQL results that return point strings.
 */

/**
 * Parse a PostgreSQL `point` column value into lat/lng.
 *
 * PostgreSQL returns point values as the string "(x,y)".
 * For geographic data, x = longitude, y = latitude.
 *
 * Example: "(-87.6298,41.8781)" -> { lat: 41.8781, lng: -87.6298 }
 */
export function parsePoint(point: string): { lat: number; lng: number } {
  const cleaned = point.replace(/[()]/g, '');
  const [lngStr, latStr] = cleaned.split(',');
  return {
    lat: parseFloat(latStr),
    lng: parseFloat(lngStr),
  };
}

/**
 * Calculate distance between two GPS points using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
