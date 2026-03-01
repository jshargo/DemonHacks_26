// useDiscoverFeed — Supabase-first discover feed.
//
// All feed data comes from the Supabase `places` table. Mapbox search is only
// used to *find* and materialize new places into the database. The feed shows
// what's in our database, enabling bookmarks, images, ratings, and stable IDs.

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useExploreStore } from '@/stores/explore-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { supabase } from '@/lib/supabase';
import type { DiscoverCategory, DiscoverItem, Place, PlaceCategory } from '@/lib/types';

const FETCH_DEBOUNCE_MS = 400;

/** Fallback sort order when no preference matches */
const CATEGORY_ORDER: Record<string, number> = {
  food_drink: 0,
  outdoors: 1,
  entertainment: 2,
  arts_culture: 3,
  shopping: 4,
  volunteering: 5,
  other: 6,
};

/** Maps onboarding category IDs → Supabase PlaceCategory values */
const ONBOARDING_TO_PLACE_CATEGORY: Record<string, PlaceCategory> = {
  'live-music': 'entertainment',
  'sports': 'entertainment',
  'arts-culture': 'arts_culture',
  'food-drink': 'food_drink',
  'coffee-cafes': 'food_drink',
  'outdoors': 'outdoors',
  'nightlife': 'entertainment',
  'family': 'entertainment',
  'markets-festivals': 'entertainment',
  'fitness': 'other',
};

/**
 * Sort items so that those matching the user's preferred categories come first.
 * Within the same tier, preserves Supabase ordering (featured → alphabetical).
 */
function sortByPreference(
  items: DiscoverItem[],
  preferredPlaceCategories: Set<string>,
): DiscoverItem[] {
  return [...items].sort((a, b) => {
    const aMatch = a.category && preferredPlaceCategories.has(a.category) ? 1 : 0;
    const bMatch = b.category && preferredPlaceCategories.has(b.category) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    // Fallback: use predefined category order, events last
    const orderA = a.entityType === 'event' ? 99 : CATEGORY_ORDER[a.category ?? 'other'] ?? 98;
    const orderB = b.entityType === 'event' ? 99 : CATEGORY_ORDER[b.category ?? 'other'] ?? 98;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

/** Convert a Supabase Place row to a DiscoverItem */
function supabasePlaceToDiscoverItem(place: Place): DiscoverItem {
  return {
    id: place.id,
    entityType: 'place',
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    category: place.category,
    subcategory: null,
    description: place.description,
    imageUrl: place.image_url,
    neighborhood: place.address ?? '',
    rating: null,
    priceRange: null,
    tags: [],
    startsAt: null,
    endsAt: null,
    venueName: null,
    attendingCount: null,
    websiteUrl: place.website_url,
    mapboxId: place.mapbox_id ?? undefined,
    placeFormatted: place.address ?? undefined,
  };
}

/** Map DiscoverCategory to a Supabase PlaceCategory filter */
function categoryToFilter(category: DiscoverCategory): PlaceCategory | null {
  switch (category) {
    case 'food_drink':
    case 'outdoors':
    case 'shopping':
    case 'volunteering':
    case 'entertainment':
    case 'arts_culture':
      return category;
    case 'all':
    case 'events':
    default:
      return null;
  }
}

export function useDiscoverFeed(): {
  items: DiscoverItem[];
  count: number;
  loading: boolean;
  patchItem: (id: string, patch: Partial<DiscoverItem>) => void;
} {
  // allItems holds the full Supabase result; bounds filtering happens client-side
  const [allItems, setAllItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCategory = useExploreStore((s) => s.activeCategory);
  const searchQuery = useExploreStore((s) => s.searchQuery);
  const mapBounds = useExploreStore((s) => s.mapBounds);
  const searchAsIMove = useExploreStore((s) => s.searchAsIMove);

  const selectedCategories = usePreferencesStore((s) => s.selectedCategories);
  const preferredPlaceCategories = useMemo(() => {
    const result = new Set<string>();
    for (const catId of selectedCategories) {
      const mapped = ONBOARDING_TO_PLACE_CATEGORY[catId];
      if (mapped) result.add(mapped);
    }
    return result;
  }, [selectedCategories]);

  const patchItem = useCallback((id: string, patch: Partial<DiscoverItem>) => {
    setAllItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      fetchFeed();

      async function fetchFeed() {
        setLoading(true);

        try {
          let query = supabase.from('places').select('*');

          // Category filter
          const categoryFilter = categoryToFilter(activeCategory);
          if (categoryFilter) {
            query = query.eq('category', categoryFilter);
          }

          // Text search filter
          const trimmedSearch = searchQuery.trim();
          if (trimmedSearch.length > 0) {
            query = query.or(
              `name.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%`,
            );
          }

          // Supabase default page limit is 1000 — explicit here to make it visible
          query = query.order('is_featured', { ascending: false }).order('name').limit(1000);

          const { data, error } = await query;

          if (error) {
            console.warn('Discover feed Supabase error:', error.message);
            return;
          }

          const places = (data ?? []) as Place[];
          setAllItems(places.map(supabasePlaceToDiscoverItem));
        } catch (err) {
          console.warn('Discover feed error:', err);
        } finally {
          setLoading(false);
        }
      }
    }, FETCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeCategory, searchQuery]);

  // Filter by bounds, then sort by user preference
  const items = useMemo(() => {
    const bounded =
      searchAsIMove && mapBounds
        ? allItems.filter(
            (item) =>
              item.lat >= mapBounds.south &&
              item.lat <= mapBounds.north &&
              item.lng >= mapBounds.west &&
              item.lng <= mapBounds.east,
          )
        : allItems;
    return sortByPreference(bounded, preferredPlaceCategories);
  }, [allItems, mapBounds, searchAsIMove, preferredPlaceCategories]);

  return { items, count: items.length, loading, patchItem };
}
