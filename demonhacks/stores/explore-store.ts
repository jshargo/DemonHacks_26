import { create } from 'zustand';
import type { DiscoverCategory, DiscoverItem, MapBounds } from '@/lib/types';

interface ExploreState {
  searchQuery: string;
  activeCategory: DiscoverCategory;
  mapBounds: MapBounds | null;
  searchAsIMove: boolean;
  hoveredItemId: string | null;
  hoveredPinId: string | null;
  detailItem: DiscoverItem | null;

  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: DiscoverCategory) => void;
  setMapBounds: (bounds: MapBounds) => void;
  setSearchAsIMove: (enabled: boolean) => void;
  setHoveredItemId: (id: string | null) => void;
  setHoveredPinId: (id: string | null) => void;
  openDetail: (item: DiscoverItem) => void;
  closeDetail: () => void;
  patchDetailItem: (patch: Partial<DiscoverItem>) => void;
}

export const useExploreStore = create<ExploreState>((set) => ({
  searchQuery: '',
  activeCategory: 'all',
  mapBounds: null,
  searchAsIMove: true,
  hoveredItemId: null,
  hoveredPinId: null,
  detailItem: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setMapBounds: (bounds) => set({ mapBounds: bounds }),
  setSearchAsIMove: (enabled) => set({ searchAsIMove: enabled }),
  setHoveredItemId: (id) => set({ hoveredItemId: id }),
  setHoveredPinId: (id) => set({ hoveredPinId: id }),
  openDetail: (item) => set({ detailItem: item }),
  closeDetail: () => set({ detailItem: null }),
  patchDetailItem: (patch) =>
    set((state) => ({
      detailItem: state.detailItem ? { ...state.detailItem, ...patch } : null,
    })),
}));
