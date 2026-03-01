/**
 * Populate image_url for places using free sources (no API keys needed).
 *
 * Tier 1: Wikipedia — search by name, get the page's primary image
 * Tier 2: Flickr public feed — search by name + "chicago" tags
 * Tier 3: Skip (no image found)
 *
 * Usage:
 *   npx tsx data/seed/populate-images.ts              # all places
 *   npx tsx data/seed/populate-images.ts --limit=30   # test run
 *
 * Requires .env with:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ─────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Prefer service role key (bypasses RLS) for admin writes, fall back to anon
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
const FLICKR_FEED = 'https://www.flickr.com/services/feeds/photos_public.gne';
const THUMB_WIDTH = 800;
const RATE_LIMIT_MS = 150; // polite delay between requests
const USER_AGENT = 'ChicagoEventDiscoveryBot/1.0 (DemonHacks)';

// ── Types ──────────────────────────────────────────────────

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  image_url: string | null;
}

// ── Helpers ────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safeFetch(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

// ── Tier 1: Wikipedia ──────────────────────────────────────

// Words too generic to be meaningful for Wikipedia place matching —
// these match too many unrelated articles (Robert Parish, 98 Degrees, etc.)
const STOP_WORDS = new Set([
  'the', 'and', 'bar', 'cafe', 'grill', 'inn', 'pub', 'shop',
  'store', 'market', 'kitchen', 'house', 'room', 'lounge', 'tavern',
  'street', 'avenue', 'north', 'south', 'east', 'west',
  'chicago', 'illinois', 'degrees', 'parish',
  'hot', 'red', 'blue', 'green', 'black', 'white', 'gold',
  'old', 'new', 'big', 'little', 'first', 'second', 'third',
  'fish', 'food', 'beer', 'wine',
]);

/** Extract significant words (3+ chars, not stop words) from a name, lowercased */
function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/** Check if a Wikipedia page title is relevant to the place name */
function isTitleRelevant(placeName: string, pageTitle: string): boolean {
  const placeWords = significantWords(placeName);
  const titleWords = significantWords(pageTitle);
  if (placeWords.length === 0) return false;

  // Count words that overlap (substring match in either direction)
  const overlap = placeWords.filter((w) =>
    titleWords.some((tw) => tw === w || (tw.length >= 5 && w.length >= 5 && (tw.includes(w) || w.includes(tw))))
  );

  // Require at least 2 overlapping words, or 1 if it's a long distinctive word (5+ chars)
  if (overlap.length >= 2) return true;
  if (overlap.length === 1 && overlap[0].length >= 5) return true;

  // Also accept if the normalized place name is a substring of the title or vice versa
  const normPlace = placeName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = pageTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normPlace.length >= 6 && (normTitle.includes(normPlace) || normPlace.includes(normTitle))) return true;

  return false;
}

async function getWikipediaImage(name: string): Promise<string | null> {
  // Phase 1: Try exact title lookup (most reliable)
  // Try: "Name", "Name (Chicago)", "Name, Chicago"
  const titleVariants = [
    name,
    `${name} (Chicago)`,
    `${name}, Chicago`,
  ];

  for (const title of titleVariants) {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'pageimages',
      pithumbsize: String(THUMB_WIDTH),
      format: 'json',
      origin: '*',
      redirects: '1',
    });

    const res = await safeFetch(`${WIKI_API}?${params}`);
    if (!res) continue;

    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) continue;

    const page = Object.values(pages)[0] as any;
    // Skip missing pages (id = -1)
    if (page?.pageid && page?.thumbnail?.source) {
      return page.thumbnail.source;
    }
  }

  // Phase 2: Search, but require strong title relevance
  const searchParams = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `"${name}" Chicago`,  // quote the name for exact phrase match
    gsrlimit: '3',
    prop: 'pageimages',
    pithumbsize: String(THUMB_WIDTH),
    format: 'json',
    origin: '*',
  });

  const searchRes = await safeFetch(`${WIKI_API}?${searchParams}`);
  if (!searchRes) return null;

  const searchData = await searchRes.json();
  const searchPages = searchData?.query?.pages;
  if (!searchPages) return null;

  for (const page of Object.values(searchPages) as any[]) {
    if (!page?.thumbnail?.source) continue;
    if (isTitleRelevant(name, page.title)) {
      return page.thumbnail.source;
    }
  }

  return null;
}

// ── Tier 2: Flickr public feed ─────────────────────────────

async function getFlickrImage(name: string): Promise<string | null> {
  // Flickr public feed: search by tags, no API key needed
  // Clean the name for tags: remove special chars, split into words
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const tags = `${cleanName},chicago`;

  const params = new URLSearchParams({
    tags,
    tagmode: 'all',
    format: 'json',
    nojsoncallback: '1',
  });

  const res = await safeFetch(`${FLICKR_FEED}?${params}`);
  if (!res) return null;

  try {
    const data = await res.json();
    const items = data?.items;
    if (!items || items.length === 0) return null;

    // Get the first image, upgrade from 240px (_m) to 640px (_z)
    const smallUrl: string = items[0].media?.m;
    if (!smallUrl) return null;
    return smallUrl.replace('_m.jpg', '_z.jpg');
  } catch {
    return null;
  }
}

// ── CLI args ───────────────────────────────────────────────

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const offsetArg = process.argv.find((a) => a.startsWith('--offset='));
const OFFSET = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('Fetching places without images from Supabase...');

  let query = supabase
    .from('places')
    .select('id, name, lat, lng, address, image_url')
    .is('image_url', null)
    .order('name');

  if (LIMIT) query = query.range(OFFSET, OFFSET + LIMIT - 1);

  const { data: places, error } = await query;

  if (error) {
    console.error('Error fetching places:', error);
    process.exit(1);
  }

  if (!places || places.length === 0) {
    console.log('All places already have images!');
    return;
  }

  console.log(`Found ${places.length} places without images.\n`);

  let wikiHits = 0;
  let flickrHits = 0;
  let misses = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i] as Place;
    const progress = `[${i + 1}/${places.length}]`;
    process.stdout.write(`${progress} ${place.name}... `);

    // Tier 1: Wikipedia
    let imageUrl = await getWikipediaImage(place.name);
    await sleep(RATE_LIMIT_MS);

    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('places')
        .update({ image_url: imageUrl })
        .eq('id', place.id);

      if (updateError) {
        console.log(`UPDATE FAILED: ${updateError.message}`);
      } else {
        console.log(`wiki`);
        wikiHits++;
      }
      continue;
    }

    // Tier 2: Flickr
    imageUrl = await getFlickrImage(place.name);
    await sleep(RATE_LIMIT_MS);

    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('places')
        .update({ image_url: imageUrl })
        .eq('id', place.id);

      if (updateError) {
        console.log(`UPDATE FAILED: ${updateError.message}`);
      } else {
        console.log(`flickr`);
        flickrHits++;
      }
      continue;
    }

    console.log('no image');
    misses++;
  }

  console.log('\n── Summary ──────────────────────────────────');
  console.log(`  Wikipedia: ${wikiHits}`);
  console.log(`  Flickr:    ${flickrHits}`);
  console.log(`  No image:  ${misses}`);
  console.log(`  Total:     ${places.length}`);
  console.log('─────────────────────────────────────────────');
}

main();
