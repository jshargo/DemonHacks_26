/**
 * Populate image_url for places using Mapillary street-level imagery.
 *
 * For each place, searches for nearby Mapillary images using the place's
 * lat/lng coordinates with progressive bbox expansion, picks the closest
 * non-panoramic image, and stores its 1024px thumbnail URL.
 *
 * Usage:
 *   npx tsx data/seed/populate-images-mapillary.ts                # places missing images
 *   npx tsx data/seed/populate-images-mapillary.ts --force        # all places (overwrite)
 *   npx tsx data/seed/populate-images-mapillary.ts --limit=5      # test run
 *   npx tsx data/seed/populate-images-mapillary.ts --dry-run      # preview without updating
 *   npx tsx data/seed/populate-images-mapillary.ts --concurrency=20  # custom concurrency
 *
 * Requires .env with:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_SERVICE_ROLE_KEY)
 *   MAPILLARY_ACCESS_TOKEN         (from https://mapillary.com/dashboard/developers)
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
const mapillaryToken = process.env.MAPILLARY_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

if (!mapillaryToken) {
  console.error(
    'Missing MAPILLARY_ACCESS_TOKEN — get one at https://mapillary.com/dashboard/developers'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MAPILLARY_API = 'https://graph.mapillary.com';
// Progressive search radii in degrees (~111m, ~333m, ~555m at Chicago's ~41.8°N)
const SEARCH_RADII = [0.001, 0.003, 0.005];
const IMAGE_FIELDS = 'id,thumb_1024_url,thumb_2048_url,computed_geometry,is_pano,captured_at';
const PAGE_SIZE = 1000;
const DEFAULT_CONCURRENCY = 10;
const DB_BATCH_SIZE = 50;

// ── Types ──────────────────────────────────────────────────

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image_url: string | null;
}

interface MapillaryImage {
  id: string;
  thumb_1024_url?: string;
  thumb_2048_url?: string;
  computed_geometry?: { type: 'Point'; coordinates: [number, number] };
  is_pano: boolean;
  captured_at: number;
}

// ── Helpers ────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeBbox(lat: number, lng: number, radius: number): string {
  return [lng - radius, lat - radius, lng + radius, lat + radius].join(',');
}

// ── Mapillary Image Search ─────────────────────────────────

async function findMapillaryImage(lat: number, lng: number): Promise<string | null> {
  for (const radius of SEARCH_RADII) {
    const bbox = makeBbox(lat, lng, radius);
    const url = `${MAPILLARY_API}/images?bbox=${bbox}&fields=${IMAGE_FIELDS}&limit=50&access_token=${mapillaryToken}`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      continue;
    }

    if (res.status === 429) {
      console.log(' [rate limited, waiting 5s]');
      await sleep(5_000);
      return findMapillaryImage(lat, lng);
    }
    if (!res.ok) continue;

    let data: { data?: MapillaryImage[] };
    try {
      data = await res.json();
    } catch {
      continue;
    }

    const images = data?.data;
    if (!images || images.length === 0) continue;

    const scored = images
      .filter((img) => img.thumb_1024_url || img.thumb_2048_url)
      .map((img) => {
        const [imgLng, imgLat] = img.computed_geometry?.coordinates ?? [lng, lat];
        return { ...img, distance: haversine(lat, lng, imgLat, imgLng) };
      })
      .sort((a, b) => {
        if (a.is_pano !== b.is_pano) return a.is_pano ? 1 : -1;
        return a.distance - b.distance;
      });

    if (scored.length > 0) {
      const best = scored[0];
      return best.thumb_1024_url ?? best.thumb_2048_url ?? null;
    }
  }

  return null;
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
      .select('id, name, lat, lng, image_url')
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

async function flushUpdates(updates: { id: string; imageUrl: string }[]): Promise<number> {
  if (updates.length === 0) return 0;

  const results = await Promise.allSettled(
    updates.map(({ id, imageUrl }) =>
      supabase.from('places').update({ image_url: imageUrl }).eq('id', id)
    )
  );

  let ok = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && !r.value.error) ok++;
  }
  return ok;
}

// ── CLI args ───────────────────────────────────────────────

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const offsetArg = process.argv.find((a) => a.startsWith('--offset='));
const OFFSET = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : DEFAULT_CONCURRENCY;
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('Mapillary Place Image Populator');
  console.log('─────────────────────────────────────────────');
  console.log(`  Concurrency: ${CONCURRENCY} workers`);
  if (DRY_RUN) console.log('  (dry-run mode — no DB writes)');
  if (FORCE) console.log('  (force mode — overwriting existing images)');
  console.log();

  console.log('Fetching places from Supabase...');
  let places = await fetchAllPlaces(FORCE);

  if (OFFSET > 0) places = places.slice(OFFSET);
  if (LIMIT) places = places.slice(0, LIMIT);

  if (!places || places.length === 0) {
    console.log('All places already have images!');
    return;
  }

  const label = FORCE ? 'places (force mode)' : 'places without images';
  console.log(`Processing ${places.length} ${label}.\n`);

  // Shared stats
  let completed = 0;
  let hits = 0;
  let misses = 0;
  let dbErrors = 0;
  let pendingUpdates: { id: string; imageUrl: string }[] = [];
  const startTime = Date.now();

  await workerPool(places, CONCURRENCY, async (place) => {
    completed++;
    const n = completed;

    const imageUrl = await findMapillaryImage(place.lat, place.lng);

    if (imageUrl) {
      hits++;
      console.log(`[${n}/${places.length}] ${place.name} → mapillary`);

      if (!DRY_RUN) {
        pendingUpdates.push({ id: place.id, imageUrl });

        if (pendingUpdates.length >= DB_BATCH_SIZE) {
          const batch = pendingUpdates;
          pendingUpdates = [];
          const ok = await flushUpdates(batch);
          dbErrors += batch.length - ok;
        }
      }
    } else {
      misses++;
      console.log(`[${n}/${places.length}] ${place.name} → no image`);
    }

    // Periodic checkpoint
    if (n % 200 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (n / parseFloat(elapsed)).toFixed(1);
      console.log(`── checkpoint ${n}/${places.length} | ${elapsed}s | ${rate}/s | hits:${hits} miss:${misses} ──`);
    }
  });

  // Flush remaining
  if (pendingUpdates.length > 0 && !DRY_RUN) {
    const ok = await flushUpdates(pendingUpdates);
    dbErrors += pendingUpdates.length - ok;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n── Summary ──────────────────────────────────');
  console.log(`  Elapsed:     ${elapsed}s`);
  console.log(`  Concurrency: ${CONCURRENCY} workers`);
  console.log(`  Mapillary:   ${hits}`);
  console.log(`  No image:    ${misses}`);
  if (dbErrors > 0) console.log(`  DB errors:   ${dbErrors}`);
  console.log(`  Total:       ${places.length}`);
  if (DRY_RUN) console.log('  (dry-run — nothing written)');
  console.log('─────────────────────────────────────────────');
}

main();
