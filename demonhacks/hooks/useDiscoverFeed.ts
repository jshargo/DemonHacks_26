// useDiscoverFeed — Mapbox-only discover feed.
//
// Data sources by category:
//   all categories → Mapbox Search Box API (live POIs)
//
// Mapbox suggestions are lightweight (name, address, neighborhood).
// Full details are fetched via /retrieve when opening a detail panel.

import { useEffect, useState, useRef } from 'react';
import { useExploreStore } from '@/stores/explore-store';
import { useSearchStore } from '@/stores/search-store';
import {
  discoverPOIs,
  isMapboxCategory,
  type DiscoverPOIResult,
} from '@/lib/mapbox-search';
import type { DiscoverCategory, DiscoverItem, PlaceCategory } from '@/lib/types';

const FETCH_DEBOUNCE_MS = 400;

/** Category sort order — determines grouping in "All" view */
const CATEGORY_ORDER: Record<string, number> = {
  food_drink: 0,
  outdoors: 1,
  shopping: 2,
  volunteering: 3,
  other: 4,
};

/** Sort items by category, with events last (they have category=null) */
function sortByCategory(items: DiscoverItem[]): DiscoverItem[] {
  return [...items].sort((a, b) => {
    const orderA = a.entityType === 'event' ? 5 : CATEGORY_ORDER[a.category ?? 'other'] ?? 4;
    const orderB = b.entityType === 'event' ? 5 : CATEGORY_ORDER[b.category ?? 'other'] ?? 4;
    if (orderA !== orderB) return orderA - orderB;
    // Within same category, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}

/** Map Mapbox POI categories to our app PlaceCategory. */
function mapboxCategoryToPlace(categories: readonly string[]): PlaceCategory | null {
  if (categories.length === 0) return null;
  const normalized = categories.map((entry) => entry.toLowerCase());

  if (normalized.some((c) => ['restaurant', 'cafe', 'bar', 'fast_food', 'bakery', 'coffee_shop', 'ice_cream', 'food_court'].some((k) => c.includes(k)))) {
    return 'food_drink';
  }
  if (normalized.some((c) => ['park', 'garden', 'playground', 'beach', 'nature', 'trail', 'sports'].some((k) => c.includes(k)))) {
    return 'outdoors';
  }
  if (normalized.some((c) => ['shop', 'mall', 'market', 'clothing', 'book_store', 'gift', 'supermarket', 'store'].some((k) => c.includes(k)))) {
    return 'shopping';
  }
  return 'other';
}

/** Convert a Mapbox suggestion to a DiscoverItem */
function mapboxToDiscoverItem(
  poi: DiscoverPOIResult,
  activeCategory: DiscoverCategory,
  sessionToken: string,
): DiscoverItem {
  const categories = poi.poi_categories.length > 0
    ? poi.poi_categories
    : poi.category
      ? [poi.category]
      : [];

  let mappedCategory = mapboxCategoryToPlace(categories);
  if (activeCategory === 'volunteering') mappedCategory = 'volunteering';
  if (activeCategory === 'events') mappedCategory = 'other';

  return {
    id: `mbx-${poi.mapbox_id}`,
    entityType: 'place',
    name: poi.name,
    lat: poi.lat,
    lng: poi.lng,
    category: mappedCategory,
    subcategory:
      categories[0]
      ?? (activeCategory === 'events' ? 'event_venue' : null),
    description: null,
    imageUrl: null,
    neighborhood: poi.context?.neighborhood?.name ?? poi.context?.place?.name ?? '',
    rating: null,
    priceRange: null,
    tags: [],
    startsAt: null,
    endsAt: null,
    venueName: null,
    attendingCount: null,
    websiteUrl: null,
    // Store mapbox_id for later /retrieve calls
    mapboxId: poi.mapbox_id,
    mapboxSessionToken: sessionToken,
    placeFormatted: poi.place_formatted,
  };
}

export function useDiscoverFeed(): { items: DiscoverItem[]; count: number; loading: boolean } {
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeCategory = useExploreStore((s) => s.activeCategory);
  const searchQuery = useExploreStore((s) => s.searchQuery);
  const mapBounds = useExploreStore((s) => s.mapBounds);
  const searchAsIMove = useExploreStore((s) => s.searchAsIMove);
  const sessionToken = useSearchStore((s) => s.sessionToken);

  useEffect(() => {
    // Debounce fetches
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      // Cancel previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetchFeed();

      async function fetchFeed() {
        setLoading(true);

        const results: DiscoverItem[] = [];
        const bounds = searchAsIMove ? mapBounds ?? undefined : undefined;

        try {
          // ── Mapbox POIs (all discover categories) ──
          if (isMapboxCategory(activeCategory)) {
            const sessionTokenForRequest = sessionToken;
            const pois = await discoverPOIs({
              query: searchQuery,
              category: activeCategory,
              bounds,
              sessionToken: sessionTokenForRequest,
              signal: controller.signal,
            });

            if (!controller.signal.aborted) {
              results.push(...pois.map((poi) => mapboxToDiscoverItem(poi, activeCategory, sessionTokenForRequest)));
            }
          }

          if (!controller.signal.aborted) {
            setItems(sortByCategory(results));
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            console.warn('Discover feed error:', err);
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      }
    }, FETCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [activeCategory, searchQuery, mapBounds, searchAsIMove, sessionToken]);

  return { items, count: items.length, loading };
}
