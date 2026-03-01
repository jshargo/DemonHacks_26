import { create } from 'zustand';

export type FilterCategory =
    | 'food_drink'
    | 'outdoors'
    | 'entertainment'
    | 'arts_culture'
    | 'events'
    | 'shopping'
    | 'volunteering';

export type DistanceFrom = 'divvy' | 'cta_train' | 'bus_stop';

interface FilterState {
    isModalOpen: boolean;
    selectedCategory: FilterCategory | null;
    selectedNeighborhood: string | null;
    selectedDistanceFrom: DistanceFrom | null;

    openModal: () => void;
    closeModal: () => void;
    setCategory: (cat: FilterCategory | null) => void;
    setNeighborhood: (n: string | null) => void;
    setDistanceFrom: (d: DistanceFrom | null) => void;
    clearAll: () => void;
    /** Number of active filters (0–3) */
    activeCount: () => number;
}

export const useFilterStore = create<FilterState>((set, get) => ({
    isModalOpen: false,
    selectedCategory: null,
    selectedNeighborhood: null,
    selectedDistanceFrom: null,

    openModal: () => set({ isModalOpen: true }),
    closeModal: () => set({ isModalOpen: false }),

    setCategory: (cat) => set({ selectedCategory: cat }),
    setNeighborhood: (n) => set({ selectedNeighborhood: n }),
    setDistanceFrom: (d) => set({ selectedDistanceFrom: d }),

    clearAll: () =>
        set({
            selectedCategory: null,
            selectedNeighborhood: null,
            selectedDistanceFrom: null,
        }),

    activeCount: () => {
        const s = get();
        let c = 0;
        if (s.selectedCategory) c++;
        if (s.selectedNeighborhood) c++;
        if (s.selectedDistanceFrom) c++;
        return c;
    },
}));
