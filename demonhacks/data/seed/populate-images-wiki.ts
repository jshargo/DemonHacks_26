/**
 * Populate image_url for places using Wikipedia editorial photos.
 *
 * Wikipedia images are curated and typically show the actual building/landmark,
 * making them superior to street-level shots for notable venues. This script
 * should run BEFORE the Mapillary script so that Wikipedia images take priority.
 *
 * Chain detection: national chains (Starbucks, McDonald's) are skipped — Mapillary
 * will handle those. Notable Chicago institutions (Lou Malnati's, Portillo's) are
 * allowlisted and still get Wikipedia images.
 *
 * Lookup strategies (ordered by confidence, stops at first hit):
 *   1. Exact title match
 *   2. Chicago-qualified titles ("{name} (Chicago)", "{name}, Chicago")
 *   3. Name variants (parentheticals, leading "The")
 *   4. Geosearch (articles near the lat/lng coordinates)
 *   5. Category-aware search ("{name}" Chicago {category_hint})
 *   6. General search ("{name}" Chicago)
 *
 * Usage:
 *   npx tsx data/seed/populate-images-wiki.ts                # places missing images
 *   npx tsx data/seed/populate-images-wiki.ts --force        # all places (overwrite)
 *   npx tsx data/seed/populate-images-wiki.ts --limit=5      # test run
 *   npx tsx data/seed/populate-images-wiki.ts --dry-run      # preview without updating
 *   npx tsx data/seed/populate-images-wiki.ts --offset=100   # skip first 100
 *   npx tsx data/seed/populate-images-wiki.ts --concurrency=20  # custom concurrency
 *
 * Requires .env with:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_SERVICE_ROLE_KEY)
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

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const THUMB_WIDTH = 800;
const USER_AGENT = 'ChicagoEventDiscoveryBot/1.0 (DemonHacks)';
const PAGE_SIZE = 1000;
const DEFAULT_CONCURRENCY = 10;
const DB_BATCH_SIZE = 50; // flush DB writes in batches

// ── Types ──────────────────────────────────────────────────

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  image_url: string | null;
}

type Strategy = 'exact' | 'chicago-qualified' | 'name-variant' | 'geosearch' | 'category-search' | 'general-search';

interface PlaceResult {
  place: Place;
  imageUrl: string | null;
  strategy: Strategy | null;
  status: 'hit' | 'miss' | 'chain-skipped';
}

// ── Chain Detection ────────────────────────────────────────

const CHAIN_ALLOWLIST = [
  'lou malnati', 'portillo', 'superdawg', 'garrett popcorn',
  'intelligentsia', 'the second city', 'giordano', 'gino\'s east',
  'pequod', 'al\'s beef', 'harold\'s chicken', 'mr beef',
  'garrett ripley', 'big star', 'frontera grill',
];

const CHAIN_SKIPLIST = [
  // Coffee
  'starbucks', 'dunkin', 'peet\'s coffee', 'caribou coffee', 'tim hortons',
  'dutch bros', 'biggby', 'scooter\'s coffee',
  // Fast food
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'chick-fil-a', 'popeyes',
  'kfc', 'arby', 'sonic drive', 'jack in the box', 'whataburger', 'carl\'s jr',
  'hardee', 'rally', 'checkers', 'white castle', 'in-n-out', 'five guys',
  'shake shack', 'wingstop', 'raising cane', 'culver',
  // Fast casual
  'chipotle', 'panera', 'qdoba', 'panda express', 'noodles & company',
  'sweetgreen', 'cava', 'mod pizza', 'blaze pizza', 'jersey mike',
  'firehouse sub', 'jimmy john', 'potbelly', 'which wich', 'mcalister',
  // Casual dining
  'applebee', 'chili\'s', 'olive garden', 'outback steakhouse', 'red lobster',
  'buffalo wild wings', 'cracker barrel', 'denny', 'ihop', 'waffle house',
  'cheesecake factory', 'red robin', 'texas roadhouse', 'longhorn steakhouse',
  'tgi friday', 'hooters', 'bob evans', 'perkins', 'golden corral',
  'bj\'s restaurant', 'yard house', 'dave & buster',
  // Pizza chains
  'domino', 'papa john', 'little caesars', 'pizza hut', 'papa murphy',
  'marco\'s pizza', 'hungry howie',
  // Ice cream / dessert
  'baskin-robbins', 'cold stone', 'dairy queen', 'häagen-dazs', 'jamba',
  'tropical smoothie', 'smoothie king', 'insomnia cookie', 'crumbl',
  // Convenience / grocery
  'walgreens', '7-eleven', 'cvs', 'circle k', 'wawa', 'sheetz',
  'casey\'s', 'pilot flying', 'love\'s travel', 'speedway', 'ampm',
  'whole foods', 'trader joe', 'aldi', 'costco', 'walmart', 'target',
  'sam\'s club', 'kroger', 'meijer', 'jewel-osco', 'mariano',
  // Retail
  'best buy', 'home depot', 'lowe\'s', 'menard', 'bed bath',
  'dollar tree', 'dollar general', 'family dollar', 'ross',
  'marshalls', 'tj maxx', 'nordstrom rack', 'burlington',
  'old navy', 'gap', 'banana republic', 'h&m', 'zara', 'forever 21',
  'foot locker', 'nike', 'adidas', 'under armour',
  'bath & body works', 'victoria\'s secret', 'ulta', 'sephora',
  'gamestop', 'barnes & noble', 'staples', 'office depot',
  // Hotels
  'hilton', 'marriott', 'hyatt', 'holiday inn', 'hampton inn',
  'courtyard by', 'fairfield inn', 'residence inn', 'springhill suites',
  'comfort inn', 'quality inn', 'best western', 'la quinta', 'motel 6',
  'super 8', 'days inn', 'ramada', 'wyndham', 'radisson',
  'doubletree', 'embassy suites', 'sheraton', 'westin', 'w hotel',
  // Banking
  'chase bank', 'bank of america', 'wells fargo', 'citibank', 'td bank',
  'pnc bank', 'us bank', 'fifth third',
  // Gas stations
  'shell', 'bp', 'exxon', 'mobil', 'chevron', 'marathon', 'sunoco',
  // Fitness
  'planet fitness', 'anytime fitness', 'la fitness', '24 hour fitness',
  'equinox', 'orangetheory',
];

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[''\u2019]/g, "'").trim();
}

function isAllowlisted(name: string): boolean {
  const norm = normalizeName(name);
  return CHAIN_ALLOWLIST.some((chain) => norm.includes(chain));
}

function isChainSkipped(name: string): boolean {
  const norm = normalizeName(name);
  return CHAIN_SKIPLIST.some((chain) => norm.includes(chain));
}

// ── Helpers ────────────────────────────────────────────────

async function wikiRequest(params: Record<string, string>): Promise<any | null> {
  const searchParams = new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  });

  try {
    const res = await fetch(`${WIKI_API}?${searchParams}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Image Quality Filters ──────────────────────────────────

const BAD_IMAGE_PATTERNS = [
  /\.svg$/i, /logo/i, /icon/i, /flag[\s_-]?of/i, /seal[\s_-]?of/i,
  /coat[\s_-]?of[\s_-]?arms/i, /emblem/i, /crest/i, /insignia/i,
  /map[\s_-]?of/i, /diagram/i, /signature/i, /autograph/i,
  /placeholder/i, /no[\s_-]?image/i, /commons[\s_-]?logo/i,
  /wiki[\s_-]?logo/i, /question[\s_-]?mark/i,
];

function isGoodImage(url: string): boolean {
  if (!url || url.length === 0) return false;
  const filename = url.split('/').pop() ?? '';
  return !BAD_IMAGE_PATTERNS.some((pattern) => pattern.test(filename));
}

// ── Title Relevance ────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'bar', 'cafe', 'grill', 'inn', 'pub', 'shop',
  'store', 'market', 'kitchen', 'house', 'room', 'lounge', 'tavern',
  'street', 'avenue', 'north', 'south', 'east', 'west',
  'chicago', 'illinois', 'degrees', 'parish',
  'hot', 'red', 'blue', 'green', 'black', 'white', 'gold',
  'old', 'new', 'big', 'little', 'first', 'second', 'third',
  'fish', 'food', 'beer', 'wine',
]);

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function isTitleRelevant(placeName: string, pageTitle: string): boolean {
  const placeWords = significantWords(placeName);
  const titleWords = significantWords(pageTitle);
  if (placeWords.length === 0) return false;

  const overlap = placeWords.filter((w) =>
    titleWords.some((tw) =>
      tw === w || (tw.length >= 5 && w.length >= 5 && (tw.includes(w) || w.includes(tw)))
    )
  );

  if (overlap.length >= 2) return true;
  if (overlap.length === 1 && overlap[0].length >= 5) return true;

  const normPlace = placeName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = pageTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normPlace.length >= 6 && (normTitle.includes(normPlace) || normPlace.includes(normTitle))) {
    return true;
  }

  return false;
}

// ── Category Hints ─────────────────────────────────────────

const CATEGORY_HINTS: Record<string, string> = {
  food_drink: 'restaurant',
  outdoors: 'park',
  shopping: 'store',
  entertainment: 'venue',
  arts_culture: 'museum',
  volunteering: 'organization',
  other: '',
};

// ── Wikipedia Lookup Strategies ────────────────────────────

function extractImage(pages: Record<string, any> | undefined): string | null {
  if (!pages) return null;
  for (const page of Object.values(pages)) {
    const p = page as any;
    if (p?.pageid && p?.thumbnail?.source && isGoodImage(p.thumbnail.source)) {
      return p.thumbnail.source;
    }
  }
  return null;
}

async function tryExactTitle(name: string): Promise<string | null> {
  const data = await wikiRequest({
    action: 'query',
    titles: name,
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
    redirects: '1',
  });
  return extractImage(data?.query?.pages);
}

async function tryChicagoQualified(name: string): Promise<string | null> {
  // Batch both variants into a single API call using pipe-separated titles
  const data = await wikiRequest({
    action: 'query',
    titles: `${name} (Chicago)|${name}, Chicago`,
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
    redirects: '1',
  });
  return extractImage(data?.query?.pages);
}

async function tryNameVariants(name: string): Promise<string | null> {
  const variants: string[] = [];

  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch) {
    variants.push(parenMatch[1].trim());
    const before = name.replace(/\s*\([^)]+\)\s*/, '').trim();
    if (before !== name && before.length > 3) variants.push(before);
  }

  if (name.startsWith('The ')) {
    variants.push(name.slice(4));
  }

  if (variants.length === 0) return null;

  // Batch all variants into a single API call
  const data = await wikiRequest({
    action: 'query',
    titles: variants.join('|'),
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
    redirects: '1',
  });
  return extractImage(data?.query?.pages);
}

