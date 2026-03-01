// useCTATrains — Polls CTA Train Tracker API and interpolates train positions.
// Updates the Mapbox GeoJSON source directly (bypasses React render cycle).

import { useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { fetchAllTrainPositions } from '@/lib/cta';
import { useCTAStore } from '@/stores/cta-store';
import type { CTATrain } from '@/lib/cta';

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const INTERP_INTERVAL_MS = 200;  // ~5fps visual update
const TRAIN_SPEED_MPS = 9;       // ~20mph average CTA train speed
const LERP_DURATION_MS = 500;    // Snap-to-actual lerp time

/** Convert train positions to a GeoJSON FeatureCollection */
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

/** Extrapolate a position forward from heading + speed + elapsed time */
function extrapolate(lat: number, lon: number, heading: number, elapsedSec: number) {
  const distance = TRAIN_SPEED_MPS * elapsedSec;
  const headingRad = (heading * Math.PI) / 180;
  // Heading: 0=N, 90=E, 180=S, 270=W
  const newLat = lat + (distance / 111320) * Math.cos(headingRad);
  const newLon = lon + (distance / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(headingRad);
  return { lat: newLat, lon: newLon };
}

export function useCTATrains(mapRef: React.RefObject<MapRef | null>) {
  const showLiveTrains = useCTAStore((s) => s.showLiveTrains);
  const setTrains = useCTAStore((s) => s.setTrains);
  const setError = useCTAStore((s) => s.setError);

  // Refs to avoid stale closures in intervals
  const trainsRef = useRef<CTATrain[]>([]);
  const lastFetchRef = useRef(0);
  const lerpStartRef = useRef(0);
  const lerpFromRef = useRef<Map<string, { lat: number; lon: number }>>(new Map());

  // Sync store trains to ref
  useEffect(() => {
    return useCTAStore.subscribe((state) => {
      trainsRef.current = state.trains;
      lastFetchRef.current = state.lastFetchTime;
    });
  }, []);

  // Fetch train positions
  const fetchTrains = useCallback(async () => {
    try {
      // Snapshot current interpolated positions for lerp
      const now = Date.now();
      const elapsed = (now - lastFetchRef.current) / 1000;
      const lerpFrom = new Map<string, { lat: number; lon: number }>();
      for (const t of trainsRef.current) {
        const pos = extrapolate(t.lat, t.lon, t.heading, elapsed);
        lerpFrom.set(t.rn, pos);
      }

      const trains = await fetchAllTrainPositions();
      lerpFromRef.current = lerpFrom;
      lerpStartRef.current = Date.now();
      setTrains(trains);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trains');
    }
  }, [setTrains, setError]);

  // Polling
  useEffect(() => {
    if (!showLiveTrains) return;

    fetchTrains(); // Initial fetch
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
      if (trains.length === 0) return;

      const now = Date.now();
      const elapsedSinceFetch = (now - lastFetchRef.current) / 1000;
      const lerpProgress = Math.min(1, (now - lerpStartRef.current) / LERP_DURATION_MS);

      const interpolated = trains.map((t) => {
        // Extrapolate from actual API position
        const extrapolated = extrapolate(t.lat, t.lon, t.heading, elapsedSinceFetch);

        // If we have a previous interpolated position, lerp from it
        const lerpFrom = lerpFromRef.current.get(t.rn);
        if (lerpFrom && lerpProgress < 1) {
          // During lerp: blend old extrapolated → new actual position
          const targetWithExtrapolation = extrapolated;
          return {
            ...t,
            lat: lerpFrom.lat + (targetWithExtrapolation.lat - lerpFrom.lat) * lerpProgress,
            lon: lerpFrom.lon + (targetWithExtrapolation.lon - lerpFrom.lon) * lerpProgress,
          };
        }

        return { ...t, ...extrapolated };
      });

      source.setData(trainsToGeoJSON(interpolated));
    }, INTERP_INTERVAL_MS);

    return () => clearInterval(id);
  }, [showLiveTrains, mapRef]);
}
