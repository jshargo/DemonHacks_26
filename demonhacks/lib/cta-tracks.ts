// cta-tracks — Build continuous polylines from CTA rail GeoJSON segments
// and provide distance-along-path projection/sampling for track-constrained
// train interpolation.

import type { FeatureCollection } from 'geojson';
import { LEGEND_TO_ROUTE, CTA_ALL_ROUTES } from './cta';
import type { CTARouteCode } from './cta';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface RoutePath {
  coords: [number, number][];  // [lng, lat] ordered polyline
  cumDist: number[];           // cumulative distance in meters at each coord index
  totalLength: number;         // total path length in meters
}

export interface ProjectionResult {
  distance: number;     // distance along path in meters
  snappedLat: number;
  snappedLon: number;
}

// ─── Haversine (local, operates on [lng, lat]) ──────────────────────────────────

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLng = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ─── Segment stitching ──────────────────────────────────────────────────────────

/** Distance between two [lng, lat] points (cheap, just for stitching comparisons) */
function sqDist(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/**
 * Determine which route codes an ML segment serves by parsing its `lines` property.
 * e.g. "Brown, Green, Orange, Pink, Purple (Exp)" → ['Brn', 'G', 'Org', 'Pink', 'P']
 */
const LINE_NAME_TO_ROUTE: Record<string, CTARouteCode> = {
  'Red': 'Red',
  'Blue': 'Blue',
  'Brown': 'Brn',
  'Green': 'G',
  'Orange': 'Org',
  'Purple': 'P',
  'Pink': 'Pink',
  'Yellow': 'Y',
};

function parseMLLines(lines: string): CTARouteCode[] {
  const routes: CTARouteCode[] = [];
  for (const [name, code] of Object.entries(LINE_NAME_TO_ROUTE)) {
    if (lines.includes(name)) routes.push(code);
  }
  return routes;
}

type Segment = [number, number][];

/**
 * Stitch an array of segments into a continuous polyline via greedy
 * nearest-endpoint chaining. Each segment can be appended forward or reversed.
 */
function stitchSegments(segments: Segment[]): [number, number][] {
  if (segments.length === 0) return [];
  if (segments.length === 1) return [...segments[0]];

  const used = new Array(segments.length).fill(false);

  // Start with segment 0
  used[0] = true;
  const chain: [number, number][] = [...segments[0]];

  for (let iter = 1; iter < segments.length; iter++) {
    let bestIdx = -1;
    let bestDist = Infinity;
    let bestReverse = false;
    let bestEnd: 'start' | 'end' = 'end';

    const chainStart = chain[0];
    const chainEnd = chain[chain.length - 1];

    for (let i = 0; i < segments.length; i++) {
      if (used[i]) continue;
      const seg = segments[i];
      const segStart = seg[0];
      const segEnd = seg[seg.length - 1];

      // Try appending to chain end
      const d1 = sqDist(chainEnd, segStart);   // chain end → seg start (forward)
      const d2 = sqDist(chainEnd, segEnd);      // chain end → seg end (reverse)
      // Try prepending to chain start
      const d3 = sqDist(chainStart, segEnd);    // chain start ← seg end (forward)
      const d4 = sqDist(chainStart, segStart);  // chain start ← seg start (reverse)

      if (d1 < bestDist) { bestDist = d1; bestIdx = i; bestReverse = false; bestEnd = 'end'; }
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; bestReverse = true;  bestEnd = 'end'; }
      if (d3 < bestDist) { bestDist = d3; bestIdx = i; bestReverse = false; bestEnd = 'start'; }
      if (d4 < bestDist) { bestDist = d4; bestIdx = i; bestReverse = true;  bestEnd = 'start'; }
    }

    if (bestIdx === -1) break;
    used[bestIdx] = true;

    const seg = bestReverse ? [...segments[bestIdx]].reverse() : [...segments[bestIdx]];

    if (bestEnd === 'end') {
      // Skip first point if it's very close to chain end (avoid duplicate)
      const skip = sqDist(chain[chain.length - 1], seg[0]) < 1e-10 ? 1 : 0;
      chain.push(...seg.slice(skip));
    } else {
      const skip = sqDist(chain[0], seg[seg.length - 1]) < 1e-10 ? 1 : 0;
      chain.unshift(...seg.slice(0, seg.length - skip));
    }
  }

  return chain;
}

