/**
 * Clean up Supabase places table — remove chains, non-explorable venues,
 * and true duplicates to trim the dataset before paying for images.
 *
 * Three phases (applied in order):
 *   1. Chain removal — national chains from CHAIN_SKIPLIST (unless allowlisted)
 *   2. Non-explorable keyword removal — liquor stores, auto repair, etc.
 *   3. True duplicate dedup — same normalized name + address
 *
 * Usage:
 *   npx tsx data/seed/cleanup-places.ts            # dry-run (default)
 *   npx tsx data/seed/cleanup-places.ts --execute   # actually delete
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

const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 50;

// ── Types ──────────────────────────────────────────────────

interface Place {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  image_url: string | null;
  website_url: string | null;
  created_at: string;
}

// ── Chain Detection (from populate-images-wiki.ts) ─────────

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
  // Subway (sandwich chain)
  'subway',
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

// ── Phase 2: Non-Explorable Keywords ───────────────────────

const NON_EXPLORABLE_PATTERNS = [
  // Liquor / tobacco
  /\bliquor\b/i,
  /\bsmoke\s*shop\b/i,
  /\bvape\b/i,
  /\btobacco\b/i,
  /\bcigar\s*store\b/i,
  // Financial
  /\bcheck\s*cash/i,
  /\bcurrency\s*exchange\b/i,
  /\bpawn\b/i,
  /\bpayday\b/i,
  /\bbail\s*bond/i,
  // Automotive
  /\bauto\s*repair\b/i,
  /\bcar\s*wash\b/i,
  /\btowing\b/i,
  /\btire\s*shop\b/i,
  /\boil\s*change\b/i,
  /\bauto\s*parts\b/i,
  // Services
  /\blaundromat\b/i,
  /\bdry\s*clean/i,
  /\blocksmith\b/i,
  /\bstorage\s*unit/i,
  /\bmoving\s*company\b/i,
  // Professional
  /\blaw\s*office\b/i,
  /\battorney\s*at\b/i,
  /\btax\s*service\b/i,
  /\binsurance\s*agency\b/i,
  // Parking
  /\bparking\s*lot\b/i,
  /\bparking\s*garage\b/i,
  // Dollar stores
  /\bdollar\s*tree\b/i,
  /\bdollar\s*general\b/i,
  /\bfamily\s*dollar\b/i,
  // Cell / wireless
  /\bboost\s*mobile\b/i,
  /\bcricket\s*wireless\b/i,
  /\bmetro\s*by\s*t-mobile\b/i,
];

function isNonExplorable(name: string): boolean {
  return NON_EXPLORABLE_PATTERNS.some((pattern) => pattern.test(name));
}

// ── Phase 3: Dedup Normalization ───────────────────────────

function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bwest\b/g, 'w')
    .replace(/\beast\b/g, 'e')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/\billino[a-z]*/g, '')
    .replace(/\bunited\s*states\b/g, '')
    .replace(/\bchicago\b/g, '')
    .replace(/\b\d{5}(-\d{4})?\b/g, '') // zip codes
    .replace(/,/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNameForDedup(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''\u2019]s\b/g, '') // remove possessives
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Paginated Fetch ────────────────────────────────────────

