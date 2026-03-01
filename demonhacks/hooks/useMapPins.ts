import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { EntityType, MapPin, Place, Event, PlaceCategory } from '@/lib/types';

interface UseMapPinsOptions {
  entityTypes?: Set<EntityType>;
  placeCategories?: Set<PlaceCategory>;
}

/** Fetch pins from places and events tables */
export function useMapPins(options?: UseMapPinsOptions) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = [
    options?.entityTypes ? Array.from(options.entityTypes).sort().join(',') : '',
    options?.placeCategories ? Array.from(options.placeCategories).sort().join(',') : '',
  ].join('|');

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      const activeTypes = options?.entityTypes;
      const showAll = !activeTypes || activeTypes.size === 0;
      const results: MapPin[] = [];

      try {
        // Fetch places
        if (showAll || activeTypes?.has('place')) {
          let query = supabase.from('places').select('*');

          // Apply place category filter if specified
          if (options?.placeCategories && options.placeCategories.size > 0) {
            query = query.in('category', Array.from(options.placeCategories));
          }

          const { data } = await query;
          if (data) {
            for (const p of data as Place[]) {
              results.push({
                id: p.id,
                entityType: 'place',
                name: p.name,
                lat: p.lat,
                lng: p.lng,
                category: p.category,
                subcategory: null,
                description: p.description,
                imageUrl: p.image_url,
              });
            }
          }
        }

        // Fetch events
        if (showAll || activeTypes?.has('event')) {
          const { data } = await supabase.from('events').select('*');
          if (data) {
            for (const e of data as Event[]) {
              results.push({
                id: e.id,
                entityType: 'event',
                name: e.name,
                lat: e.lat,
                lng: e.lng,
                category: null,
                subcategory: null,
                description: e.description,
                imageUrl: e.image_url,
              });
            }
          }
        }

        if (!cancelled) {
          setPins(results);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch pins');
          setLoading(false);
        }
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [filterKey]);

  return { pins, loading, error };
}
