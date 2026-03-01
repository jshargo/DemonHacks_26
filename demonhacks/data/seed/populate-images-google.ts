/**
 * Populate image_url for places using Google Places API (New) photos.
 *
 * For each place, performs a Text Search to find the matching Google Place,
 * validates the result by name similarity, then fetches the first photo's
 * CDN URL via the getMedia endpoint.
 *
 * API calls per place:
 *   1. Text Search — finds the place + returns photos[] in one call
 *   2. getMedia (x N) — resolves each photo resource name → stable CDN photoUri
 *
 * Usage:
 *   npx tsx data/seed/populate-images-google.ts                # places missing images
 *   npx tsx data/seed/populate-images-google.ts --force        # all places (overwrite)
 *   npx tsx data/seed/populate-images-google.ts --limit=5      # test run
 *   npx tsx data/seed/populate-images-google.ts --dry-run      # preview without updating
 *   npx tsx data/seed/populate-images-google.ts --offset=100   # skip first 100
 *   npx tsx data/seed/populate-images-google.ts --concurrency=5  # custom concurrency
 *   npx tsx data/seed/populate-images-google.ts --photos-limit=5 # max photos per place
 *
 * Requires .env with:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_SERVICE_ROLE_KEY)
 *   GOOGLE_PLACES_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env ──────────────────────────────────────────────

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../../.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env file not found — rely on existing env vars
  }
}

loadEnv();

// ── Config ─────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const googleApiKey =
  process.env.GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

if (!googleApiKey) {
  console.error(
    'Missing GOOGLE_PLACES_API_KEY (or EXPO_PUBLIC_GOOGLE_PLACES_API_KEY) — get one at https://console.cloud.google.com/apis/credentials'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PLACES_API = 'https://places.googleapis.com/v1';
const PHOTO_MAX_WIDTH = 800;
const PAGE_SIZE = 1000;
const DEFAULT_CONCURRENCY = 5; // conservative — Google enforces QPS limits
const DB_BATCH_SIZE = 50;

// ── Types ──────────────────────────────────────────────────

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  image_url: string | null;
  photo_urls: string[];
}

interface GooglePhoto {
  name: string;         // e.g. "places/ChIJ.../photos/PHOTO_REF"
  widthPx: number;
  heightPx: number;
  authorAttributions: { displayName: string; uri: string }[];
}

interface GooglePlace {
  id: string;
  displayName: { text: string; languageCode: string };
  photos?: GooglePhoto[];
}

interface TextSearchResponse {
  places?: GooglePlace[];
}

interface PhotoMediaResponse {
  name: string;
  photoUri: string;
}

type SearchResult = {
  photoUri: string | null;
  photoUris: string[];
  googlePlaceId: string | null;
  status: 'hit' | 'no-match' | 'no-photos' | 'no-results' | 'error';
};

// ── Name Matching ──────────────────────────────────────────

// Only strip true filler words — keep venue-type words (bar, cafe, etc.)
// since they're often the distinguishing part of a place name.
const STOP_WORDS = new Set(['the', 'and', 'of', 'at', 'in', 'on', 'a']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Check if a Google Places result name reasonably matches our place name.
 *
 * Very lenient — the Text Search is already biased to a 500m radius around
 * the place's coordinates, so false positives are rare. We only reject
 * results that share zero resemblance.
 */
function isNameMatch(ourName: string, googleName: string): boolean {
  const ourTokens = tokenize(ourName);
  const googleTokens = tokenize(googleName);

  // Can't compare — trust the location-biased search
  if (ourTokens.length === 0 || googleTokens.length === 0) return true;

  // Any shared word (exact or substring of 3+ chars) → match
  const hasWordOverlap = ourTokens.some((w) =>
    googleTokens.some((gw) =>
      gw === w || (gw.length >= 3 && w.length >= 3 && (gw.includes(w) || w.includes(gw)))
    )
  );
  if (hasWordOverlap) return true;

  // Full-string substring check (catches abbreviations, transliterations)
  const normOur = ourName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normGoogle = googleName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normOur.length >= 4 && (normGoogle.includes(normOur) || normOur.includes(normGoogle))) {
    return true;
  }

  return false;
}

