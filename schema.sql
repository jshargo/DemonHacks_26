-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_members (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_members_pkey PRIMARY KEY (chat_id, user_id),
  CONSTRAINT chat_members_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT chat_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type = ANY (ARRAY['direct'::text, 'group'::text])),
  name text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid,
  event_id uuid,
  quest_step_id uuid,
  lat double precision,
  lng double precision,
  xp_earned integer NOT NULL DEFAULT 10 CHECK (xp_earned >= 0 AND xp_earned <= 200),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT checkins_pkey PRIMARY KEY (id),
  CONSTRAINT checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT checkins_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id),
  CONSTRAINT checkins_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT checkins_quest_step_id_fkey FOREIGN KEY (quest_step_id) REFERENCES public.quest_steps(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  place_id uuid,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  location USER-DEFINED DEFAULT (st_setsrid(st_makepoint(lng, lat), 4326))::geography,
  image_url text,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT friendships_pkey PRIMARY KEY (id),
  CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id),
  CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  type text DEFAULT 'text'::text CHECK (type = ANY (ARRAY['text'::text, 'spot'::text, 'event'::text])),
  content text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.places (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category USER-DEFINED NOT NULL DEFAULT 'other'::place_category_enum,
  description text,
  address text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  location USER-DEFINED DEFAULT (st_setsrid(st_makepoint(lng, lat), 4326))::geography,
  image_url text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  website_url text,
  phone text,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  mapbox_id text UNIQUE,
  CONSTRAINT places_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  xp integer NOT NULL DEFAULT 0,
  indoors_bias USER-DEFINED NOT NULL DEFAULT 'mixed'::indoors_bias_enum,
  crowd_level USER-DEFINED NOT NULL DEFAULT 'anything'::crowd_level_enum,
  age_gate USER-DEFINED NOT NULL DEFAULT 'no_pref'::age_gate_enum,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  onboarding_completed boolean NOT NULL DEFAULT false,
  hide_location boolean DEFAULT false,
  hide_quest_progress boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.quest_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL,
  step_order smallint NOT NULL DEFAULT 1,
  title text NOT NULL,
  description text,
  target_type USER-DEFINED NOT NULL,
  target_id uuid NOT NULL,
  xp_reward integer NOT NULL DEFAULT 25,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quest_steps_pkey PRIMARY KEY (id),
  CONSTRAINT quest_steps_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id)
);
CREATE TABLE public.quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  xp_reward integer NOT NULL DEFAULT 100,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.saved_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type USER-DEFINED NOT NULL,
  item_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_items_pkey PRIMARY KEY (id),
  CONSTRAINT saved_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.signals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id uuid,
  event_id uuid,
  signal USER-DEFINED NOT NULL,
  note text CHECK (char_length(note) <= 140),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '06:00:00'::interval),
  CONSTRAINT signals_pkey PRIMARY KEY (id),
  CONSTRAINT signals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT signals_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id),
  CONSTRAINT signals_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.user_onboarding_preferences (
  user_id uuid NOT NULL,
  selected_categories ARRAY NOT NULL DEFAULT '{}'::text[],
  selected_subcategories jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_onboarding_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_onboarding_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pref_type USER-DEFINED NOT NULL,
  category USER-DEFINED,
  tag USER-DEFINED,
  weight smallint NOT NULL DEFAULT 2 CHECK (weight >= 1 AND weight <= 3),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);