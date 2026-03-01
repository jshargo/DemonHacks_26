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