async function tryGeosearch(name: string, lat: number, lng: number): Promise<string | null> {
  const data = await wikiRequest({
    action: 'query',
    generator: 'geosearch',
    ggscoord: `${lat}|${lng}`,
    ggsradius: '500',
    ggslimit: '10',
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
  });

  const pages = data?.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages) as any[]) {
    if (!page?.thumbnail?.source || !isGoodImage(page.thumbnail.source)) continue;
    if (isTitleRelevant(name, page.title)) {
      return page.thumbnail.source;
    }
  }
  return null;
}

async function tryCategorySearch(name: string, category: string): Promise<string | null> {
  const hint = CATEGORY_HINTS[category] ?? '';
  if (!hint) return null;

  const data = await wikiRequest({
    action: 'query',
    generator: 'search',
    gsrsearch: `"${name}" Chicago ${hint}`,
    gsrlimit: '3',
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
  });

  const pages = data?.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages) as any[]) {
    if (!page?.thumbnail?.source || !isGoodImage(page.thumbnail.source)) continue;
    if (isTitleRelevant(name, page.title)) {
      return page.thumbnail.source;
    }
  }
  return null;
}

async function tryGeneralSearch(name: string): Promise<string | null> {
  const data = await wikiRequest({
    action: 'query',
    generator: 'search',
    gsrsearch: `"${name}" Chicago`,
    gsrlimit: '3',
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
  });

  const pages = data?.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages) as any[]) {
    if (!page?.thumbnail?.source || !isGoodImage(page.thumbnail.source)) continue;
    if (isTitleRelevant(name, page.title)) {
      return page.thumbnail.source;
    }
  }
  return null;
}

