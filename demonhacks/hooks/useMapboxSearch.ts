// useMapboxSearch — React hook wiring the search store to debounced API calls.
// Triggers /suggest on keystrokes (300ms debounce, min 2 chars) and exposes
// all store state/actions for the SearchBar component.

import { useEffect, useRef } from 'react';
import { useSearchStore } from '@/stores/search-store';
import { searchSuggest } from '@/lib/mapbox-search';

const DEBOUNCE_MS = 300;

export function useMapboxSearch() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setSuggestions = useSearchStore((s) => s.setSuggestions);
  const setIsSearching = useSearchStore((s) => s.setIsSearching);
  const sessionToken = useSearchStore((s) => s.sessionToken);
  const suggestions = useSearchStore((s) => s.suggestions);
  const isSearching = useSearchStore((s) => s.isSearching);
  const isRetrieving = useSearchStore((s) => s.isRetrieving);
  const selectedResult = useSearchStore((s) => s.selectedResult);
  const showDropdown = useSearchStore((s) => s.showDropdown);
  const selectSuggestion = useSearchStore((s) => s.selectSuggestion);
  const clearSearch = useSearchStore((s) => s.clearSearch);
  const dismissDropdown = useSearchStore((s) => s.dismissDropdown);
  const clearSelectedResult = useSearchStore((s) => s.clearSelectedResult);

  // Debounced suggest on query change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    suggestAbortRef.current?.abort();
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      suggestAbortRef.current = controller;
      const requestSeq = ++requestSeqRef.current;

      try {
        const results = await searchSuggest(trimmedQuery, sessionToken, {
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestSeq !== requestSeqRef.current) return;
        setSuggestions(results);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn('[useMapboxSearch] suggest failed:', err);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted && requestSeq === requestSeqRef.current) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      suggestAbortRef.current?.abort();
    };
  }, [query, sessionToken, setSuggestions, setIsSearching]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      suggestAbortRef.current?.abort();
      setIsSearching(false);
    },
    [setIsSearching],
  );

  return {
    query,
    setQuery,
    suggestions,
    isSearching,
    isRetrieving,
    selectedResult,
    showDropdown,
    selectSuggestion,
    clearSearch,
    dismissDropdown,
    clearSelectedResult,
  };
}
