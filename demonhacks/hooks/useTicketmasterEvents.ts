// useTicketmasterEvents — Fetches Ticketmaster events when the overlay toggle is on.
// Auto-refreshes every 5 minutes while active.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCTAStore } from '@/stores/cta-store';
import { fetchTicketmasterEvents, type TicketmasterEvent } from '@/lib/ticketmaster';

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export function useTicketmasterEvents() {
    const showTicketmasterEvents = useCTAStore((s) => s.showTicketmasterEvents);

    const [events, setEvents] = useState<TicketmasterEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchTicketmasterEvents();
            setEvents(data);
        } catch (err) {
            console.warn('Failed to fetch Ticketmaster events:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch when toggle turns on + refresh every 5 min
    useEffect(() => {
        if (!showTicketmasterEvents) return;

        loadEvents();
        intervalRef.current = setInterval(loadEvents, REFRESH_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [showTicketmasterEvents, loadEvents]);

    // Clear interval when toggled off
    useEffect(() => {
        if (!showTicketmasterEvents && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [showTicketmasterEvents]);

    return { events, isLoading, error };
}
