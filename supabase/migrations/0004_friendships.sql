-- =====================================================
-- DIVARC — Migration 0004 : Système d'amitié
-- =====================================================

-- 1. friendships table
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  intro_message text check (
    intro_message is null or char_length(intro_message) between 1 and 280
  ),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_different_users check (requester_id != recipient_id)
);

-- Only one active friendship (pending or accepted) between any pair.
create unique index if not exists friendships_active_pair_idx
  on public.friendships (
    least(requester_id, recipient_id),
    greatest(requester_id, recipient_id)
  )
  where status in ('pending', 'accepted');

create index if not exists friendships_recipient_status_idx
  on public.friendships (recipient_id, status);

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

-- 2. helper: are two users friends ?
create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.friendships
     where status = 'accepted'
       and (
         (requester_id = user_a and recipient_id = user_b)
         or (requester_id = user_b and recipient_id = user_a)
       )
  );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- 3. RLS friendships
alter table public.friendships enable row level security;

drop policy if exists "users can view own friendships" on public.friendships;
create policy "users can view own friendships"
  on public.friendships for select
  using (
    auth.uid() = requester_id or auth.uid() = recipient_id
  );

drop policy if exists "users can send a request" on public.friendships;
create policy "users can send a request"
  on public.friendships for insert
  with check (
    auth.uid() = requester_id
    and requester_id <> recipient_id
    and status = 'pending'
  );

drop policy if exists "involved users can update status" on public.friendships;
create policy "involved users can update status"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "involved users can delete" on public.friendships;
create policy "involved users can delete"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- 4. Trigger : à l'acceptation, créer une conversation + un message système
create or replace function public.handle_friendship_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  msg_body text;
  requester_name text;
  recipient_name text;
begin
  if new.status = 'accepted'
     and (old.status is null or old.status <> 'accepted') then

    new.responded_at := now();

    -- Look for existing direct conversation
    select c.id into conv_id
      from public.conversations c
     where c.type = 'direct'
       and exists (
         select 1 from public.conversation_members
         where conversation_id = c.id and user_id = new.requester_id
       )
       and exists (
         select 1 from public.conversation_members
         where conversation_id = c.id and user_id = new.recipient_id
       )
     limit 1;

    if conv_id is null then
      insert into public.conversations (type, created_by)
        values ('direct', new.requester_id)
        returning id into conv_id;

      insert into public.conversation_members (conversation_id, user_id, role)
        values
          (conv_id, new.requester_id, 'owner'),
          (conv_id, new.recipient_id, 'member');
    end if;

    -- Look up display names for the system message
    select coalesce(full_name, username, 'un utilisateur')
      into requester_name
      from public.profiles
     where id = new.requester_id;

    select coalesce(full_name, username, 'un utilisateur')
      into recipient_name
      from public.profiles
     where id = new.recipient_id;

    msg_body := format(
      '%s et %s sont maintenant amis. La discussion peut commencer ✨',
      coalesce(requester_name, 'un utilisateur'),
      coalesce(recipient_name, 'un utilisateur')
    );

    insert into public.messages (conversation_id, sender_id, body, type)
      values (conv_id, new.requester_id, msg_body, 'system');
  elsif new.status in ('rejected', 'cancelled')
        and (old.status is null or old.status not in ('rejected', 'cancelled')) then
    new.responded_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists friendships_accepted on public.friendships;
create trigger friendships_accepted
  before update on public.friendships
  for each row execute function public.handle_friendship_accepted();

-- 5. RPC : envoyer une demande d'ami
create or replace function public.send_friend_request(
  recipient_user_id uuid,
  intro text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  existing_id uuid;
  recipient_discoverable boolean;
  new_id uuid;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  if current_uid = recipient_user_id then
    raise exception 'cannot send a friend request to yourself';
  end if;

  -- Vérifie que la cible existe et est discoverable
  select discoverable into recipient_discoverable
    from public.profiles
   where id = recipient_user_id;

  if recipient_discoverable is null then
    raise exception 'recipient not found';
  end if;

  if not recipient_discoverable then
    raise exception 'recipient is not discoverable';
  end if;

  -- Conflits éventuels
  select id into existing_id
    from public.friendships
   where status in ('pending', 'accepted')
     and (
       (requester_id = current_uid and recipient_id = recipient_user_id)
       or (requester_id = recipient_user_id and recipient_id = current_uid)
     )
   limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.friendships (requester_id, recipient_id, intro_message, status)
    values (current_uid, recipient_user_id, intro, 'pending')
    returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.send_friend_request(uuid, text) to authenticated;

-- 6. Update existing get_or_create_direct_conversation : on conserve son rôle
--    (création directe utilisée par le trigger), mais on en interdit l'usage
--    direct depuis le client en exigeant que les utilisateurs soient amis.
create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  conv_id uuid;
begin
  current_uid := auth.uid();

  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  if current_uid = other_user_id then
    raise exception 'cannot create a direct conversation with yourself';
  end if;

  if not public.are_friends(current_uid, other_user_id) then
    raise exception 'users must be friends';
  end if;

  -- Look for existing direct conversation between the two users
  select c.id
    into conv_id
    from public.conversations c
   where c.type = 'direct'
     and exists (
       select 1
         from public.conversation_members cm
        where cm.conversation_id = c.id
          and cm.user_id = current_uid
     )
     and exists (
       select 1
         from public.conversation_members cm
        where cm.conversation_id = c.id
          and cm.user_id = other_user_id
     )
   limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (type, created_by)
       values ('direct', current_uid)
    returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id, role)
       values
         (conv_id, current_uid, 'owner'),
         (conv_id, other_user_id, 'member');

  return conv_id;
end;
$$;

-- 7. Realtime
alter publication supabase_realtime add table public.friendships;
