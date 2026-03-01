// ─── Entity Types ───────────────────────────────────────────────────────────
// Two entity types stored in separate tables: places (static venues) and events (temporal).

/** The two entity types that appear as map pins */
export type EntityType = 'place' | 'event';

/** Place categories matching the schema CHECK constraint */
export type PlaceCategory = 'food_drink' | 'outdoors' | 'shopping' | 'volunteering' | 'entertainment' | 'arts_culture' | 'other';

// ─── Places ─────────────────────────────────────────────────────────────────

/** A static venue / point of interest (public.places) */
export interface Place {
  id: string;
  name: string;
  slug: string;
  category: PlaceCategory;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  image_url: string | null;
  website_url: string | null;
  phone: string | null;
  mapbox_id: string | null;
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
  location: string | null;
  onboarding_completed: boolean;
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

// ─── Saved Items ────────────────────────────────────────────────────────────

/** A saved item (public.saved_items) — flat per-user saves */
export interface SavedItem {
  id: string;
  user_id: string;
  item_type: EntityType;
  item_id: string;
  created_at: string;
}

/** Saved item enriched with place data for display */
export interface SavedItemWithPlace extends SavedItem {
  place?: Place;
}

// ─── Map Viewport ───────────────────────────────────────────────────────────

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

// ─── Discover Page ─────────────────────────────────────────────────────────

/** Category filter for the discover page (superset of PlaceCategory + events) */
export type DiscoverCategory = 'all' | 'food_drink' | 'outdoors' | 'events' | 'shopping' | 'volunteering' | 'entertainment' | 'arts_culture';

/** Enriched feed item for the discover page, derived from places or events */
export interface DiscoverItem {
  id: string;
  entityType: EntityType;
  name: string;
  lat: number;
  lng: number;
  category: PlaceCategory | null;
  subcategory: string | null;
  description: string | null;
  imageUrl: string | null;
  neighborhood: string;
  rating: number | null;
  priceRange: '$' | '$$' | '$$$' | '$$$$' | null;
  tags: string[];
  startsAt: string | null;
  endsAt: string | null;
  venueName: string | null;
  attendingCount: number | null;
  websiteUrl: string | null;
  /** Mapbox ID for POIs sourced from Mapbox Search Box (used by /retrieve) */
  mapboxId?: string;
  /** Search Box session token used when this result list was fetched */
  mapboxSessionToken?: string;
  /** Formatted address from Mapbox (shown when description is unavailable) */
  placeFormatted?: string;
}

/** Label displayed inside an Airbnb-style pill pin on the map */
export interface PinLabel {
  text: string;
  type: 'date' | 'price' | 'rating';
}

/** Geographic bounding box for viewport-based filtering */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ─── Mapbox Search Box API ─────────────────────────────────────────────────

/** Autocomplete suggestion from Mapbox Search Box /suggest endpoint */
export interface SearchSuggestion {
  mapbox_id: string;
  name: string;
  feature_type: string;       // 'poi' | 'address' | 'place' | 'street'
  place_formatted: string;    // "123 Main St, Chicago, IL"
  category?: string;
  poi_categories?: string[];
  maki?: string;              // Mapbox icon identifier
  lat?: number;
  lng?: number;
}

/** Full POI details from Mapbox Search Box /retrieve endpoint */
export interface SearchResult {
  mapbox_id: string;
  name: string;
  address: string;
  full_address: string;
  lat: number;
  lng: number;
  category?: string;
  poi_categories?: string[];
  phone?: string;
  website?: string;
  hours?: Record<string, string>;
}
