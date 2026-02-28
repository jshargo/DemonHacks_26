// ─── Entity Types (map to Supabase tables) ───

/** The three entity types stored in separate tables */
export type EntityType = 'restaurant' | 'event' | 'activity';

/** A restaurant / food venue */
export interface Restaurant {
  id: string;
  name: string;
  slug: string | null;
  coordinates: string; // PostgreSQL point: "(lng,lat)"
  type: string | null;
  cuisine: string | null;
  hours: Record<string, string> | null;
  price_range: '$' | '$$' | '$$$' | null;
  rating: number | null;
  image_urls: string[] | null;
  discount_available: boolean;
  discount_description: string | null;
  external_id: string | null;
  created_at: string;
}

/** An event with time and capacity */
export interface Event {
  id: string;
  name: string;
  slug: string | null;
  coordinates: string;
  venue_name: string | null;
  description: string | null;
  type: string | null;
  time_start: string;
  time_end: string | null;
  max_capacity: number | null;
  attending_count: number;
  image_url: string | null;
  ticket_url: string | null;
  external_id: string | null;
  source: string | null;
  created_at: string;
}

/** An activity / point of interest */
export interface Activity {
  id: string;
  name: string;
  slug: string | null;
  coordinates: string;
  type: string | null;
  description: string | null;
  hours: Record<string, string> | null;
  image_urls: string[] | null;
  rating: number | null;
  external_id: string | null;
  source: string | null;
  created_at: string;
}

// ─── Unified Map Pin ───

/** Normalized pin for rendering on the map, derived from any entity table */
export interface MapPin {
  id: string;
  entityType: EntityType;
  name: string;
  lat: number;
  lng: number;
  type: string | null; // subcategory (cuisine, event type, activity type)
  description: string | null;
  imageUrl: string | null;
}

// ─── Users & Saved Spots ───

/** User profile (public.users table) */
export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null; // PostgreSQL point or null
  created_at: string;
}

/** A saved/bookmarked spot */
export interface SavedSpot {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
}

// ─── Events ───

/** Event attendee record */
export interface EventAttendee {
  event_id: string;
  user_id: string;
}

// ─── Communities & Chat ───

export interface Community {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  member_count: number;
  created_by: string | null;
  created_at: string;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
}

// ─── Map Viewport ───

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}