/** Build cumulative distance array for a polyline */
function buildCumDist(coords: [number, number][]): number[] {
  const cumDist = new Array(coords.length);
  cumDist[0] = 0;
  for (let i = 1; i < coords.length; i++) {
    cumDist[i] = cumDist[i - 1] + haversine(coords[i - 1], coords[i]);
  }
  return cumDist;
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Build continuous route polylines from the CTA rail lines GeoJSON.
 * Groups segments by route code, includes ML shared segments for each route
 * that uses them, stitches into a continuous polyline, and pre-computes
 * cumulative distances.
 */
export function buildRoutePaths(geojson: FeatureCollection): Map<string, RoutePath> {
  // Collect segments per route
  const routeSegments = new Map<string, Segment[]>();
  for (const rt of CTA_ALL_ROUTES) {
    routeSegments.set(rt, []);
  }

  for (const feature of geojson.features) {
    const props = feature.properties as { legend: string; lines: string } | null;
    if (!props) continue;

    const geom = feature.geometry;
    if (geom.type !== 'MultiLineString') continue;

    const legendCode = props.legend;
    const routeCode = LEGEND_TO_ROUTE[legendCode];

    // Extract coordinate arrays from MultiLineString
    const lineStrings = geom.coordinates as [number, number][][];

    if (legendCode === 'ML') {
      // Shared segment — add to each route that uses it
      const routes = parseMLLines(props.lines);
      for (const rt of routes) {
        const segs = routeSegments.get(rt);
        if (segs) {
          for (const ls of lineStrings) segs.push(ls);
        }
      }
    } else if (routeCode && routeCode !== 'ML') {
      const segs = routeSegments.get(routeCode);
      if (segs) {
        for (const ls of lineStrings) segs.push(ls);
      }
    }
  }

  // Stitch and build paths
  const paths = new Map<string, RoutePath>();
  for (const [rt, segments] of routeSegments) {
    if (segments.length === 0) continue;
    const coords = stitchSegments(segments);
    const cumDist = buildCumDist(coords);
    paths.set(rt, {
      coords,
      cumDist,
      totalLength: cumDist[cumDist.length - 1],
    });
  }

  return paths;
}

/**
 * Project a point onto the nearest location on a route path.
 * Returns the distance along the path and the snapped coordinates.
 * Uses brute-force segment scan (fast enough for ~2000 total points).
 */
export function projectOntoPath(
  path: RoutePath,
  lat: number,
  lon: number,
): ProjectionResult {
  const { coords, cumDist } = path;
  const point: [number, number] = [lon, lat];

  let bestDist = Infinity;
  let bestProjection: ProjectionResult = { distance: 0, snappedLat: coords[0][1], snappedLon: coords[0][0] };

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];

    // Project point onto segment a→b using parametric t
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;

    let t: number;
    if (lenSq < 1e-20) {
      t = 0;
    } else {
      t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projLng = a[0] + t * dx;
    const projLat = a[1] + t * dy;
    const dist = haversine(point, [projLng, projLat]);

    if (dist < bestDist) {
      bestDist = dist;
      // Distance along path = cumulative dist at segment start + fraction of segment
      const segLen = cumDist[i + 1] - cumDist[i];
      bestProjection = {
        distance: cumDist[i] + t * segLen,
        snappedLat: projLat,
        snappedLon: projLng,
      };
    }
  }

  return bestProjection;
}

/**
 * Sample a position along the path at a given distance.
 * Uses binary search on cumulative distance array + linear interpolation.
 */
export function samplePath(
  path: RoutePath,
  distance: number,
): { lat: number; lon: number; heading: number } {
  const { coords, cumDist, totalLength } = path;

  // Clamp distance
  const d = Math.max(0, Math.min(distance, totalLength));

  // Binary search for the segment containing this distance
  let lo = 0;
  let hi = cumDist.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumDist[mid] <= d) lo = mid;
    else hi = mid;
  }

  // Interpolate between coords[lo] and coords[hi]
  const segLen = cumDist[hi] - cumDist[lo];
  const t = segLen > 0 ? (d - cumDist[lo]) / segLen : 0;

  const a = coords[lo];
  const b = coords[hi];
  const lon = a[0] + t * (b[0] - a[0]);
  const lat = a[1] + t * (b[1] - a[1]);

  // Compute heading from the path tangent (direction of this segment)
  const dLng = b[0] - a[0];
  const dLat = b[1] - a[1];
  // atan2(dLng, dLat) gives bearing where 0=N, 90=E
  let heading = Math.atan2(dLng, dLat) * 180 / Math.PI;
  if (heading < 0) heading += 360;

  return { lat, lon, heading };
}
