import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  } catch {}
}
loadEnv();

const sb = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { count } = await sb.from('places').select('*', { count: 'exact', head: true });
  console.log('Total places:', count);

  // Test what columns exist
  const { data: sample, error: sampleErr } = await sb.from('places').select('*').limit(1);
  if (sampleErr) { console.log('Sample error:', sampleErr); return; }
  console.log('Columns:', Object.keys(sample![0]).join(', '));

  // Paginated fetch — only columns that exist in schema
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from('places').select('id, category, name, address').order('name').range(offset, offset + 999);
    if (error) { console.log('Fetch error:', error); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log('Fetched for analysis:', all.length);

  // Category breakdown
  const catCounts: Record<string, number> = {};
  all.forEach((p) => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
  console.log('\nCategory breakdown:');
  for (const [cat, n] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + cat + ': ' + n);
  }

  // Name-based keyword analysis — what types of places do we have?
  const kwCounts: Record<string, number> = {};
  const keywords = [
    'grocery', 'supermarket', 'liquor', 'convenience', 'gas', 'atm', 'bank',
    'pharmacy', 'walgreens', 'cvs', 'laundromat', 'dry clean', 'auto',
    'parking', 'storage', 'post office', 'dentist', 'doctor', 'medical',
    'clinic', 'hospital', 'insurance', 'real estate', 'law', 'accounting',
    'tax', 'funeral', 'cemetery', 'towing', 'locksmith', 'plumb',
    'check cash', 'pawn', 'payday', 'bail', 'dollar', 'hair', 'barber',
    'nail', 'salon', 'spa', 'church', 'mosque', 'temple', 'school',
    'daycare', 'pet', 'veterinar', 'smoke shop', 'tobacco', 'vape',
    'wireless', 'cell phone', 'repair',
    'park', 'museum', 'theater', 'theatre', 'gallery', 'restaurant',
    'bar', 'cafe', 'coffee', 'pizza', 'taco', 'burger',
    'hotel', 'hostel', 'motel',
    'fitness', 'gym', 'yoga',
    'starbucks', 'mcdonald', 'subway', 'dunkin', 'target', 'walmart',
  ];
  for (const kw of keywords) {
    const count = all.filter((p) => p.name.toLowerCase().includes(kw)).length;
    if (count > 0) kwCounts[kw] = count;
  }
  console.log('\nName keyword matches (top 40):');
  for (const [kw, n] of Object.entries(kwCounts).sort((a, b) => b[1] - a[1]).slice(0, 40)) {
    console.log('  "' + kw + '": ' + n);
  }

  // Duplicate addresses
  const withAddr = all.filter((p) => p.address);
  console.log('\nPlaces with address:', withAddr.length);
  console.log('Places without address:', all.length - withAddr.length);

  const addrGroups: Record<string, { norm: string; names: string[] }> = {};
  withAddr.forEach((p) => {
    const norm = p.address.toLowerCase()
      .replace(/\bstreet\b/g, 'st').replace(/\bavenue\b/g, 'ave')
      .replace(/\bboulevard\b/g, 'blvd').replace(/\bdrive\b/g, 'dr')
      .replace(/\broad\b/g, 'rd').replace(/\bwest\b/g, 'w')
      .replace(/\beast\b/g, 'e').replace(/\bnorth\b/g, 'n')
      .replace(/\bsouth\b/g, 's').replace(/\billino[a-z]*/g, 'il')
      .replace(/\bunited states\b/g, '').replace(/\bchicago\b/g, '')
      .replace(/,/g, '').replace(/\s+/g, ' ').trim()
      .replace(/[^a-z0-9 ]/g, '');
    const key = norm.replace(/\s/g, '');
    if (!addrGroups[key]) addrGroups[key] = { norm, names: [] };
    addrGroups[key].names.push(p.name);
  });
  const dupes = Object.entries(addrGroups)
    .filter(([, g]) => g.names.length > 1)
    .sort((a, b) => b[1].names.length - a[1].names.length);
  console.log('\nDuplicate address groups:', dupes.length);
  console.log('Top 25:');
  for (const [, g] of dupes.slice(0, 25)) {
    console.log('  (' + g.names.length + 'x) ' + g.names.slice(0, 4).join(' | '));
  }
  const totalExcess = dupes.reduce((sum, [, g]) => sum + g.names.length - 1, 0);
  console.log('Total excess duplicates:', totalExcess);

  // Quest stops
  const { count: questStops } = await sb.from('quest_stops').select('*', { count: 'exact', head: true });
  console.log('\nquest_stops rows:', questStops);
}

main().catch(console.error);
