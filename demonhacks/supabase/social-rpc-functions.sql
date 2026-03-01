-- ============================================================
-- Social RPC Functions (run in Supabase SQL editor)
-- These functions power the chat feature's DM creation and
-- chat list loading. Run AFTER the social-migration.sql tables
-- and policies are already in place.
-- ============================================================

-- ── create_dm_chat ──────────────────────────────────────────
-- Called by the app when a user taps "Message" on a friend.
-- Returns the existing DM chat_id if one already exists,
-- otherwise creates a new direct chat with both users.
-- Uses SECURITY DEFINER to bypass RLS for the insert.
-- ─────────────────────────────────────────────────────────────
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

-- ── get_my_chats ────────────────────────────────────────────
-- Called on the Social tab to populate the chat list.
-- Returns all chats the caller belongs to, each with:
--   • members[] (user_id + profile)
--   • last_message (most recent message object)
-- Sorted by most-recently-active chat first.
-- ─────────────────────────────────────────────────────────────
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
