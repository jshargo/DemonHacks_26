import { create } from 'zustand';
import { DEFAULT_VIEWPORT } from '@/lib/constants';
import type { EntityType, MapViewport, MapPin } from '@/lib/types';

interface MapState {
  viewport: MapViewport;
  selectedPin: MapPin | null;
  activeFilters: Set<EntityType>;
  showFilterDrawer: boolean;

  setViewport: (viewport: MapViewport) => void;
  selectPin: (pin: MapPin | null) => void;
  toggleFilter: (entityType: EntityType) => void;
  clearFilters: () => void;
  setShowFilterDrawer: (show: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  selectedPin: null,
  activeFilters: new Set(),
  showFilterDrawer: false,

  setViewport: (viewport) => set({ viewport }),

  selectPin: (pin) => set({ selectedPin: pin }),

  toggleFilter: (entityType) =>
    set((state) => {
      const next = new Set(state.activeFilters);
      if (next.has(entityType)) {
        next.delete(entityType);
      } else {
        next.add(entityType);
      }
      return { activeFilters: next };
    }),

  clearFilters: () => set({ activeFilters: new Set() }),

  setShowFilterDrawer: (show) => set({ showFilterDrawer: show }),
}));
