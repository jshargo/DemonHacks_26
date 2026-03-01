# Chicago Event Discovery Map App — Product Spec

**Hackathon:** DemonHacks '26
**Timeline:** ~20 hours
**Team Size:** 4+ people
**Date:** February 28, 2026

---

## 1. Overview

A map-first event and venue discovery app for the city of Chicago. Users explore an interactive Mapbox map with location pins for restaurants, events, parks, popups, volunteer opportunities, and curated city quests. Think Beli meets scavenger hunt.

**Core value prop:** Discover what's happening in Chicago right now — food, events, outdoors, volunteering — all on one beautiful map with curated quest routes to guide exploration.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Expo SDK 52+** with React Native Web (single codebase: web + future mobile) |
| Router | **Expo Router** (file-based routing) |
| Language | **TypeScript** |
| Map | **Mapbox GL JS** (web via `react-map-gl`), `@rnmapbox/maps` (native future) |
| Database | **Supabase** (PostgreSQL + PostGIS for geospatial) |
| Auth | **Supabase Auth** (Email/Password + Google OAuth) |
| Deployment | **Vercel** (web) |
| State | **Zustand** (lightweight, works across web/native) |
| Styling | **Nativewind** (Tailwind CSS for React Native) or Expo's built-in StyleSheet |

---

## 3. Features (MVP Scope)

### 3.1 Authentication (Required)
- Email + password sign up / sign in
- Google OAuth one-tap sign in
- Supabase Auth handles sessions, tokens, refresh
- Protected routes: all app screens require auth
- Simple profile screen (name, email, avatar placeholder)

### 3.2 Map View (Primary Screen)
- Full-screen Mapbox map centered on Chicago (41.8781, -87.6298)
- Bounded to Chicago metro area
- Clustered pins at low zoom levels, individual pins at high zoom
- Pins represent venues/events from the database
- Tapping a pin opens a bottom sheet with venue details

### 3.3 Categories
| Category | Description |
|----------|-------------|
| Food & Drink | Restaurants, cafes, bars, breweries, food trucks |
| Events & Nightlife | Live music, comedy, club nights, art openings, festivals |
| Outdoors & Recreation | Parks, beaches, trails, bike paths, public art |
| Shopping & Popups | Popup shops, markets, vintage stores, local boutiques |
| Volunteering | Food shelters, community service, charity events |
| Quests | Curated multi-stop exploration routes |

### 3.4 Filtering
- **Quick filters:** Horizontal scrollable category chips above the map. Tap to toggle categories on/off.
- **Advanced filters:** Filter drawer/modal accessible via filter icon. Supports subcategory, tags, and other metadata-based filtering.

### 3.5 Bottom Sheet (Venue Detail)
- Slides up from bottom on pin tap
- Swipeable: peek → half → full-screen
- Shows: name, category, description, address, image
- Action buttons: Save to collection, Get directions (opens native maps), Share
- For quest stops: shows quest context and check-in button

### 3.6 Saves & Collections
- Users can save/bookmark any venue
- Saved items organized into user-created named collections (e.g., "Date Night", "Coffee Spots")
- Default "Favorites" collection
- Collections screen: list of collections → tap to see items → tap item to see on map
- Heart/bookmark icon on venue cards and bottom sheet

### 3.7 Quests
- **Curated multi-stop routes** created by admins (seeded data)
- Quest = ordered sequence of venue stops with a theme (e.g., "Best Deep Dish Tour", "Chicago Street Art Walk", "Lakefront Adventure")
- Quest detail screen: map showing the route, list of stops, progress indicator
- **GPS proximity check-in:** User must be within ~100m of a stop to check in. App uses device location to verify.
- Quest progress tracked per user (which stops completed)
- Completion state: all stops checked in = quest complete

### 3.8 Seed Data
- Manual JSON seed file with ~30-50 curated real Chicago spots across all categories
- 2-3 pre-built quests with 4-6 stops each
- Seed script that pushes data to Supabase
- Data sources: manually curated from Google Maps, Yelp, Chicago tourism sites

---

## 4. Database Schema (Supabase / PostgreSQL + PostGIS)

### Tables

```sql
-- Enable PostGIS
create extension if not exists postgis;

-- Venues / Points of Interest
create table spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,        -- 'food', 'events', 'outdoors', 'shopping', 'volunteering'
  subcategory text,              -- e.g., 'coffee', 'live-music', 'park'
  tags text[] default '{}',
  address text,
  lat double precision not null,
  lng double precision not null,
  location geography(Point, 4326) generated always as (st_point(lng, lat)::geography) stored,
  image_url text,
  website text,
  created_at timestamptz default now()
);

-- Quests
create table quests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  difficulty text default 'easy',  -- 'easy', 'medium', 'hard'
  estimated_time text,              -- e.g., '2 hours'
  created_at timestamptz default now()
);

-- Quest stops (ordered)
create table quest_stops (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  spot_id uuid references spots(id) on delete cascade,
  stop_order int not null,
  hint text,                        -- optional hint for finding the stop
  unique (quest_id, stop_order)
);

-- User collections
create table collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Favorites',
  created_at timestamptz default now()
);

-- Saved spots in collections
create table collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete cascade,
  spot_id uuid references spots(id) on delete cascade,
  added_at timestamptz default now(),
  unique (collection_id, spot_id)
);

-- Quest progress (user check-ins)
create table quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  quest_id uuid references quests(id) on delete cascade,
  quest_stop_id uuid references quest_stops(id) on delete cascade,
  checked_in_at timestamptz default now(),
  unique (user_id, quest_stop_id)
);

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
```

