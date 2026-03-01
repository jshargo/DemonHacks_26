// Search store — Zustand state for Mapbox Search Box API interactions.
// Manages query text, autocomplete suggestions, and selected POI result.

import { create } from 'zustand';
import { createSearchSession, searchRetrieve } from '@/lib/mapbox-search';
import { materializeMapboxPlace } from '@/lib/materialization';
import type { SearchSuggestion, SearchResult } from '@/lib/types';

let retrieveRequestSeq = 0;

interface SearchState {
  query: string;
  suggestions: SearchSuggestion[];
  selectedResult: SearchResult | null;
  isSearching: boolean;
  isRetrieving: boolean;
  sessionToken: string;
  showDropdown: boolean;

  setQuery: (query: string) => void;
  setSuggestions: (items: SearchSuggestion[]) => void;
  selectSuggestion: (suggestion: SearchSuggestion) => Promise<void>;
  setSelectedResult: (result: SearchResult | null) => void;
  rotateSessionToken: () => void;
  clearSearch: () => void;
  setIsSearching: (searching: boolean) => void;
  dismissDropdown: () => void;
  clearSelectedResult: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  suggestions: [],
  selectedResult: null,
  isSearching: false,
  isRetrieving: false,
  sessionToken: createSearchSession(),
  showDropdown: false,

  setQuery: (query) => set({ query, showDropdown: query.trim().length >= 2 }),

  setSuggestions: (items) => set({ suggestions: items, showDropdown: items.length > 0 }),

  selectSuggestion: async (suggestion) => {
    const requestSeq = ++retrieveRequestSeq;
    const sessionToken = get().sessionToken;

    set({
      isRetrieving: true,
      showDropdown: false,
      query: suggestion.name,
    });

    let result: SearchResult | null = null;
    try {
      result = await searchRetrieve(suggestion.mapbox_id, sessionToken);
    } catch (err) {
      console.warn('[search-store] retrieve failed:', err);
    }

    if (requestSeq !== retrieveRequestSeq) return;

    set({
      selectedResult: result,
      isRetrieving: false,
      suggestions: [],
      sessionToken: createSearchSession(),
    });

    // Materialize the place into Supabase (fire-and-forget)
    if (result) {
      materializeMapboxPlace({
        mapbox_id: suggestion.mapbox_id,
        name: result.name,
        address: result.full_address,
        lat: result.lat,
        lng: result.lng,
        category: result.category,
        website: result.website,
      }).catch((err) => {
        console.warn('[search-store] materialize failed:', err);
      });
    }
  },

  setSelectedResult: (result) =>
    set({
      selectedResult: result,
      // Keep search input state unchanged for programmatic selections
      // (e.g. feed card clicks) so we don't trigger suggest/dropdown UI.
      isRetrieving: false,
      showDropdown: false,
      suggestions: [],
    }),

  rotateSessionToken: () => set({ sessionToken: createSearchSession() }),

  clearSearch: () => {
    retrieveRequestSeq += 1;
    set({
      query: '',
      suggestions: [],
      selectedResult: null,
      isSearching: false,
      isRetrieving: false,
      showDropdown: false,
      sessionToken: createSearchSession(),
    });
  },

  setIsSearching: (searching) => set({ isSearching: searching }),

  dismissDropdown: () => set({ showDropdown: false }),

  clearSelectedResult: () => set({ selectedResult: null }),
}));
