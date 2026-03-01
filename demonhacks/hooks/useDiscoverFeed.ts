// useDiscoverFeed — Supabase-first discover feed.
//
// All feed data comes from the Supabase `places` table. Mapbox search is only
// used to *find* and materialize new places into the database. The feed shows
// what's in our database, enabling bookmarks, images, ratings, and stable IDs.

import { useEffect, useState, useRef, useCallback } from 'react';
import { useExploreStore } from '@/stores/explore-store';
import { supabase } from '@/lib/supabase';
import type { DiscoverCategory, DiscoverItem, Place, PlaceCategory } from '@/lib/types';

const FETCH_DEBOUNCE_MS = 400;

/** Category sort order — determines grouping in "All" view */
const CATEGORY_ORDER: Record<string, number> = {
  food_drink: 0,
  outdoors: 1,
  entertainment: 2,
  arts_culture: 3,
  shopping: 4,
  volunteering: 5,
  other: 6,
};

/** Sort items by category, with events last */
function sortByCategory(items: DiscoverItem[]): DiscoverItem[] {
  return [...items].sort((a, b) => {
    const orderA = a.entityType === 'event' ? 5 : CATEGORY_ORDER[a.category ?? 'other'] ?? 4;
    const orderB = b.entityType === 'event' ? 5 : CATEGORY_ORDER[b.category ?? 'other'] ?? 4;
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
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCategory = useExploreStore((s) => s.activeCategory);
  const searchQuery = useExploreStore((s) => s.searchQuery);

  const patchItem = useCallback((id: string, patch: Partial<DiscoverItem>) => {
    setItems((prev) =>
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

          query = query.order('is_featured', { ascending: false }).order('name');

          const { data, error } = await query;

          if (error) {
            console.warn('Discover feed Supabase error:', error.message);
            return;
          }

          const places = (data ?? []) as Place[];
          const discoverItems = places.map(supabasePlaceToDiscoverItem);
          setItems(sortByCategory(discoverItems));
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

  return { items, count: items.length, loading, patchItem };
}
