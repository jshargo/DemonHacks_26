/**
 * Seed script — pushes places and quests to Supabase.
 *
 * Usage:
 *   npx tsx data/seed/seed.ts
 *
 * Requires .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * (or use a service-role key for RLS bypass).
 */

import { createClient } from '@supabase/supabase-js';
import placesData from './spots.json';
import questsData from './quests.json';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/** Map seed data categories to schema PlaceCategory values */
function mapCategory(raw: string): string {
  const mapping: Record<string, string> = {
    food: 'food_drink',
    events: 'food_drink',     // events in seed data that are actually venues
    outdoors: 'outdoors',
    shopping: 'shopping',
    volunteering: 'volunteering',
  };
  return mapping[raw] ?? 'other';
}

/** Generate a URL-safe slug from a name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seed() {
  console.log('Seeding places...');

  // Insert places
  const { data: places, error: placesError } = await supabase
    .from('places')
    .upsert(
      placesData.map((s) => ({
        name: s.name,
        slug: slugify(s.name),
        description: s.description,
        category: mapCategory(s.category),
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        website_url: s.website,
      })),
      { onConflict: 'slug' }
    )
    .select();

  if (placesError) {
    console.error('Error seeding places:', placesError);
    return;
  }

  console.log(`Inserted ${places?.length ?? 0} places`);

  // Build name → id lookup
  const placeLookup = new Map<string, string>();
  places?.forEach((p) => placeLookup.set(p.name, p.id));

  // Insert quests and quest_steps
  console.log('Seeding quests...');

  for (const quest of questsData) {
    // Upsert quest (avoid duplicates on re-run)
    const { data: insertedQuest, error: questError } = await supabase
      .from('quests')
      .upsert(
        {
          title: quest.name,
          slug: slugify(quest.name),
          description: quest.description,
          xp_reward: (quest as any).xp_reward ?? 100,
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (questError || !insertedQuest) {
      console.error(`Error seeding quest "${quest.name}":`, questError);
      continue;
    }

    // Build quest_steps rows — links each stop to a place via target_type / target_id
    const steps = quest.stops.map((stop) => ({
      quest_id: insertedQuest.id,
      step_order: stop.stop_order,
      title: stop.spot_name,
      description: stop.hint,
      target_type: 'place',
      target_id: placeLookup.get(stop.spot_name),
      xp_reward: (stop as any).xp_reward ?? 25,
    }));

    const missingPlaces = quest.stops.filter((s) => !placeLookup.has(s.spot_name));
    if (missingPlaces.length > 0) {
      console.warn(
        `Warning: Quest "${quest.name}" references unknown places:`,
        missingPlaces.map((s) => s.spot_name)
      );
    }

    const validSteps = steps.filter((s) => s.target_id != null);
    if (validSteps.length > 0) {
      const { error: stepsError } = await supabase
        .from('quest_steps')
        .insert(validSteps);

      if (stepsError) {
        console.error(`Error seeding steps for "${quest.name}":`, stepsError);
      }
    }

    console.log(`  Quest "${quest.name}" — ${validSteps.length}/${quest.stops.length} steps linked`);
  }

  console.log('Seeding complete!');
}

seed();