### Row-Level Security (RLS)
- `spots`, `quests`, `quest_stops`: public read, admin write
- `collections`, `collection_items`: read/write only for owning user
- `quest_progress`: read/write only for owning user
- `profiles`: public read, self-write

### Indexes
- `spots.location` — spatial index for proximity queries
- `spots.category` — for category filtering
- `quest_stops(quest_id, stop_order)` — for ordered quest retrieval
- `collection_items(collection_id)` — for fetching collection contents
- `quest_progress(user_id, quest_id)` — for user progress lookups

---

## 5. App Structure (Expo Router)

```
app/
  _layout.tsx              # Root layout (auth gate, providers)
  (auth)/
    _layout.tsx            # Auth layout (no bottom tabs)
    sign-in.tsx            # Email + Google sign-in
    sign-up.tsx            # Registration
  (tabs)/
    _layout.tsx            # Tab navigator layout
    index.tsx              # Map screen (home/default)
    quests.tsx             # Quest list screen
    collections.tsx        # Saved collections screen
    profile.tsx            # User profile screen
  quest/
    [id].tsx               # Quest detail + map route
  spot/
    [id].tsx               # Spot detail (deep link target)

components/
  map/
    MapView.tsx            # Mapbox wrapper
    MapPin.tsx             # Pin component
    ClusterMarker.tsx      # Cluster display
  spots/
    SpotBottomSheet.tsx    # Bottom sheet for spot detail
    SpotCard.tsx           # Card component for lists
    CategoryChips.tsx      # Horizontal filter chips
    FilterDrawer.tsx       # Advanced filter modal
  quests/
    QuestCard.tsx          # Quest list item
    QuestRoute.tsx         # Map route visualization
    QuestStopItem.tsx      # Individual stop in quest
    CheckInButton.tsx      # GPS-verified check-in
  collections/
    CollectionCard.tsx     # Collection list item
    SaveButton.tsx         # Heart/bookmark toggle
    AddToCollection.tsx    # Collection picker modal
  auth/
    AuthGate.tsx           # Redirect if not authenticated
    GoogleSignIn.tsx       # Google OAuth button
  ui/
    BottomSheet.tsx        # Reusable bottom sheet
    LoadingSpinner.tsx     # Loading state

lib/
  supabase.ts              # Supabase client init
  mapbox.ts                # Mapbox config
  location.ts              # GPS/geolocation utilities
  types.ts                 # Shared TypeScript types
  constants.ts             # App constants (Chicago center, categories, etc.)

stores/
  auth-store.ts            # Auth state (Zustand)
  map-store.ts             # Map state (filters, selected spot, viewport)
  quest-store.ts           # Quest progress state
  collection-store.ts      # Collections state

hooks/
  useSpots.ts              # Fetch/filter spots
  useQuests.ts             # Fetch quests and progress
  useCollections.ts        # Fetch/manage collections
  useLocation.ts           # Device GPS location
  useCheckIn.ts            # Quest check-in with proximity verification

data/
  seed/
    spots.json             # Curated Chicago venues
    quests.json            # Pre-built quests
    seed.ts                # Script to push seed data to Supabase
```

---

## 6. Team Work Division (4+ people)

| Person | Module | Key Files |
|--------|--------|-----------|
| **Person 1** | Auth + Profiles | `(auth)/*`, `lib/supabase.ts`, `stores/auth-store.ts`, `profile.tsx` |
| **Person 2** | Map + Spots | `map/*`, `spots/*`, `stores/map-store.ts`, `hooks/useSpots.ts`, `(tabs)/index.tsx` |
| **Person 3** | Quests + Check-ins | `quests/*`, `stores/quest-store.ts`, `hooks/useQuests.ts`, `hooks/useCheckIn.ts`, `lib/location.ts` |
| **Person 4** | Collections + Saves + Seed Data | `collections/*`, `stores/collection-store.ts`, `hooks/useCollections.ts`, `data/seed/*` |

Shared foundation (do first together): project scaffold, Supabase client, types, constants, DB schema.

---

## 7. Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

---

## 8. Out of Scope (Post-Hackathon)

- User-submitted venues/events
- Ratings and reviews
- Real-time event data from third-party APIs
- Push notifications
- Social features (following users, sharing collections)
- Native mobile builds (Expo EAS)
- Admin dashboard for content management
- Search functionality (text-based venue search)
- Directions/routing between quest stops
- Leaderboard / points system for quests
