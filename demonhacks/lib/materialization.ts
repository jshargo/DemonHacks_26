// materialization.ts — Persist Mapbox search results to Supabase via the backend.
// The backend upserts the place (deduplicating by mapbox_id) and optionally
// fetches a Google Places photo for image enrichment.

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface MaterializeParams {
  mapbox_id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category?: string;
  website?: string;
}

interface MaterializeResult {
  placeId: string;
  imageUrl: string | null;
}

/**
 * Materialize a Mapbox search result into the Supabase places table.
 * Returns the place UUID and image URL (if available).
 */
export async function materializeMapboxPlace(
  params: MaterializeParams,
): Promise<MaterializeResult> {
  const resp = await fetch(`${API_BASE}/api/places/materialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mapbox_id: params.mapbox_id,
      name: params.name,
      address: params.address ?? null,
      lat: params.lat,
      lng: params.lng,
      category: params.category ?? 'other',
      website: params.website ?? null,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Materialize failed: ${resp.status}`);
  }

  const data = await resp.json();
  return {
    placeId: data.place_id,
    imageUrl: data.image_url ?? null,
  };
}
