import type { ContextHelperFn } from '@tambo-ai/react';
import { useMapStore } from '@/stores/map-store';
import { useExploreStore } from '@/stores/explore-store';

/**
 * Provides the current map viewport and visible bounds to Tambo as context.
 * Called on every message so the AI can make location-aware queries.
 */
export const mapContextHelper: ContextHelperFn = () => {
  const viewport = useMapStore.getState().viewport;
  const bounds = useExploreStore.getState().mapBounds;
  return JSON.stringify({
    center: { lat: viewport.latitude, lng: viewport.longitude },
    zoom: viewport.zoom,
    bounds,
  });
};