// ── Google Places API ──────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Text Search — find a Google Place by name + location, returning photos.
 */
async function textSearch(name: string, lat: number, lng: number): Promise<TextSearchResponse | null> {
  const body = {
    textQuery: `${name} Chicago`,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 500.0,
      },
    },
    maxResultCount: 1,
  };

  try {
    const res = await fetch(`${PLACES_API}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey!,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 429) {
      // Rate limited — wait and retry
      console.log('  [rate limited, waiting 5s]');
      await sleep(5_000);
      return textSearch(name, lat, lng);
    }

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as TextSearchResponse;
  } catch {
    return null;
  }
}

/**
 * Get a stable CDN URL for a photo resource name.
 */
async function getPhotoUri(photoName: string): Promise<string | null> {
  const url = `${PLACES_API}/${photoName}/media?maxWidthPx=${PHOTO_MAX_WIDTH}&skipHttpRedirect=true&key=${googleApiKey}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 429) {
      console.log('  [rate limited on photo, waiting 5s]');
      await sleep(5_000);
      return getPhotoUri(photoName);
    }

    if (!res.ok) return null;

    const data = (await res.json()) as PhotoMediaResponse;
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}

/**
 * Full lookup: Text Search → validate name → resolve all photo URIs.
 */
async function findGooglePhotos(place: Place): Promise<SearchResult> {
  const searchResult = await textSearch(place.name, place.lat, place.lng);

  if (!searchResult?.places || searchResult.places.length === 0) {
    return { photoUri: null, photoUris: [], googlePlaceId: null, status: 'no-results' };
  }

  const googlePlace = searchResult.places[0];

  if (!isNameMatch(place.name, googlePlace.displayName.text)) {
    return { photoUri: null, photoUris: [], googlePlaceId: googlePlace.id, status: 'no-match' };
  }

  if (!googlePlace.photos || googlePlace.photos.length === 0) {
    return { photoUri: null, photoUris: [], googlePlaceId: googlePlace.id, status: 'no-photos' };
  }

  // Resolve up to PHOTOS_LIMIT photo URIs, throttled to stay under 600 req/min
  const photosToResolve = googlePlace.photos.slice(0, PHOTOS_LIMIT);
  const uris: string[] = [];

  for (const photo of photosToResolve) {
    const uri = await getPhotoUri(photo.name);
    if (uri) uris.push(uri);
    // ~100ms gap between getMedia calls per worker keeps total QPS well under 600/min
    if (photosToResolve.length > 1) await sleep(100);
  }

  if (uris.length === 0) {
    return { photoUri: null, photoUris: [], googlePlaceId: googlePlace.id, status: 'error' };
  }

  return { photoUri: uris[0], photoUris: uris, googlePlaceId: googlePlace.id, status: 'hit' };
}

// ── Worker Pool ────────────────────────────────────────────

async function workerPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      await worker(items[idx], idx);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );
}

// ── Paginated Fetch ────────────────────────────────────────