// ── Combined Lookup ────────────────────────────────────────

async function findWikipediaImage(place: Place): Promise<{ imageUrl: string | null; strategy: Strategy | null }> {
  const { name, lat, lng, category } = place;

  let img = await tryExactTitle(name);
  if (img) return { imageUrl: img, strategy: 'exact' };

  img = await tryChicagoQualified(name);
  if (img) return { imageUrl: img, strategy: 'chicago-qualified' };

  img = await tryNameVariants(name);
  if (img) return { imageUrl: img, strategy: 'name-variant' };

  img = await tryGeosearch(name, lat, lng);
  if (img) return { imageUrl: img, strategy: 'geosearch' };

  img = await tryCategorySearch(name, category);
  if (img) return { imageUrl: img, strategy: 'category-search' };

  img = await tryGeneralSearch(name);
  if (img) return { imageUrl: img, strategy: 'general-search' };

  return { imageUrl: null, strategy: null };
}

// ── Worker Pool ────────────────────────────────────────────

/**
 * Process items concurrently using a fixed-size worker pool.
 * Workers pull from a shared index counter — no idle slots.
 */
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
      .select('id, name, lat, lng, category, image_url')
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

/**
 * Flushes accumulated image updates to Supabase in parallel.
 * Returns number of successful writes.
 */
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

