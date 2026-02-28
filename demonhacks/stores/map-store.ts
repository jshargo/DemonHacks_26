import { create } from 'zustand';
import { DEFAULT_VIEWPORT } from '@/lib/constants';
import type { EntityType, PlaceCategory, MapViewport, MapPin } from '@/lib/types';
import type { LightPreset } from '@/lib/chicago-light';

interface MapState {
  viewport: MapViewport;
  selectedPin: MapPin | null;
  activeFilters: Set<EntityType>;
  activePlaceCategories: Set<PlaceCategory>;
  showFilterDrawer: boolean;
  is3D: boolean;
  lightPreset: LightPreset;
  mapLoaded: boolean;
  hoveredNeighborhood: string | null;

  setViewport: (viewport: MapViewport) => void;
  selectPin: (pin: MapPin | null) => void;
  toggleFilter: (entityType: EntityType) => void;
  togglePlaceCategory: (category: PlaceCategory) => void;
  clearFilters: () => void;
  setShowFilterDrawer: (show: boolean) => void;
  toggle3D: () => void;
  setLightPreset: (preset: LightPreset) => void;
  setMapLoaded: (loaded: boolean) => void;
  setHoveredNeighborhood: (name: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  selectedPin: null,
  activeFilters: new Set(),
  activePlaceCategories: new Set(),
  showFilterDrawer: false,
  is3D: false,
  lightPreset: 'day',
  mapLoaded: false,
  hoveredNeighborhood: null,

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

  togglePlaceCategory: (category) =>
    set((state) => {
      const next = new Set(state.activePlaceCategories);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return { activePlaceCategories: next };
    }),

  clearFilters: () => set({ activeFilters: new Set(), activePlaceCategories: new Set() }),

  setShowFilterDrawer: (show) => set({ showFilterDrawer: show }),

  toggle3D: () => set((state) => ({ is3D: !state.is3D })),

  setLightPreset: (preset) => set({ lightPreset: preset }),

  setMapLoaded: (loaded) => set({ mapLoaded: loaded }),

  setHoveredNeighborhood: (name) => set({ hoveredNeighborhood: name }),
}));
