// ─── Ticketmaster API Types & Fetch ─────────────────────────────────────────
// Talks to our backend proxy at /api/ticketmaster/events

const BACKEND_URL =
    typeof process !== 'undefined' && (process.env as Record<string, string>).EXPO_PUBLIC_BACKEND_URL
        ? (process.env as Record<string, string>).EXPO_PUBLIC_BACKEND_URL
        : 'http://localhost:8000';

/** A single event returned from the Ticketmaster backend proxy */
export interface TicketmasterEvent {
    id: string;
    name: string;
    url: string;
    imageUrl: string | null;
    startDate: string | null;
    venueName: string | null;
    lat: number | null;
    lng: number | null;
    segment: string | null;
    genre: string | null;
    subGenre: string | null;
}

interface TicketmasterEventsResponse {
    events: TicketmasterEvent[];
}

/**
 * Fetch Ticketmaster events for Chicago from the backend proxy.
 * @param keyword  Optional search keyword (e.g. "Bulls", "concerts")
 * @param classificationName  Optional classification filter (e.g. "Sports", "Music")
 * @param size  Number of results (default 50)
 */
export async function fetchTicketmasterEvents(
    keyword?: string,
    classificationName?: string,
    size = 200,
): Promise<TicketmasterEvent[]> {
    const params = new URLSearchParams({ size: String(size) });
    if (keyword) params.set('keyword', keyword);
    if (classificationName) params.set('classificationName', classificationName);

    const res = await fetch(`${BACKEND_URL}/api/ticketmaster/events?${params.toString()}`);
    if (!res.ok) {
        throw new Error(`Ticketmaster API error: ${res.status} ${res.statusText}`);
    }

    const data: TicketmasterEventsResponse = await res.json();
    // Only return events that have valid coordinates
    return data.events.filter((e) => e.lat != null && e.lng != null);
}
