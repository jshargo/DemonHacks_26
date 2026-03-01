-- ============================================================
-- Social Feature Migration: Friends + Chat
-- Run this in the Supabase dashboard SQL editor
-- ============================================================

-- Friend requests / friendships
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

-- Chat conversations (DM or group)
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('direct', 'group')) not null,
  name text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Who's in each chat
create table public.chat_members (
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (chat_id, user_id)
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('text', 'spot', 'event')) default 'text',
  content text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.friendships enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;

-- Friendships: users can see/manage their own
create policy "friendships: own rows" on public.friendships
  for all using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Chats: only members can see
create policy "chats: members only select" on public.chats
  for select using (
    exists (select 1 from public.chat_members where chat_id = chats.id and user_id = auth.uid())
  );
create policy "chats: insert own" on public.chats
  for insert with check (created_by = auth.uid());

-- Chat members: members can see all membership rows for chats they're in
create policy "chat_members: own chats" on public.chat_members
  for all using (
    user_id = auth.uid() or
    exists (select 1 from public.chat_members cm where cm.chat_id = chat_members.chat_id and cm.user_id = auth.uid())
  );

-- Messages: only chat members can read/write
create policy "messages: members only" on public.messages
  for all using (
    exists (select 1 from public.chat_members where chat_id = messages.chat_id and user_id = auth.uid())
  );

-- ============================================================
-- RPC: create_dm_chat(friend_id uuid) → uuid
-- Returns the existing DM chat_id between the caller and friend,
-- or creates a new one (with both users in chat_members) if none exists.
-- ============================================================
create or replace function public.create_dm_chat(friend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat_id uuid;
  v_caller  uuid := auth.uid();
begin
  -- Look for an existing direct chat where BOTH users are members
  select cm1.chat_id into v_chat_id
  from chat_members cm1
  join chat_members cm2 on cm1.chat_id = cm2.chat_id
  join chats c           on c.id = cm1.chat_id
  where c.type = 'direct'
    and cm1.user_id = v_caller
    and cm2.user_id = friend_id;

  if v_chat_id is not null then
    return v_chat_id;
  end if;

  -- Create the chat
  insert into chats (type, created_by)
  values ('direct', v_caller)
  returning id into v_chat_id;

  -- Add both users as members
  insert into chat_members (chat_id, user_id) values (v_chat_id, v_caller);
  insert into chat_members (chat_id, user_id) values (v_chat_id, friend_id);

  return v_chat_id;
end;
$$;

-- ============================================================
-- RPC: get_my_chats() → table
-- Returns all chats the caller belongs to, with member profiles
-- and the most recent message for each chat.
-- ============================================================
create or replace function public.get_my_chats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  return (
    select coalesce(jsonb_agg(chat_row order by last_at desc nulls last), '[]'::jsonb)
    from (
      select
        c.id,
        c.type,
        c.name,
        c.created_by,
        c.created_at,
        -- Members array with nested profile
        (
          select jsonb_agg(
            jsonb_build_object(
              'chat_id',   cm.chat_id,
              'user_id',   cm.user_id,
              'joined_at', cm.joined_at,
              'profile', jsonb_build_object(
                'id',           p.id,
                'username',     p.username,
                'display_name', p.display_name,
                'avatar_url',   p.avatar_url
              )
            )
          )
          from chat_members cm
          join profiles p on p.id = cm.user_id
          where cm.chat_id = c.id
        ) as members,
        -- Last message
        (
          select jsonb_build_object(
            'id',         lm.id,
            'chat_id',    lm.chat_id,
            'sender_id',  lm.sender_id,
            'type',       lm.type,
            'content',    lm.content,
            'metadata',   lm.metadata,
            'created_at', lm.created_at
          )
          from messages lm
          where lm.chat_id = c.id
          order by lm.created_at desc
          limit 1
        ) as last_message,
        -- For sorting
        (
          select max(lm.created_at)
          from messages lm
          where lm.chat_id = c.id
        ) as last_at
      from chats c
      where exists (
        select 1 from chat_members cm
        where cm.chat_id = c.id and cm.user_id = v_caller
      )
    ) chat_row
  );
end;
$$;
