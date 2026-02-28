-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  coordinates point NOT NULL,
  type text,
  description text,
  hours jsonb,
  image_urls ARRAY,
  rating numeric,
  external_id text,
  source text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_members (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT chat_members_pkey PRIMARY KEY (chat_id, user_id),
  CONSTRAINT chat_members_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT chat_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  type text CHECK (type = ANY (ARRAY['private'::text, 'group'::text, 'community'::text])),
  community_id uuid,
  invite_code text DEFAULT substr(md5((random())::text), 0, 9) UNIQUE,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id),
  CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  category text,
  avatar_url text,
  banner_url text,
  member_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communities_pkey PRIMARY KEY (id),
  CONSTRAINT communities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.community_members (
  community_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['member'::text, 'moderator'::text, 'admin'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_members_pkey PRIMARY KEY (community_id, user_id),
  CONSTRAINT community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id),
  CONSTRAINT community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.event_attendees (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT event_attendees_pkey PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  coordinates point NOT NULL,
  venue_name text,
  description text,
  type text,
  time_start timestamp with time zone NOT NULL,
  time_end timestamp with time zone,
  max_capacity integer,
  attending_count integer DEFAULT 0,
  image_url text,
  ticket_url text,
  external_id text,
  source text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid,
  user_id uuid,
  content text,
  type text DEFAULT 'text'::text CHECK (type = ANY (ARRAY['text'::text, 'location'::text, 'vote'::text, 'system'::text])),
  metadata jsonb,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  coordinates point NOT NULL,
  type text,
  cuisine text,
  hours jsonb,
  price_range text CHECK (price_range = ANY (ARRAY['$'::text, '$$'::text, '$$$'::text])),
  rating numeric,
  image_urls ARRAY,
  discount_available boolean DEFAULT false,
  discount_description text,
  external_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.saved_spots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  entity_type text CHECK (entity_type = ANY (ARRAY['restaurant'::text, 'event'::text, 'activity'::text])),
  entity_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saved_spots_pkey PRIMARY KEY (id),
  CONSTRAINT saved_spots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.streetlights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coordinates point NOT NULL,
  neighborhood text,
  status text DEFAULT 'active'::text,
  last_synced timestamp with time zone DEFAULT now(),
  CONSTRAINT streetlights_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  location point,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid,
  message_id uuid,
  options jsonb NOT NULL,
  expires_at timestamp with time zone,
  winner text,
  resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT votes_pkey PRIMARY KEY (id),
  CONSTRAINT votes_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT votes_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);