// ── CLI Args ───────────────────────────────────────────────

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
  console.log('Wikipedia Place Image Populator');
  console.log('─────────────────────────────────────────────');
  console.log(`  Concurrency: ${CONCURRENCY} workers`);
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

  // Shared stats (safe — JS is single-threaded between awaits)
  let completed = 0;
  let chainSkipped = 0;
  let dbErrors = 0;
  const hitsByStrategy: Record<Strategy, number> = {
    'exact': 0, 'chicago-qualified': 0, 'name-variant': 0,
    'geosearch': 0, 'category-search': 0, 'general-search': 0,
  };
  let misses = 0;

  // Pending DB writes, flushed in batches
  let pendingUpdates: { id: string; imageUrl: string }[] = [];
  const startTime = Date.now();

  await workerPool(places, CONCURRENCY, async (place, _idx) => {
    completed++;
    const n = completed;

    // Chain detection
    if (!isAllowlisted(place.name) && isChainSkipped(place.name)) {
      chainSkipped++;
      console.log(`[${n}/${places.length}] ${place.name} → chain-skipped`);
      return;
    }

    const { imageUrl, strategy } = await findWikipediaImage(place);

    if (imageUrl && strategy) {
      hitsByStrategy[strategy]++;
      console.log(`[${n}/${places.length}] ${place.name} → wiki:${strategy}`);

      if (!DRY_RUN) {
        pendingUpdates.push({ id: place.id, imageUrl });

        // Flush when batch is full
        if (pendingUpdates.length >= DB_BATCH_SIZE) {
          const batch = pendingUpdates;
          pendingUpdates = [];
          const ok = await flushUpdates(batch);
          dbErrors += batch.length - ok;
        }
      }
    } else {
      misses++;
      console.log(`[${n}/${places.length}] ${place.name} → no-match`);
    }

    // Periodic checkpoint
    if (n % 200 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const totalHits = Object.values(hitsByStrategy).reduce((a, b) => a + b, 0);
      const rate = (n / parseFloat(elapsed)).toFixed(1);
      console.log(`── checkpoint ${n}/${places.length} | ${elapsed}s | ${rate}/s | hits:${totalHits} skip:${chainSkipped} miss:${misses} ──`);
    }
  });

  // Flush remaining DB writes
  if (pendingUpdates.length > 0 && !DRY_RUN) {
    const ok = await flushUpdates(pendingUpdates);
    dbErrors += pendingUpdates.length - ok;
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalHits = Object.values(hitsByStrategy).reduce((a, b) => a + b, 0);
  console.log('\n── Summary ──────────────────────────────────');
  console.log(`  Elapsed:          ${elapsed}s`);
  console.log(`  Concurrency:      ${CONCURRENCY} workers`);
  console.log(`  Chain-skipped:    ${chainSkipped}`);
  console.log('  Wikipedia hits:');
  for (const [strat, count] of Object.entries(hitsByStrategy)) {
    if (count > 0) console.log(`    ${strat}: ${count}`);
  }
  console.log(`  Total hits:       ${totalHits}`);
  console.log(`  No match:         ${misses}`);
  if (dbErrors > 0) console.log(`  DB errors:        ${dbErrors}`);
  console.log(`  Total processed:  ${places.length}`);
  if (DRY_RUN) console.log('  (dry-run — nothing written)');
  console.log('─────────────────────────────────────────────');
}

main();
