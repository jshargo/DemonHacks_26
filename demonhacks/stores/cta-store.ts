import { create } from 'zustand';
import type { CTATrain, CTATrainDetail } from '@/lib/cta';

interface CTAState {
  // Visibility toggles
  showRailLines: boolean;
  showRailStations: boolean;
  showBusRoutes: boolean;
  showBusStops: boolean;
  showLiveTrains: boolean;
  showDivvyStations: boolean;
  showPedwayRoutes: boolean;
  showTicketmasterEvents: boolean;
  ticketmasterDateFilter: 'today' | 'tomorrow' | 'week';
  ticketmasterGenreFilter: Set<string>; // empty = show all

  // Live train data
  trains: CTATrain[];
  prevTrains: Map<string, CTATrain>; // keyed by run number, for interpolation
  lastFetchTime: number;
  selectedTrain: CTATrain | null;
  trainDetail: CTATrainDetail | null;
  isLoadingDetail: boolean;
  error: string | null;

  // Actions
  toggleRailLines: () => void;
  toggleRailStations: () => void;
  toggleBusRoutes: () => void;
  toggleBusStops: () => void;
  toggleLiveTrains: () => void;
  toggleDivvyStations: () => void;
  togglePedwayRoutes: () => void;
  toggleTicketmasterEvents: () => void;
  setTicketmasterDateFilter: (filter: 'today' | 'tomorrow' | 'week') => void;
  toggleTicketmasterGenre: (genre: string) => void;
  setTrains: (trains: CTATrain[]) => void;
  selectTrain: (train: CTATrain | null) => void;
  setTrainDetail: (detail: CTATrainDetail | null) => void;
  setIsLoadingDetail: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCTAStore = create<CTAState>((set, get) => ({
  showRailLines: false,
  showRailStations: false,
  showBusRoutes: false,
  showBusStops: false,
  showLiveTrains: false,
  showDivvyStations: false,
  showPedwayRoutes: false,
  showTicketmasterEvents: false,
  ticketmasterDateFilter: 'week',
  ticketmasterGenreFilter: new Set<string>(),
  trains: [],
  prevTrains: new Map(),
  lastFetchTime: 0,
  selectedTrain: null,
  trainDetail: null,
  isLoadingDetail: false,
  error: null,

  toggleRailLines: () =>
    set((s) => {
      const next = !s.showRailLines;
      // Toggling rail on also shows stations by default
      return { showRailLines: next, showRailStations: next };
    }),

  toggleRailStations: () => set((s) => ({ showRailStations: !s.showRailStations })),

  toggleBusRoutes: () =>
    set((s) => {
      const next = !s.showBusRoutes;
      return { showBusRoutes: next, showBusStops: next };
    }),

  toggleBusStops: () => set((s) => ({ showBusStops: !s.showBusStops })),

  toggleLiveTrains: () =>
    set((s) => {
      const next = !s.showLiveTrains;
      // Toggling trains on also enables rail lines for context
      if (next && !s.showRailLines) {
        return { showLiveTrains: next, showRailLines: true, showRailStations: true };
      }
      return { showLiveTrains: next };
    }),

  toggleDivvyStations: () => set((s) => ({ showDivvyStations: !s.showDivvyStations })),

  togglePedwayRoutes: () => set((s) => ({ showPedwayRoutes: !s.showPedwayRoutes })),

  toggleTicketmasterEvents: () => set((s) => ({ showTicketmasterEvents: !s.showTicketmasterEvents })),

  setTicketmasterDateFilter: (filter) => set({ ticketmasterDateFilter: filter }),

  toggleTicketmasterGenre: (genre) => set((s) => {
    const next = new Set(s.ticketmasterGenreFilter);
    if (next.has(genre)) next.delete(genre); else next.add(genre);
    return { ticketmasterGenreFilter: next };
  }),

  setTrains: (trains) =>
    set((s) => {
      // Move current trains to prevTrains for interpolation
      const prev = new Map<string, CTATrain>();
      for (const t of s.trains) {
        prev.set(t.rn, t);
      }
      return { trains, prevTrains: prev, lastFetchTime: Date.now(), error: null };
    }),

  selectTrain: (train) => set({ selectedTrain: train, trainDetail: null }),

  setTrainDetail: (detail) => set({ trainDetail: detail, isLoadingDetail: false }),

  setIsLoadingDetail: (loading) => set({ isLoadingDetail: loading }),

  setError: (error) => set({ error }),
}));
