// ─── Entity Types ───────────────────────────────────────────────────────────
// Two entity types stored in separate tables: places (static venues) and events (temporal).

/** The two entity types that appear as map pins */
export type EntityType = 'place' | 'event';

/** Place categories matching the schema CHECK constraint */
export type PlaceCategory = 'food_drink' | 'outdoors' | 'shopping' | 'volunteering' | 'other';

// ─── Places ─────────────────────────────────────────────────────────────────

/** A static venue / point of interest (public.places) */
export interface Place {
  id: string;
  name: string;
  slug: string;
  category: PlaceCategory;
  subcategory: string | null;
  tags: string[];
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  image_url: string | null;
  website_url: string | null;
  phone: string | null;
  hours: Record<string, string> | null;
  price_range: '$' | '$$' | '$$$' | '$$$$' | null;
  rating: number | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Events ─────────────────────────────────────────────────────────────────

/** A time-bound event (public.events) */
export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  place_id: string | null;
  venue_name: string | null;
  lat: number;
  lng: number;
  image_url: string | null;
  starts_at: string;
  ends_at: string;
  max_capacity: number | null;
  attending_count: number;
  ticket_url: string | null;
  is_featured: boolean;
  created_at: string;
}

/** RSVP record (public.event_attendees) */
export interface EventAttendee {
  event_id: string;
  user_id: string;
  created_at: string;
}

// ─── Unified Map Pin ────────────────────────────────────────────────────────

/** Normalized pin for rendering on the map, derived from places or events */
export interface MapPin {
  id: string;
  entityType: EntityType;
  name: string;
  lat: number;
  lng: number;
  category: string | null;    // PlaceCategory for places, null for events
  subcategory: string | null;  // subcategory or event type
  description: string | null;
  imageUrl: string | null;
}

// ─── Profiles ───────────────────────────────────────────────────────────────

/** User profile (public.profiles) */
export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Quests ─────────────────────────────────────────────────────────────────

/** A curated multi-stop exploration route (public.quests) */
export interface Quest {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: string | null;
  is_active: boolean;
  created_at: string;
}

/** An ordered stop within a quest (public.quest_stops) */
export interface QuestStop {
  id: string;
  quest_id: string;
  place_id: string;
  stop_order: number;
  hint: string | null;
  created_at: string;
  // Joined data (optional, from .select('*, place:places(*)'))
  place?: Place;
}

/** User's check-in at a quest stop (public.quest_progress) */
export interface QuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  quest_stop_id: string;
  checked_in_at: string;
}

// ─── Collections ────────────────────────────────────────────────────────────

/** A named user collection (public.collections) */
export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

/** An item saved to a collection (public.collection_items) */
export interface CollectionItem {
  id: string;
  collection_id: string;
  item_type: EntityType;
  item_id: string;
  added_at: string;
}

// ─── Map Viewport ───────────────────────────────────────────────────────────

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}
