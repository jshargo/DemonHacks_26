/**
 * Seed script — pushes spots and quests to Supabase.
 *
 * Usage:
 *   npx tsx data/seed/seed.ts
 *
 * Requires .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * (or use a service-role key for RLS bypass).
 */

import { createClient } from '@supabase/supabase-js';
import spotsData from './spots.json';
import questsData from './quests.json';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding spots...');

  // Insert spots
  const { data: spots, error: spotsError } = await supabase
    .from('spots')
    .upsert(
      spotsData.map((s) => ({
        name: s.name,
        description: s.description,
        category: s.category,
        subcategory: s.subcategory,
        tags: s.tags,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        website: s.website,
      })),
      { onConflict: 'name' }
    )
    .select();

  if (spotsError) {
    console.error('Error seeding spots:', spotsError);
    return;
  }

  console.log(`Inserted ${spots?.length ?? 0} spots`);

  // Build name → id lookup
  const spotLookup = new Map<string, string>();
  spots?.forEach((s) => spotLookup.set(s.name, s.id));

  // Insert quests and stops
  console.log('Seeding quests...');

  for (const quest of questsData) {
    const { data: insertedQuest, error: questError } = await supabase
      .from('quests')
      .insert({
        name: quest.name,
        description: quest.description,
        difficulty: quest.difficulty,
        estimated_time: quest.estimated_time,
      })
      .select()
      .single();

    if (questError || !insertedQuest) {
      console.error(`Error seeding quest "${quest.name}":`, questError);
      continue;
    }

    // Insert quest stops
    const stops = quest.stops.map((stop) => ({
      quest_id: insertedQuest.id,
      spot_id: spotLookup.get(stop.spot_name),
      stop_order: stop.stop_order,
      hint: stop.hint,
    }));

    const missingSpots = quest.stops.filter((s) => !spotLookup.has(s.spot_name));
    if (missingSpots.length > 0) {
      console.warn(
        `Warning: Quest "${quest.name}" references unknown spots:`,
        missingSpots.map((s) => s.spot_name)
      );
    }

    const validStops = stops.filter((s) => s.spot_id != null);
    if (validStops.length > 0) {
      const { error: stopsError } = await supabase
        .from('quest_stops')
        .insert(validStops);

      if (stopsError) {
        console.error(`Error seeding stops for "${quest.name}":`, stopsError);
      }
    }

    console.log(`  Quest "${quest.name}" — ${validStops.length} stops`);
  }

  console.log('Seeding complete!');
}

seed();
