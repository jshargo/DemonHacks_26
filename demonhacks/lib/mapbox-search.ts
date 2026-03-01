// Mapbox Search Box API client.
// Production-focused implementation:
// - typed response parsing
// - timeout + abort propagation
// - session token helpers for suggest/retrieve flow
// - validated poi_category filters for category discovery

import { MAPBOX_ACCESS_TOKEN } from './mapbox';
import { CHICAGO_CENTER, CHICAGO_BOUNDS } from './constants';
import type { SearchSuggestion, SearchResult, DiscoverCategory, MapBounds } from './types';

const BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';
const REQUEST_TIMEOUT_MS = 5000;
const LIST_CATEGORY_TIMEOUT_MS = 3500;
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_COUNTRY = 'US';
const MAX_SUGGEST_LIMIT = 10;
const DEFAULT_DISCOVER_LIMIT = 10;

/** Proximity string for Chicago center (lng,lat format) */
const PROXIMITY = `${CHICAGO_CENTER.longitude},${CHICAGO_CENTER.latitude}`;
/** Bounding box string for Chicago limits (minLng,minLat,maxLng,maxLat) */
const CHICAGO_BBOX = `${CHICAGO_BOUNDS[0][0]},${CHICAGO_BOUNDS[0][1]},${CHICAGO_BOUNDS[1][0]},${CHICAGO_BOUNDS[1][1]}`;

type JsonRecord = Record<string, unknown>;

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface MapboxCoordinatesObject {
  longitude?: number;
  latitude?: number;
}

interface MapboxContextItem {
  name?: string;
}

interface MapboxSuggestItem {
  mapbox_id?: string;
  name?: string;
  feature_type?: string;
  place_formatted?: string;
  full_address?: string;
  address?: string;
  poi_category?: string | string[];
  maki?: string;
  center?: MapboxCoordinatesObject;
  coordinates?: MapboxCoordinatesObject;
  context?: {
    neighborhood?: MapboxContextItem | MapboxContextItem[];
    place?: MapboxContextItem | MapboxContextItem[];
    district?: MapboxContextItem | MapboxContextItem[];
  };
}

interface MapboxSuggestResponse {
  suggestions?: MapboxSuggestItem[];
}

interface MapboxRetrieveFeature {
  geometry?: {
    coordinates?: unknown;
  };
  properties?: {
    mapbox_id?: string;
    name?: string;
    address?: string;
    full_address?: string;
    place_formatted?: string;
    category?: string | string[];
    poi_category?: string | string[];
    metadata?: {
      phone?: string;
      website?: string;
      open_hours?: JsonRecord;
    };
  };
}

interface MapboxRetrieveResponse {
  features?: MapboxRetrieveFeature[];
}

interface MapboxListCategoryResponse {
  categories?: Array<string | { canonical_id?: string; id?: string; category?: string }>;
}

interface SuggestOptions {
  limit?: number;
  types?: string;
  country?: string;
  language?: string;
  signal?: AbortSignal;
}

interface RetrieveOptions {
  language?: string;
  signal?: AbortSignal;
}

type MapboxDiscoverCategory = DiscoverCategory;
type PoiFilterCategory = 'all' | 'food_drink' | 'outdoors' | 'shopping';

const MAPBOX_CATEGORY_CANDIDATES: Record<Exclude<PoiFilterCategory, 'all'>, readonly string[]> = {
  food_drink: ['restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery', 'fast_food', 'ice_cream'],
  outdoors: ['park', 'garden', 'playground', 'nature_reserve', 'trailhead', 'sports_center', 'beach'],
  shopping: ['shopping_mall', 'market', 'supermarket', 'clothing_store', 'book_store', 'gift_shop', 'department_store'],
};

const DISCOVER_DEFAULT_QUERY: Record<MapboxDiscoverCategory, string> = {
  all: 'places',
  food_drink: 'restaurant',
  outdoors: 'park',
  shopping: 'shopping',
  events: 'event venue',
  volunteering: 'community center',
};

const DISCOVER_FALLBACK_QUERY: Record<MapboxDiscoverCategory, string> = {
  all: 'restaurant',
  food_drink: 'food',
  outdoors: 'outdoors',
  shopping: 'store',
  events: 'theater',
  volunteering: 'nonprofit',
};

