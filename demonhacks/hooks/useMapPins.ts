import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { parsePoint } from '@/lib/geo';
import type { EntityType, MapPin, Restaurant, Event, Activity } from '@/lib/types';

interface UseMapPinsOptions {
  entityTypes?: Set<EntityType>;
}

/** Fetch pins from restaurants, events, and activities tables */
export function useMapPins(options?: UseMapPinsOptions) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = options?.entityTypes
    ? Array.from(options.entityTypes).sort().join(',')
    : '';

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      const activeTypes = options?.entityTypes;
      const showAll = !activeTypes || activeTypes.size === 0;
      const results: MapPin[] = [];

      try {
        // Fetch restaurants
        if (showAll || activeTypes?.has('restaurant')) {
          const { data } = await supabase.from('restaurants').select('*');
          if (data) {
            for (const r of data as Restaurant[]) {
              const { lat, lng } = parsePoint(r.coordinates);
              results.push({
                id: r.id,
                entityType: 'restaurant',
                name: r.name,
                lat,
                lng,
                type: r.cuisine ?? r.type,
                description: r.discount_description,
                imageUrl: r.image_urls?.[0] ?? null,
              });
            }
          }
        }

        // Fetch events
        if (showAll || activeTypes?.has('event')) {
          const { data } = await supabase.from('events').select('*');
          if (data) {
            for (const e of data as Event[]) {
              const { lat, lng } = parsePoint(e.coordinates);
              results.push({
                id: e.id,
                entityType: 'event',
                name: e.name,
                lat,
                lng,
                type: e.type,
                description: e.description,
                imageUrl: e.image_url,
              });
            }
          }
        }

        // Fetch activities
        if (showAll || activeTypes?.has('activity')) {
          const { data } = await supabase.from('activities').select('*');
          if (data) {
            for (const a of data as Activity[]) {
              const { lat, lng } = parsePoint(a.coordinates);
              results.push({
                id: a.id,
                entityType: 'activity',
                name: a.name,
                lat,
                lng,
                type: a.type,
                description: a.description,
                imageUrl: a.image_urls?.[0] ?? null,
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
