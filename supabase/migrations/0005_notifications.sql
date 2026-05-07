-- =====================================================
-- DIVARC — Migration 0005 : Notifications
-- =====================================================

-- 1. Table notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'friend_request_received',
    'friend_request_accepted',
    'friend_request_rejected',
    'new_message',
    'system'
  )),
  title text not null,
  body text,
  related_user_id uuid references auth.users(id) on delete cascade,
  related_conversation_id uuid references public.conversations(id) on delete cascade,
  related_friendship_id uuid references public.friendships(id) on delete cascade,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- 2. RLS
alter table public.notifications enable row level security;

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

drop policy if exists "users can delete own notifications" on public.notifications;
create policy "users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- INSERT : seules les fonctions SECURITY DEFINER (triggers) écrivent ici.

-- 3. Trigger : demande d'ami reçue
create or replace function public.notify_friend_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into requester_name
    from public.profiles
   where id = new.requester_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, related_friendship_id, href
  ) values (
    new.recipient_id,
    'friend_request_received',
    requester_name || ' veut être ton ami',
    coalesce(new.intro_message, 'Accepter pour pouvoir discuter ensemble.'),
    new.requester_id,
    new.id,
    '/friends?tab=recues'
  );

  return new;
end;
$$;

drop trigger if exists notify_friend_request_received_trg on public.friendships;
create trigger notify_friend_request_received_trg
  after insert on public.friendships
  for each row execute function public.notify_friend_request_received();

-- 4. Trigger : demande d'ami acceptée
create or replace function public.notify_friendship_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  other_name text;
begin
  if new.status = 'accepted'
     and (old.status is null or old.status <> 'accepted') then

    select coalesce(full_name, username, 'Quelqu''un')
      into other_name
      from public.profiles
     where id = new.recipient_id;

    -- Trouver la conversation créée par le trigger handle_friendship_accepted
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

    insert into public.notifications (
      user_id, type, title, body,
      related_user_id, related_friendship_id, related_conversation_id, href
    ) values (
      new.requester_id,
      'friend_request_accepted',
      other_name || ' a accepté ta demande',
      'Vous pouvez maintenant discuter ensemble.',
      new.recipient_id,
      new.id,
      conv_id,
      case
        when conv_id is not null then '/messages/' || conv_id::text
        else '/friends?tab=amis'
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_friendship_status_changed_trg on public.friendships;
create trigger notify_friendship_status_changed_trg
  after update on public.friendships
  for each row execute function public.notify_friendship_status_changed();

-- 5. Trigger : nouveau message
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  member_record record;
  preview text;
  conv_type text;
begin
  -- Pas de notif sur les messages système
  if new.type = 'system' then
    return new;
  end if;

  select type into conv_type
    from public.conversations
   where id = new.conversation_id;

  select coalesce(full_name, username, 'Quelqu''un')
    into sender_name
    from public.profiles
   where id = new.sender_id;

  preview := substring(new.body from 1 for 140);
  if char_length(new.body) > 140 then
    preview := preview || '…';
  end if;

  -- Notifier les autres membres de la conversation
  for member_record in
    select user_id
      from public.conversation_members
     where conversation_id = new.conversation_id
       and user_id <> new.sender_id
  loop
    insert into public.notifications (
      user_id, type, title, body,
      related_user_id, related_conversation_id, href
    ) values (
      member_record.user_id,
      'new_message',
      sender_name,
      preview,
      new.sender_id,
      new.conversation_id,
      '/messages/' || new.conversation_id::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_new_message_trg on public.messages;
create trigger notify_new_message_trg
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- 6. RPC : marquer toutes les notifications comme lues
create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null;
end;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- 7. RPC : marquer comme lues les notifs liées à une conversation
create or replace function public.mark_conversation_notifications_read(conv_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and related_conversation_id = conv_id
     and read_at is null;
end;
$$;

grant execute on function public.mark_conversation_notifications_read(uuid)
  to authenticated;

-- 8. Realtime (idempotent)
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
