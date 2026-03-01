// demonhacks/hooks/useRedditEvents.ts
import { useState, useEffect } from 'react';
import { fetchChicagoHappenings, RedditEvent } from '../lib/api/reddit';

export function useRedditEvents() {
  const [events, setEvents] = useState<RedditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      const data = await fetchChicagoHappenings();
      setEvents(data);
      setLoading(false);
    }
    loadEvents();
  }, []);

  return { events, loading };
}