const FALLBACK_CATEGORY_SET = new Set(
  Object.values(MAPBOX_CATEGORY_CANDIDATES).flat().map((value) => value.toLowerCase()),
);

let cachedPoiCategoryCatalog: Set<string> | null = null;
let poiCategoryCatalogPromise: Promise<Set<string>> | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeCategoryId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePoiCategories(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const unique = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const normalized = normalizeCategoryId(entry);
    if (normalized.length > 0) unique.add(normalized);
  }
  return [...unique];
}

function extractCoordinates(
  primary?: MapboxCoordinatesObject,
  fallback?: MapboxCoordinatesObject,
): { lng: number; lat: number } | null {
  const lng = primary?.longitude ?? fallback?.longitude;
  const lat = primary?.latitude ?? fallback?.latitude;
  if (typeof lng !== 'number' || !Number.isFinite(lng)) return null;
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function extractGeometryCoordinates(
  coordinates: unknown,
): { lng: number; lat: number } | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = coordinates[0];
  const lat = coordinates[1];
  if (typeof lng !== 'number' || !Number.isFinite(lng)) return null;
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function extractString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function mapSuggestItem(item: MapboxSuggestItem): SearchSuggestion | null {
  const mapboxId = extractString(item.mapbox_id);
  const name = extractString(item.name);
  if (!mapboxId || !name) return null;

  const poiCategories = normalizePoiCategories(item.poi_category);
  const coords = extractCoordinates(item.center, item.coordinates);

  return {
    mapbox_id: mapboxId,
    name,
    feature_type: extractString(item.feature_type) ?? 'poi',
    place_formatted:
      extractString(item.place_formatted)
      ?? extractString(item.full_address)
      ?? extractString(item.address)
      ?? '',
    category: poiCategories[0],
    poi_categories: poiCategories,
    maki: extractString(item.maki),
    lng: coords?.lng,
    lat: coords?.lat,
  };
}

function extractContextItemName(
  value: MapboxContextItem | MapboxContextItem[] | undefined,
): { name: string } | undefined {
  if (!value) return undefined;

  const target = Array.isArray(value) ? value[0] : value;
  const name = extractString(target?.name);
  if (!name) return undefined;
  return { name };
}

async function fetchJson<T>(
  path: string,
  params: URLSearchParams,
  options: RequestOptions = {},
): Promise<T | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null;

  const { signal, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) controller.abort();

  try {
    const response = await fetch(`${BASE_URL}${path}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      let reason = '';
      try {
        reason = await response.text();
      } catch {
        // ignore parse failure for diagnostics
      }
      console.warn(
        `[mapbox-search] ${path} failed (${response.status})${reason ? `: ${reason}` : ''}`,
      );
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn(`[mapbox-search] ${path} request error:`, error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

function buildBaseSuggestParams(query: string, limit: number, language: string): URLSearchParams {
  return new URLSearchParams({
    q: query,
    access_token: MAPBOX_ACCESS_TOKEN,
    proximity: PROXIMITY,
    bbox: CHICAGO_BBOX,
    country: DEFAULT_COUNTRY,
    language,
    limit: String(limit),
  });
}

function extractCategoryIds(payload: unknown, out: Set<string>): void {
  if (Array.isArray(payload)) {
    for (const item of payload) extractCategoryIds(item, out);
    return;
  }

  if (typeof payload === 'string') {
    const normalized = normalizeCategoryId(payload);
    if (/^[a-z0-9_]+$/.test(normalized)) out.add(normalized);
    return;
  }

  if (!isRecord(payload)) return;

  const directCandidates = [
    payload.canonical_id,
    payload.id,
    payload.category,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = normalizeCategoryId(candidate);
    if (/^[a-z0-9_]+$/.test(normalized)) out.add(normalized);
  }

  const nestedKeys = ['categories', 'children', 'subcategories', 'items', 'results', 'data'];
  for (const key of nestedKeys) {
    extractCategoryIds(payload[key], out);
  }
}

async function getPoiCategoryCatalog(): Promise<Set<string>> {
  if (cachedPoiCategoryCatalog) return cachedPoiCategoryCatalog;
  if (poiCategoryCatalogPromise) return poiCategoryCatalogPromise;

  poiCategoryCatalogPromise = (async () => {
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      language: DEFAULT_LANGUAGE,
    });

    const data = await fetchJson<MapboxListCategoryResponse | unknown>(
      '/list/category',
      params,
      { timeoutMs: LIST_CATEGORY_TIMEOUT_MS },
    );

    const extracted = new Set<string>();
    extractCategoryIds(data, extracted);
    if (extracted.size === 0) return new Set(FALLBACK_CATEGORY_SET);
    return extracted;
  })();

  try {
    const result = await poiCategoryCatalogPromise;
    cachedPoiCategoryCatalog = result;
    return result;
  } finally {
    poiCategoryCatalogPromise = null;
  }
}

function isPoiFilterCategory(category: DiscoverCategory): category is PoiFilterCategory {
  return category === 'all' || category === 'food_drink' || category === 'outdoors' || category === 'shopping';
}

function getPoiCategoryCandidates(category: PoiFilterCategory): string[] {
  if (category === 'all') {
    return [...new Set(Object.values(MAPBOX_CATEGORY_CANDIDATES).flat())];
  }
  if (category === 'food_drink' || category === 'outdoors' || category === 'shopping') {
    return [...MAPBOX_CATEGORY_CANDIDATES[category]];
  }
  return [];
}

async function resolvePoiCategoryFilter(category: DiscoverCategory): Promise<string[]> {
  if (!isPoiFilterCategory(category)) return [];
  const candidates = getPoiCategoryCandidates(category).map(normalizeCategoryId);
  if (candidates.length === 0) return [];

  const catalog = await getPoiCategoryCatalog();
  const validated = candidates.filter((entry) => catalog.has(entry));
  return validated.length > 0 ? [...new Set(validated)] : [...new Set(candidates)];
}

// ─── Session Token ──────────────────────────────────────────────────────────

/** Generate a token for Search Box session billing (suggest → retrieve). */
export function createSearchSession(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// ─── Suggest ────────────────────────────────────────────────────────────────

/**
 * Fetch autocomplete suggestions from Search Box /suggest.
 * Returns [] on error.
 */
export async function searchSuggest(
  query: string,
  sessionToken: string,
  options: SuggestOptions = {},
): Promise<SearchSuggestion[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2 || !MAPBOX_ACCESS_TOKEN) return [];

  const limit = clamp(options.limit ?? 8, 1, MAX_SUGGEST_LIMIT);
  const params = buildBaseSuggestParams(
    trimmedQuery,
    limit,
    options.language ?? DEFAULT_LANGUAGE,
  );
  params.set('types', options.types ?? 'poi,address,place');
  params.set('country', options.country ?? DEFAULT_COUNTRY);
  params.set('session_token', sessionToken);

  const data = await fetchJson<MapboxSuggestResponse>('/suggest', params, {
    signal: options.signal,
  });

  if (!data?.suggestions?.length) return [];
  return data.suggestions
    .map(mapSuggestItem)
    .filter((item): item is SearchSuggestion => item !== null);
}

// ─── Retrieve ───────────────────────────────────────────────────────────────

/**
 * Retrieve full feature details from Search Box /retrieve.
 * Returns null on error.
 */
export async function searchRetrieve(
  mapboxId: string,
  sessionToken: string,
  options: RetrieveOptions = {},
): Promise<SearchResult | null> {
  const id = mapboxId.trim();
  if (!id || !MAPBOX_ACCESS_TOKEN) return null;

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    language: options.language ?? DEFAULT_LANGUAGE,
    session_token: sessionToken,
  });

  const data = await fetchJson<MapboxRetrieveResponse>(
    `/retrieve/${encodeURIComponent(id)}`,
    params,
    { signal: options.signal },
  );

  const feature = data?.features?.[0];
  if (!feature) return null;

  const props = feature.properties ?? {};
  const coords = extractGeometryCoordinates(feature.geometry?.coordinates);
  if (!coords) return null;

  const poiCategories = normalizePoiCategories(props.poi_category ?? props.category);
  const metadata = props.metadata ?? {};
  const rawHours = metadata.open_hours;
  const hours: Record<string, string> | undefined = isRecord(rawHours)
    ? Object.fromEntries(
        Object.entries(rawHours).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : undefined;

  const name = extractString(props.name);
  if (!name) return null;

  const address = extractString(props.address) ?? '';
  return {
    mapbox_id: extractString(props.mapbox_id) ?? id,
    name,
    address,
    full_address:
      extractString(props.full_address)
      ?? extractString(props.place_formatted)
      ?? address,
    lng: coords.lng,
    lat: coords.lat,
    category: poiCategories[0],
    poi_categories: poiCategories,
    phone: extractString(metadata.phone),
    website: extractString(metadata.website),
    hours,
  };
}

// ─── Category Discovery ────────────────────────────────────────────────────
// Used by the discover feed to populate cards and map pins with live POIs.

/** Whether a DiscoverCategory should query Mapbox (vs only Supabase). */
export function isMapboxCategory(category: DiscoverCategory): boolean {
  return category === 'all'
    || category === 'food_drink'
    || category === 'outdoors'
    || category === 'shopping'
    || category === 'events'
    || category === 'volunteering';
}

export interface DiscoverPOIResult {
  mapbox_id: string;
  name: string;
  place_formatted: string;
  feature_type: string;
  lat: number;
  lng: number;
  category?: string;
  poi_categories: string[];
  context?: {
    neighborhood?: { name: string };
    place?: { name: string };
    district?: { name: string };
  };
}

function mapDiscoverPoi(item: MapboxSuggestItem): DiscoverPOIResult | null {
  const mapped = mapSuggestItem(item);
  if (!mapped) return null;

  return {
    mapbox_id: mapped.mapbox_id,
    name: mapped.name,
    place_formatted: mapped.place_formatted,
    feature_type: mapped.feature_type,
    category: mapped.category,
    poi_categories: mapped.poi_categories ?? [],
    lng: mapped.lng ?? 0,
    lat: mapped.lat ?? 0,
    context: {
      neighborhood: extractContextItemName(item.context?.neighborhood),
      place: extractContextItemName(item.context?.place),
      district: extractContextItemName(item.context?.district),
    },
  };
}

/**
 * Discover POIs by app category + optional text query within bounds.
 * Uses /suggest with precise poi_category filtering.
 */
export async function discoverPOIs(options: {
  query?: string;
  category: DiscoverCategory;
  bounds?: MapBounds;
  limit?: number;
  sessionToken?: string;
  signal?: AbortSignal;
}): Promise<DiscoverPOIResult[]> {
  const { query, category, bounds, limit = DEFAULT_DISCOVER_LIMIT, sessionToken, signal } = options;
  if (!isMapboxCategory(category) || !MAPBOX_ACCESS_TOKEN) return [];

  const mapboxCategory = category as MapboxDiscoverCategory;
  const trimmedQuery = query?.trim() ?? '';
  const q = trimmedQuery.length > 0 ? trimmedQuery : DISCOVER_DEFAULT_QUERY[mapboxCategory];
  const effectiveSessionToken = sessionToken?.trim() || createSearchSession();

  const clampedLimit = clamp(limit, 1, MAX_SUGGEST_LIMIT);
  const poiCategoryFilter = await resolvePoiCategoryFilter(category);

  async function runSuggest(seedQuery: string): Promise<DiscoverPOIResult[]> {
    const params = new URLSearchParams({
      q: seedQuery,
      access_token: MAPBOX_ACCESS_TOKEN,
      session_token: effectiveSessionToken,
      proximity: PROXIMITY,
      country: DEFAULT_COUNTRY,
      types: 'poi',
      limit: String(clampedLimit),
      language: DEFAULT_LANGUAGE,
    });

    if (poiCategoryFilter.length > 0) {
      params.set('poi_category', poiCategoryFilter.join(','));
    }

    if (bounds) {
      params.set('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
    } else {
      params.set('bbox', CHICAGO_BBOX);
    }

    const data = await fetchJson<MapboxSuggestResponse>('/suggest', params, { signal });
    if (!data?.suggestions?.length) return [];

    return data.suggestions
      .map(mapDiscoverPoi)
      .filter((item): item is DiscoverPOIResult => item !== null);
  }

  const primaryResults = await runSuggest(q);
  if (primaryResults.length > 0) return primaryResults;
  if (trimmedQuery.length > 0) return [];

  const fallbackQuery = DISCOVER_FALLBACK_QUERY[mapboxCategory];
  if (!fallbackQuery || fallbackQuery === q) return [];
  return runSuggest(fallbackQuery);
}
