import { defineTool } from '@tambo-ai/react';
import { z } from 'zod/v4';
import { supabase } from '@/lib/supabase';
import { useMapStore } from '@/stores/map-store';
import { useExploreStore } from '@/stores/explore-store';

const boundsSchema = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
});

// ─── search_places ──────────────────────────────────────────────────────────

const searchPlaces = defineTool({
  name: 'search_places',
  description:
    'Search for places/venues in Chicago. Use for restaurants, parks, shops, entertainment, arts, volunteering spots. Supports text search, category filter, and map bounds.',
  inputSchema: z.object({
    query: z.string().optional().describe('Text to search in name/description'),
    category: z
      .enum(['food_drink', 'outdoors', 'shopping', 'volunteering', 'entertainment', 'arts_culture', 'other'])
      .optional()
      .describe('Place category filter'),
    bounds: boundsSchema.optional().describe('Visible map bounding box to restrict results'),
    limit: z.number().optional().default(10).describe('Max results to return'),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      lat: z.number(),
      lng: z.number(),
      category: z.string().nullable(),
      image_url: z.string().nullable(),
      address: z.string().nullable(),
      website_url: z.string().nullable(),
    }),
  ),
  tool: async ({ query, category, bounds, limit }) => {
    let q = supabase
      .from('places')
      .select('id, name, description, lat, lng, category, image_url, address, website_url');

    if (query) {
      q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (category) {
      q = q.eq('category', category);
    }
    if (bounds) {
      q = q
        .gte('lat', bounds.south)
        .lte('lat', bounds.north)
        .gte('lng', bounds.west)
        .lte('lng', bounds.east);
    }

    const { data, error } = await q.limit(limit ?? 10);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

// ─── search_events ──────────────────────────────────────────────────────────

const searchEvents = defineTool({
  name: 'search_events',
  description:
    'Search for events in Chicago. Returns time-bound happenings with venue, date, and attendance info. Defaults to upcoming events only.',
  inputSchema: z.object({
    query: z.string().optional().describe('Text to search in name/description'),
    upcoming_only: z.boolean().optional().default(true).describe('Only show events that haven\'t ended yet'),
    bounds: boundsSchema.optional().describe('Visible map bounding box'),
    limit: z.number().optional().default(10),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      lat: z.number(),
      lng: z.number(),
      venue_name: z.string().nullable(),
      starts_at: z.string(),
      ends_at: z.string(),
      attending_count: z.number(),
      image_url: z.string().nullable(),
    }),
  ),
  tool: async ({ query, upcoming_only, bounds, limit }) => {
    let q = supabase
      .from('events')
      .select('id, name, description, lat, lng, venue_name, starts_at, ends_at, attending_count, image_url');

    if (query) {
      q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (upcoming_only !== false) {
      q = q.gte('ends_at', new Date().toISOString());
    }
    if (bounds) {
      q = q
        .gte('lat', bounds.south)
        .lte('lat', bounds.north)
        .gte('lng', bounds.west)
        .lte('lng', bounds.east);
    }

    const { data, error } = await q.order('starts_at', { ascending: true }).limit(limit ?? 10);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

// ─── search_quests ──────────────────────────────────────────────────────────

const searchQuests = defineTool({
  name: 'search_quests',
  description:
    'Search for curated multi-stop exploration quests in Chicago. Quests are themed walking routes with XP rewards.',
  inputSchema: z.object({
    query: z.string().optional().describe('Text to search in title/description'),
  }),
  outputSchema: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      description: z.string().nullable(),
      xp_reward: z.number(),
      image_url: z.string().nullable(),
    }),
  ),
  tool: async ({ query }) => {
    let q = supabase
      .from('quests')
      .select('id, title, slug, description, xp_reward, image_url')
      .eq('is_active', true);

    if (query) {
      q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

// ─── navigate_map ───────────────────────────────────────────────────────────

const navigateMap = defineTool({
  name: 'navigate_map',
  description:
    'Fly the map camera to a specific location. Optionally highlight a pin. Use after search results to show the user a specific place or event on the map.',
  inputSchema: z.object({
    lat: z.number().describe('Latitude to fly to'),
    lng: z.number().describe('Longitude to fly to'),
    zoom: z.number().optional().describe('Zoom level (default 15)'),
    pin_id: z.string().optional().describe('ID of a pin to highlight'),
    name: z.string().optional().describe('Name of the location (for logging)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  tool: ({ lat, lng, zoom, pin_id }) => {
    useMapStore.getState().setFlyTarget({ lat, lng, zoom: zoom ?? 15 });
    if (pin_id) {
      useExploreStore.getState().setHoveredPinId(pin_id);
    }
    return { success: true, message: `Map navigated to ${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  },
});

export const tools = [searchPlaces, searchEvents, searchQuests, navigateMap];