async function fetchAllPlaces(): Promise<Place[]> {
  const allPlaces: Place[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, address, description, image_url, website_url, created_at')
      .order('name')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching places:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allPlaces.push(...(data as Place[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allPlaces;
}

// ── FK Cleanup + Batched Delete ────────────────────────────

// Tables that need FK cleanup before deleting places.
// SET NULL tables have a nullable place_id FK column.
// DELETE tables have a NOT NULL item_id/target_id column.
const SET_NULL_TABLES = ['checkins', 'events', 'signals'] as const;
const DELETE_FK_TABLES = [
  { table: 'saved_items', typeCol: 'item_type', idCol: 'item_id' },
  { table: 'quest_steps', typeCol: 'target_type', idCol: 'target_id' },
] as const;

/**
 * Probe which FK tables we actually have write access to.
 * Run once at startup to avoid spamming "permission denied" per batch.
 */
async function probeWritableTables(): Promise<{
  nullableTables: string[];
  deleteTables: typeof DELETE_FK_TABLES[number][];
}> {
  const skipped: string[] = [];

  // Probe SET NULL tables with a no-op update (filter guarantees 0 rows)
  const nullableResults = await Promise.all(
    SET_NULL_TABLES.map(async (table) => {
      const { error } = await supabase
        .from(table)
        .update({ place_id: null })
        .eq('place_id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        skipped.push(table);
        return null;
      }
      return table;
    })
  );
  const nullableTables: string[] = nullableResults.filter((t) => t !== null) as string[];

  // Probe DELETE tables
  const deleteResults = await Promise.all(
    DELETE_FK_TABLES.map(async (spec) => {
      const { error } = await supabase
        .from(spec.table)
        .delete()
        .eq(spec.typeCol, 'place')
        .eq(spec.idCol, '00000000-0000-0000-0000-000000000000');
      if (error) {
        skipped.push(spec.table);
        return null;
      }
      return spec;
    })
  );
  const deleteTables = deleteResults.filter((t) => t !== null) as typeof DELETE_FK_TABLES[number][];

  if (skipped.length > 0) {
    console.log(`  Note: no write access to [${skipped.join(', ')}] — FK cleanup skipped for those tables`);
    console.log('  (use SUPABASE_SERVICE_ROLE_KEY for full access)\n');
  }

  return { nullableTables, deleteTables };
}

// Cached after probing — set in main()
let writableNullableTables: string[] = [];
let writableDeleteTables: typeof DELETE_FK_TABLES[number][] = [];

/**
 * Clean up FK references then delete a batch of place IDs.
 */
async function deletePlaceBatch(ids: string[], dryRun: boolean): Promise<number> {
  if (ids.length === 0) return 0;
  if (dryRun) return ids.length;

  // 1. SET NULL on nullable FK columns (only tables we have access to)
  await Promise.all(
    writableNullableTables.map((table) =>
      supabase.from(table).update({ place_id: null }).in('place_id', ids)
    )
  );

  // 2. DELETE from tables with NOT NULL item_id / target_id
  await Promise.all(
    writableDeleteTables.map((spec) =>
      supabase.from(spec.table).delete().eq(spec.typeCol, 'place').in(spec.idCol, ids)
    )
  );

  // 3. Delete the places
  const { error } = await supabase.from('places').delete().in('id', ids);
  if (error) {
    console.error('  Delete error:', error.message);
    return 0;
  }

  return ids.length;
}

/**
 * Delete IDs in batches, with FK cleanup before each batch.
 */
async function batchDelete(ids: string[], dryRun: boolean, label: string): Promise<number> {
  let deleted = 0;
  const totalBatches = Math.ceil(ids.length / DELETE_BATCH_SIZE);

  for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
    const batch = ids.slice(i, i + DELETE_BATCH_SIZE);
    const count = await deletePlaceBatch(batch, dryRun);
    deleted += count;

    if (!dryRun && i + DELETE_BATCH_SIZE < ids.length) {
      const batchNum = Math.floor(i / DELETE_BATCH_SIZE) + 1;
      process.stdout.write(`  ${label}: ${deleted}/${ids.length} deleted (batch ${batchNum}/${totalBatches})\r`);
    }
  }

  if (!dryRun && ids.length > DELETE_BATCH_SIZE) {
    // Clear the progress line and print final count
    process.stdout.write(`  ${label}: ${deleted}/${ids.length} deleted${' '.repeat(20)}\n`);
  }

  return deleted;
}

// ── Phase 3: Pick Best Row from Duplicate Group ────────────

function scorePlaceQuality(p: Place): number {
  let score = 0;
  if (p.description) score += 4;
  if (p.image_url) score += 2;
  if (p.website_url) score += 1;
  return score;
}

function pickBestPlace(group: Place[]): Place {
  return group.sort((a, b) => {
    const scoreDiff = scorePlaceQuality(b) - scorePlaceQuality(a);
    if (scoreDiff !== 0) return scoreDiff;
    // Earlier created_at wins (as tiebreaker)
    return a.created_at.localeCompare(b.created_at);
  })[0];
}

// ── CLI Args ───────────────────────────────────────────────

const EXECUTE = process.argv.includes('--execute');
const DRY_RUN = !EXECUTE;

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('Places Cleanup Script');
  console.log('─────────────────────────────────────────────');
  if (DRY_RUN) {
    console.log('  Mode: DRY RUN (use --execute to apply changes)');
  } else {
    console.log('  Mode: EXECUTE (changes will be applied!)');
  }
  console.log();

  // Probe FK table permissions once
  if (!DRY_RUN) {
    console.log('Probing table permissions...');
    const writable = await probeWritableTables();
    writableNullableTables = writable.nullableTables;
    writableDeleteTables = writable.deleteTables;
  }

  // Fetch all places
  console.log('Fetching all places...');
  const allPlaces = await fetchAllPlaces();
  const totalBefore = allPlaces.length;
  console.log(`  Total places: ${totalBefore}\n`);

  // Track which IDs to remove (Set prevents double-counting across phases)
  const removedIds = new Set<string>();

  // ── Phase 1: Chain Removal ────────────────────────────────

  console.log('Phase 1: Chain Removal');
  console.log('──────────────────────');

  const chainIds: string[] = [];
  const chainCounts: Record<string, number> = {};

  for (const place of allPlaces) {
    if (!isAllowlisted(place.name) && isChainSkipped(place.name)) {
      chainIds.push(place.id);
      removedIds.add(place.id);

      // Track which chain pattern matched for reporting
      const norm = normalizeName(place.name);
      const matched = CHAIN_SKIPLIST.find((chain) => norm.includes(chain)) ?? 'unknown';
      chainCounts[matched] = (chainCounts[matched] || 0) + 1;
    }
  }

  // Print top chain matches
  const sortedChains = Object.entries(chainCounts).sort((a, b) => b[1] - a[1]);
  for (const [chain, count] of sortedChains.slice(0, 20)) {
    console.log(`  ${chain}: ${count}`);
  }
  if (sortedChains.length > 20) {
    console.log(`  ... and ${sortedChains.length - 20} more chain patterns`);
  }

  console.log(`  → Phase 1 total: ${chainIds.length} places\n`);

  const phase1Deleted = await batchDelete(chainIds, DRY_RUN, 'Phase 1');

  // ── Phase 2: Non-Explorable Keyword Removal ───────────────

  console.log('Phase 2: Non-Explorable Keyword Removal');
  console.log('───────────────────────────────────────');

  const keywordIds: string[] = [];
  const keywordCounts: Record<string, number> = {};

  for (const place of allPlaces) {
    if (removedIds.has(place.id)) continue; // already marked by Phase 1

    if (isNonExplorable(place.name)) {
      keywordIds.push(place.id);
      removedIds.add(place.id);

      // Track which pattern matched
      const matched = NON_EXPLORABLE_PATTERNS.find((p) => p.test(place.name));
      const label = matched?.source ?? 'unknown';
      keywordCounts[label] = (keywordCounts[label] || 0) + 1;
    }
  }

  const sortedKeywords = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedKeywords) {
    console.log(`  ${pattern}: ${count}`);
  }

  console.log(`  → Phase 2 total: ${keywordIds.length} places\n`);

  const phase2Deleted = await batchDelete(keywordIds, DRY_RUN, 'Phase 2');

  // ── Phase 3: True Duplicate Dedup ─────────────────────────

  console.log('Phase 3: True Duplicate Dedup');
  console.log('─────────────────────────────');

  // Only consider places that survived Phases 1 & 2
  const surviving = allPlaces.filter((p) => !removedIds.has(p.id));

  // Group by normalized name + normalized address
  const dedupGroups = new Map<string, Place[]>();

  for (const place of surviving) {
    if (!place.address) continue; // can't dedup without address

    const normName = normalizeNameForDedup(place.name);
    const normAddr = normalizeAddress(place.address);
    // Skip if normalization produced empty strings (e.g. address was just "Chicago, IL")
    if (!normName || !normAddr || normAddr.length < 3) continue;

    const key = `${normName}||${normAddr}`;
    const group = dedupGroups.get(key);
    if (group) {
      group.push(place);
    } else {
      dedupGroups.set(key, [place]);
    }
  }

  const dupIds: string[] = [];
  let dupGroups = 0;

  for (const [, group] of dedupGroups) {
    if (group.length < 2) continue;

    const best = pickBestPlace(group);
    const losers = group.filter((p) => p.id !== best.id);

    if (losers.length === 0) continue; // shouldn't happen, but guard

    dupGroups++;
    if (dupGroups <= 15) {
      console.log(`  "${best.name}" — keeping 1, removing ${losers.length} duplicate(s)`);
    }

    for (const loser of losers) {
      dupIds.push(loser.id);
      removedIds.add(loser.id);
    }
  }

  if (dupGroups > 15) {
    console.log(`  ... and ${dupGroups - 15} more duplicate groups`);
  }

  console.log(`  → Phase 3 total: ${dupIds.length} places (from ${dupGroups} groups)\n`);

  const phase3Deleted = await batchDelete(dupIds, DRY_RUN, 'Phase 3');

  // ── Summary ───────────────────────────────────────────────

  const totalRemoved = removedIds.size;
  const totalAfter = totalBefore - totalRemoved;

  console.log('── Summary ──────────────────────────────────');
  console.log(`  Before:          ${totalBefore}`);
  console.log(`  Phase 1 (chains):     -${chainIds.length}`);
  console.log(`  Phase 2 (keywords):   -${keywordIds.length}`);
  console.log(`  Phase 3 (duplicates): -${dupIds.length}`);
  console.log(`  Total removed:   ${totalRemoved}`);
  console.log(`  After:           ${totalAfter}`);
  if (DRY_RUN) {
    console.log('\n  (DRY RUN — nothing was deleted. Use --execute to apply.)');
  } else {
    console.log(`\n  Deleted: ${phase1Deleted + phase2Deleted + phase3Deleted} places`);
  }
  console.log('─────────────────────────────────────────────');
}

main().catch(console.error);
