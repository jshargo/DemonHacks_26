// useCTATrains — Polls CTA Train Tracker API and interpolates train positions
// along actual rail geometry (track-constrained interpolation).
// Updates the Mapbox GeoJSON source directly (bypasses React render cycle).

import { useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import { fetchAllTrainPositions } from '@/lib/cta';
import { useCTAStore } from '@/stores/cta-store';
import type { CTATrain } from '@/lib/cta';
import { buildRoutePaths, projectOntoPath, samplePath } from '@/lib/cta-tracks';
import type { RoutePath } from '@/lib/cta-tracks';

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const INTERP_INTERVAL_MS = 200;  // ~5fps visual update
const DEFAULT_SPEED_MPS = 9;     // ~20mph fallback when no previous data
const MAX_SPEED_MPS = 25;        // ~56mph CTA max
const LERP_DURATION_MS = 500;    // Smooth correction to actual position

/** Per-train tracking state for distance-based interpolation */
interface TrainState {
  distance: number;       // current distance along route path (meters)
  speed: number;          // estimated speed (m/s)
  timestamp: number;      // when this state was recorded
  routeCode: string;      // route this train is on
}

/** Convert interpolated train data to a GeoJSON FeatureCollection */
function trainsToGeoJSON(trains: Array<{ rn: string; rt: string; lat: number; lon: number; heading: number; destNm: string; nextStaNm: string; isDly: boolean; isApp: boolean }>) {
  return {
    type: 'FeatureCollection' as const,
    features: trains.map((t) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [t.lon, t.lat],
      },
      properties: {
        rn: t.rn,
        rt: t.rt,
        heading: t.heading,
        destNm: t.destNm,
        nextStaNm: t.nextStaNm,
        isDly: t.isDly,
        isApp: t.isApp,
      },
    })),
  };
}

export function useCTATrains(mapRef: React.RefObject<MapRef | null>) {
  const showLiveTrains = useCTAStore((s) => s.showLiveTrains);
  const setTrains = useCTAStore((s) => s.setTrains);
  const setError = useCTAStore((s) => s.setError);

  // Route polylines built from rail GeoJSON (loaded once)
  const routePathsRef = useRef<Map<string, RoutePath> | null>(null);

  // Per-train distance/speed state keyed by run number
  const trainStateRef = useRef<Map<string, TrainState>>(new Map());

  // Lerp state: for each train, the distance we're lerping FROM on new data arrival
  const lerpFromDistRef = useRef<Map<string, number>>(new Map());
  const lerpStartRef = useRef(0);

  // Current trains + last fetch time (synced from store)
  const trainsRef = useRef<CTATrain[]>([]);
  const lastFetchRef = useRef(0);

  // Sync store trains to ref
  useEffect(() => {
    return useCTAStore.subscribe((state) => {
      trainsRef.current = state.trains;
      lastFetchRef.current = state.lastFetchTime;
    });
  }, []);

  // Load rail GeoJSON and build route paths (once, on first toggle-on)
  const loadRoutePaths = useCallback(async () => {
    if (routePathsRef.current) return;
    try {
      const res = await fetch('/cta-rail-lines.geojson');
      const geojson: FeatureCollection = await res.json();
      routePathsRef.current = buildRoutePaths(geojson);
    } catch (err) {
      console.warn('Failed to load rail lines for track interpolation:', err);
    }
  }, []);

  // Fetch train positions and update distance state
  const fetchTrains = useCallback(async () => {
    try {
      // Ensure route paths are loaded
      await loadRoutePaths();
      const paths = routePathsRef.current;

      // Snapshot current interpolated distances for lerp
      const lerpFromDist = new Map<string, number>();
      if (paths) {
        const now = Date.now();
        for (const [rn, state] of trainStateRef.current) {
          const path = paths.get(state.routeCode);
          if (!path) continue;
          // Extrapolate current display distance
          const elapsed = (now - state.timestamp) / 1000;
          const currentDist = Math.max(0, Math.min(
            state.distance + state.speed * elapsed,
            path.totalLength,
          ));
          lerpFromDist.set(rn, currentDist);
        }
      }

      const trains = await fetchAllTrainPositions();

      // Update per-train distance state
      if (paths) {
        const now = Date.now();
        const newState = new Map<string, TrainState>();

        for (const t of trains) {
          const path = paths.get(t.rt);
          if (!path) continue;

          const proj = projectOntoPath(path, t.lat, t.lon);
          const prev = trainStateRef.current.get(t.rn);

          let speed = DEFAULT_SPEED_MPS;
          if (prev && prev.routeCode === t.rt) {
            const dt = (now - prev.timestamp) / 1000;
            if (dt > 0) {
              const rawSpeed = Math.abs(proj.distance - prev.distance) / dt;
              speed = Math.max(0, Math.min(rawSpeed, MAX_SPEED_MPS));
            }
          }

          newState.set(t.rn, {
            distance: proj.distance,
            speed,
            timestamp: now,
            routeCode: t.rt,
          });
        }

        trainStateRef.current = newState;
      }

      lerpFromDistRef.current = lerpFromDist;
      lerpStartRef.current = Date.now();
      setTrains(trains);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trains');
    }
  }, [setTrains, setError, loadRoutePaths]);

  // Polling
  useEffect(() => {
    if (!showLiveTrains) return;

    fetchTrains();
    const id = setInterval(fetchTrains, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [showLiveTrains, fetchTrains]);

  // Interpolation loop — updates GeoJSON source directly
  useEffect(() => {
    if (!showLiveTrains) return;

    const id = setInterval(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const source = map.getSource('cta-trains') as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;

      const trains = trainsRef.current;
      const paths = routePathsRef.current;
      if (trains.length === 0 || !paths) return;

      const now = Date.now();
      const lerpProgress = Math.min(1, (now - lerpStartRef.current) / LERP_DURATION_MS);

      const interpolated = trains.map((t) => {
        const path = paths.get(t.rt);
        const state = trainStateRef.current.get(t.rn);
        if (!path || !state) {
          // No path data — show at raw API position
          return t;
        }

        // Extrapolate distance forward from last known state
        const elapsed = (now - state.timestamp) / 1000;
        const extrapolatedDist = Math.max(0, Math.min(
          state.distance + state.speed * elapsed,
          path.totalLength,
        ));

        // Lerp from previous interpolated distance to new extrapolated distance
        let displayDist = extrapolatedDist;
        const lerpFrom = lerpFromDistRef.current.get(t.rn);
        if (lerpFrom !== undefined && lerpProgress < 1) {
          displayDist = lerpFrom + (extrapolatedDist - lerpFrom) * lerpProgress;
        }

        // Sample the path at the display distance
        const sampled = samplePath(path, displayDist);

        return {
          ...t,
          lat: sampled.lat,
          lon: sampled.lon,
          heading: sampled.heading,
        };
      });

      source.setData(trainsToGeoJSON(interpolated));
    }, INTERP_INTERVAL_MS);

    return () => clearInterval(id);
  }, [showLiveTrains, mapRef]);
}
