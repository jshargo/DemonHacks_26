import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/lib/types';

/** Fetch events, optionally filtered by upcoming */
export function useEvents(options?: { upcomingOnly?: boolean }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      let query = supabase.from('events').select('*').order('time_start');

      if (options?.upcomingOnly) {
        query = query.gte('time_start', new Date().toISOString());
      }

      const { data, error: fetchError } = await query;

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents((data as Event[]) ?? []);
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [options?.upcomingOnly]);

  return { events, loading, error };
}
