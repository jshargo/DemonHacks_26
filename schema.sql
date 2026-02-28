-- =============================================================================
-- Chicago Event Discovery Map — Production Schema
-- DemonHacks '26
-- =============================================================================
-- This schema is the canonical reference for all Supabase tables.
-- Run against a fresh Supabase project (PostGIS is pre-enabled).
-- =============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────

create extension if not exists postgis;

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with public profile data.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  display_name text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Places ─────────────────────────────────────────────────────────────────
-- Static venues: restaurants, bars, parks, shops, volunteer orgs, etc.
-- Category distinguishes the SPEC's five non-event categories.

create table public.places (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  category     text not null check (category in (
                 'food_drink', 'outdoors', 'shopping', 'volunteering', 'other'
               )),
  subcategory  text,                          -- e.g. 'pizza', 'cocktail-bar', 'park'
  tags         text[] not null default '{}',
  description  text,
  address      text,
  lat          double precision not null,
  lng          double precision not null,
  location     geography(Point, 4326) generated always as
               (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  image_url    text,
  website_url  text,
  phone        text,
  hours        jsonb,                         -- e.g. {"mon":"9am-5pm", ...}
  price_range  text check (price_range in ('$', '$$', '$$$', '$$$$')),
  rating       numeric(2,1) check (rating >= 0 and rating <= 5),
  is_featured  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Events ─────────────────────────────────────────────────────────────────
-- Time-bound happenings: concerts, comedy, festivals, art openings, etc.

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  description     text,
  place_id        uuid references public.places(id) on delete set null,
  venue_name      text,                       -- denormalized for events at non-place venues
  lat             double precision not null,
  lng             double precision not null,
  location        geography(Point, 4326) generated always as
                  (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  image_url       text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  max_capacity    integer,
  attending_count integer not null default 0 check (attending_count >= 0),
  ticket_url      text,
  is_featured     boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ─── Event Attendees ────────────────────────────────────────────────────────
-- RSVP / attendance tracking.

create table public.event_attendees (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ─── Quests ─────────────────────────────────────────────────────────────────
-- Curated multi-stop exploration routes.

create table public.quests (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  description    text,
  image_url      text,
  difficulty     text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  estimated_time text,                        -- human-readable, e.g. '3 hours'
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ─── Quest Stops ────────────────────────────────────────────────────────────
-- Ordered stops within a quest. Direct FK to places — enforces referential integrity.

create table public.quest_stops (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  stop_order smallint not null,
  hint       text,
  created_at timestamptz not null default now(),
  unique (quest_id, stop_order)
);

-- ─── Quest Progress ─────────────────────────────────────────────────────────
-- Tracks which stops a user has checked into for quest completion.

create table public.quest_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  quest_id      uuid not null references public.quests(id) on delete cascade,
  quest_stop_id uuid not null references public.quest_stops(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (user_id, quest_stop_id)
);

-- ─── Collections ────────────────────────────────────────────────────────────
-- Named user collections (e.g. "Date Night", "Coffee Spots", "Favorites").

create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null default 'Favorites',
  created_at timestamptz not null default now()
);

-- ─── Collection Items ───────────────────────────────────────────────────────
-- Items saved to a collection. Polymorphic: can be a place or an event.

create table public.collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  item_type     text not null check (item_type in ('place', 'event')),
  item_id       uuid not null,                -- references places.id or events.id
  added_at      timestamptz not null default now(),
  unique (collection_id, item_type, item_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Spatial indexes for proximity queries (ST_DWithin, ST_Distance)
create index idx_places_location on public.places using gist (location);
create index idx_events_location on public.events using gist (location);

-- Category filtering on map
create index idx_places_category on public.places (category);
create index idx_places_is_featured on public.places (is_featured) where is_featured = true;

-- Event time filtering (upcoming events)
create index idx_events_starts_at on public.events (starts_at);
create index idx_events_is_featured on public.events (is_featured) where is_featured = true;

-- Quest retrieval
create index idx_quest_stops_quest_order on public.quest_stops (quest_id, stop_order);
create index idx_quests_is_active on public.quests (is_active) where is_active = true;

-- User-scoped lookups
create index idx_quest_progress_user on public.quest_progress (user_id, quest_id);
create index idx_collections_user on public.collections (user_id);
create index idx_collection_items_collection on public.collection_items (collection_id);
create index idx_event_attendees_user on public.event_attendees (user_id);

-- =============================================================================
-- Row-Level Security (RLS)
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.quests enable row level security;
alter table public.quest_stops enable row level security;
alter table public.quest_progress enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

-- Profiles: anyone can read, only self can update
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Places: public read, admin-only write (via service role / dashboard)
create policy "Places are publicly readable"
  on public.places for select using (true);

-- Events: public read, admin-only write
create policy "Events are publicly readable"
  on public.events for select using (true);

-- Event attendees: public read, authenticated users can RSVP/un-RSVP themselves
create policy "Attendees are publicly readable"
  on public.event_attendees for select using (true);
create policy "Users can RSVP to events"
  on public.event_attendees for insert with check (auth.uid() = user_id);
create policy "Users can cancel their RSVP"
  on public.event_attendees for delete using (auth.uid() = user_id);

-- Quests & stops: public read, admin-only write
create policy "Quests are publicly readable"
  on public.quests for select using (true);
create policy "Quest stops are publicly readable"
  on public.quest_stops for select using (true);

-- Quest progress: users can only read/write their own
create policy "Users can read their own quest progress"
  on public.quest_progress for select using (auth.uid() = user_id);
create policy "Users can check into quest stops"
  on public.quest_progress for insert with check (auth.uid() = user_id);

-- Collections: users can only CRUD their own
create policy "Users can read their own collections"
  on public.collections for select using (auth.uid() = user_id);
create policy "Users can create collections"
  on public.collections for insert with check (auth.uid() = user_id);
create policy "Users can update their own collections"
  on public.collections for update using (auth.uid() = user_id);
create policy "Users can delete their own collections"
  on public.collections for delete using (auth.uid() = user_id);

-- Collection items: inherit access from parent collection
create policy "Users can read their own collection items"
  on public.collection_items for select
  using (exists (
    select 1 from public.collections c
    where c.id = collection_id and c.user_id = auth.uid()
  ));
create policy "Users can add items to their collections"
  on public.collection_items for insert
  with check (exists (
    select 1 from public.collections c
    where c.id = collection_id and c.user_id = auth.uid()
  ));
create policy "Users can remove items from their collections"
  on public.collection_items for delete
  using (exists (
    select 1 from public.collections c
    where c.id = collection_id and c.user_id = auth.uid()
  ));

-- =============================================================================
-- Helper: auto-create default "Favorites" collection on profile creation
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.collections (user_id, name)
  values (new.id, 'Favorites');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_user();