async function fetchAllPlaces(force: boolean): Promise<Place[]> {
  const allPlaces: Place[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from('places')
      .select('id, name, lat, lng, category, image_url, photo_urls')
      .order('name')
      .range(offset, offset + PAGE_SIZE - 1);

    if (!force) query = query.is('image_url', null);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching places:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allPlaces.push(...(data as Place[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    console.log(`  ...fetched ${allPlaces.length} places so far`);
  }

  return allPlaces;
}

// ── Batch DB Writer ────────────────────────────────────────

async function flushUpdates(updates: { id: string; imageUrl: string; photoUrls: string[] }[]): Promise<number> {
  if (updates.length === 0) return 0;

  const results = await Promise.allSettled(
    updates.map(({ id, imageUrl, photoUrls }) =>
      supabase.from('places').update({ image_url: imageUrl, photo_urls: photoUrls }).eq('id', id)
    )
  );

  let ok = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && !r.value.error) ok++;
  }
  return ok;
}

// ── CLI Args ───────────────────────────────────────────────

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const offsetArg = process.argv.find((a) => a.startsWith('--offset='));
const OFFSET = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : DEFAULT_CONCURRENCY;
const photosLimitArg = process.argv.find((a) => a.startsWith('--photos-limit='));
const PHOTOS_LIMIT = photosLimitArg ? parseInt(photosLimitArg.split('=')[1], 10) : 10;
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('Google Places Photo Populator');
  console.log('─────────────────────────────────────────────');
  console.log(`  Concurrency: ${CONCURRENCY} workers`);
  console.log(`  Photos/place: up to ${PHOTOS_LIMIT}`);
  console.log(`  Photo width: ${PHOTO_MAX_WIDTH}px`);
  if (DRY_RUN) console.log('  (dry-run mode — no DB writes)');
  if (FORCE) console.log('  (force mode — overwriting existing images)');
  console.log();

  console.log('Fetching places from Supabase...');
  let places = await fetchAllPlaces(FORCE);

  if (OFFSET > 0) places = places.slice(OFFSET);
  if (LIMIT) places = places.slice(0, LIMIT);

  if (places.length === 0) {
    console.log('No places to process!');
    return;
  }

  const label = FORCE ? 'places (force mode)' : 'places without images';
  console.log(`Processing ${places.length} ${label}.\n`);

  // Shared stats
  let completed = 0;
  let hits = 0;
  let noResults = 0;
  let noMatch = 0;
  let noPhotos = 0;
  let errors = 0;
  let dbErrors = 0;
  let pendingUpdates: { id: string; imageUrl: string; photoUrls: string[] }[] = [];
  const startTime = Date.now();

  await workerPool(places, CONCURRENCY, async (place) => {
    completed++;
    const n = completed;

    const result = await findGooglePhotos(place);

    switch (result.status) {
      case 'hit':
        hits++;
        console.log(`[${n}/${places.length}] ${place.name} → google (${result.photoUris.length} photos)`);

        if (!DRY_RUN && result.photoUri) {
          pendingUpdates.push({ id: place.id, imageUrl: result.photoUri, photoUrls: result.photoUris });

          if (pendingUpdates.length >= DB_BATCH_SIZE) {
            const batch = pendingUpdates;
            pendingUpdates = [];
            const ok = await flushUpdates(batch);
            dbErrors += batch.length - ok;
          }
        }
        break;

      case 'no-results':
        noResults++;
        console.log(`[${n}/${places.length}] ${place.name} → no results`);
        break;

      case 'no-match':
        noMatch++;
        console.log(`[${n}/${places.length}] ${place.name} → name mismatch`);
        break;

      case 'no-photos':
        noPhotos++;
        console.log(`[${n}/${places.length}] ${place.name} → no photos`);
        break;

      case 'error':
        errors++;
        console.log(`[${n}/${places.length}] ${place.name} → error`);
        break;
    }

    // Periodic checkpoint
    if (n % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (n / parseFloat(elapsed)).toFixed(1);
      console.log(`── checkpoint ${n}/${places.length} | ${elapsed}s | ${rate}/s | hits:${hits} miss:${noResults + noMatch + noPhotos} err:${errors} ──`);
    }
  });

  // Flush remaining DB writes
  if (pendingUpdates.length > 0 && !DRY_RUN) {
    const ok = await flushUpdates(pendingUpdates);
    dbErrors += pendingUpdates.length - ok;
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n── Summary ──────────────────────────────────');
  console.log(`  Elapsed:         ${elapsed}s`);
  console.log(`  Concurrency:     ${CONCURRENCY} workers`);
  console.log(`  Hits:            ${hits}`);
  console.log(`  No results:      ${noResults}`);
  console.log(`  Name mismatch:   ${noMatch}`);
  console.log(`  No photos:       ${noPhotos}`);
  console.log(`  Errors:          ${errors}`);
  if (dbErrors > 0) console.log(`  DB errors:       ${dbErrors}`);
  console.log(`  Total processed: ${places.length}`);
  console.log(`  Hit rate:        ${((hits / places.length) * 100).toFixed(1)}%`);
  if (DRY_RUN) console.log('  (dry-run — nothing written)');
  console.log('─────────────────────────────────────────────');
}

main();
