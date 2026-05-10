-- =====================================================
-- DIVARC — Migration 0057 : Notification preferences (V3.5)
--
-- Permet à chaque user d'opter out de catégories de notifications. Une
-- catégorie regroupe plusieurs notification_type (ex. "likes" couvre
-- post_liked + reel_liked + reel_comment_liked).
--
-- Catégories :
--   friend_requests  (friend_request_*)
--   messages         (new_message)
--   mentions         (post_mention, reel_mention)
--   likes            (post_liked, reel_liked, reel_comment_liked)
--   comments         (post_commented, reel_commented, reel_comment_replied)
--   moderation       (moderation_*)
--   system           (system + tout fallback)
--
-- Helper SQL `should_notify_user(uid, type)` : appelé par chaque trigger
-- notify_* AVANT INSERT. Si false → trigger skip silently.
-- =====================================================

-- 1. Table preferences (1 row par user, auto-init lazy au 1er save)
create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  friend_requests boolean not null default true,
  messages boolean not null default true,
  mentions boolean not null default true,
  likes boolean not null default true,
  comments boolean not null default true,
  moderation boolean not null default true,
  system boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_notification_preferences enable row level security;

drop policy if exists "users read own notif prefs"
  on public.user_notification_preferences;
create policy "users read own notif prefs"
  on public.user_notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own notif prefs"
  on public.user_notification_preferences;
create policy "users insert own notif prefs"
  on public.user_notification_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own notif prefs"
  on public.user_notification_preferences;
create policy "users update own notif prefs"
  on public.user_notification_preferences for update
  using (auth.uid() = user_id);

-- 2. Helper SQL : devrait-on notifier ?
-- Mapping notification_type → catégorie.
-- Default : true (notif système par défaut, mieux qu'un opt-out silencieux
-- si la catégorie n'est pas mappée).
create or replace function public.should_notify_user(
  target_user_id uuid,
  notif_type text
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  prefs record;
  category text;
begin
  -- Mapping type → category
  category := case
    when notif_type in (
      'friend_request_received',
      'friend_request_accepted',
      'friend_request_rejected'
    ) then 'friend_requests'
    when notif_type = 'new_message' then 'messages'
    when notif_type in ('post_mention', 'reel_mention', 'mention') then 'mentions'
    when notif_type in (
      'post_liked', 'reel_liked', 'reel_comment_liked'
    ) then 'likes'
    when notif_type in (
      'post_commented', 'reel_commented', 'reel_comment_replied'
    ) then 'comments'
    when notif_type in (
      'moderation_decision',
      'moderation_report_resolved',
      'moderation_appeal_resolved'
    ) then 'moderation'
    else 'system'
  end;

  select * into prefs
    from public.user_notification_preferences
   where user_id = target_user_id;

  -- Pas de row : tout opt-in par défaut
  if prefs is null then
    return true;
  end if;

  return case category
    when 'friend_requests' then prefs.friend_requests
    when 'messages' then prefs.messages
    when 'mentions' then prefs.mentions
    when 'likes' then prefs.likes
    when 'comments' then prefs.comments
    when 'moderation' then prefs.moderation
    else prefs.system
  end;
end;
$$;

grant execute on function public.should_notify_user(uuid, text) to authenticated;

-- 3. RPC : récupérer (ou créer) les préférences de l'user courant
create or replace function public.get_notification_preferences()
returns public.user_notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.user_notification_preferences;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into result
    from public.user_notification_preferences
   where user_id = uid;

  if result is null then
    insert into public.user_notification_preferences (user_id)
      values (uid)
      returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.get_notification_preferences() to authenticated;

-- 4. Mise à jour des triggers existants : check should_notify_user AVANT INSERT
--
-- On régénère uniquement les triggers V3 (Big-A). Pour les triggers legacy
-- (friend_request_received, friend_request_accepted, new_message) on
-- pourrait aussi les wrapper mais on les laisse intacts pour V3.5 — ils
-- couvrent des cas critiques (messages, demandes amis) où l'opt-out aurait
-- des conséquences sociales graves. Les utilisateurs power qui veulent
-- vraiment couper auront le toggle, mais l'enforcement ajouté ici cible
-- les triggers de la V3 (likes/comments/mentions reels & posts).

-- Wrapper helper pour réduire la duplication : on régénère chaque trigger
-- en ajoutant un `if not should_notify_user(target, type) then return new`
-- au début de la branche insert.

-- post_liked
create or replace function public.notify_post_liked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  liker_name text;
  post_author uuid;
  body_preview text;
begin
  select author_id, substring(coalesce(body, '') from 1 for 80)
    into post_author, body_preview
    from public.posts
   where id = new.post_id
     and deleted_at is null;

  if post_author is null or post_author = new.user_id then
    return new;
  end if;
  if not public.should_notify_user(post_author, 'post_liked') then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into liker_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, related_post_id, href
  ) values (
    post_author,
    'post_liked',
    coalesce(liker_name, 'Quelqu''un') || ' a aimé ta publication',
    nullif(body_preview, ''),
    new.user_id,
    new.post_id,
    '/feed/' || new.post_id::text
  );
  return new;
end;
$$;

-- post_commented
create or replace function public.notify_post_commented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  commenter_name text;
  post_author uuid;
  preview text;
begin
  if new.deleted_at is not null then return new; end if;

  select author_id into post_author
    from public.posts
   where id = new.post_id
     and deleted_at is null;

  if post_author is null or post_author = new.author_id then
    return new;
  end if;
  if not public.should_notify_user(post_author, 'post_commented') then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into commenter_name
    from public.profiles
   where id = new.author_id;

  preview := substring(new.body from 1 for 140);
  if char_length(new.body) > 140 then
    preview := preview || '…';
  end if;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, related_post_id, href
  ) values (
    post_author,
    'post_commented',
    coalesce(commenter_name, 'Quelqu''un') || ' a commenté ta publication',
    preview,
    new.author_id,
    new.post_id,
    '/feed/' || new.post_id::text
  );
  return new;
end;
$$;

-- reel_liked
create or replace function public.notify_reel_liked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  liker_name text;
  reel_author uuid;
  reel_caption text;
begin
  select author_id, substring(coalesce(description, '') from 1 for 80)
    into reel_author, reel_caption
    from public.reels
   where id = new.reel_id
     and deleted_at is null;

  if reel_author is null or reel_author = new.user_id then
    return new;
  end if;
  if not public.should_notify_user(reel_author, 'reel_liked') then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into liker_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, related_reel_id, href
  ) values (
    reel_author,
    'reel_liked',
    coalesce(liker_name, 'Quelqu''un') || ' a aimé ton reel',
    nullif(reel_caption, ''),
    new.user_id,
    new.reel_id,
    '/reels/' || new.reel_id::text
  );
  return new;
end;
$$;

-- reel_commented (root + reply)
create or replace function public.notify_reel_commented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  commenter_name text;
  reel_author uuid;
  parent_author uuid;
  preview text;
  notif_target uuid;
  notif_type text;
  notif_title text;
begin
  if new.deleted_at is not null then return new; end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into commenter_name
    from public.profiles
   where id = new.author_id;

  preview := substring(new.body from 1 for 140);
  if char_length(new.body) > 140 then
    preview := preview || '…';
  end if;

  if new.parent_id is null then
    select author_id into reel_author
      from public.reels
     where id = new.reel_id
       and deleted_at is null;
    notif_target := reel_author;
    notif_type := 'reel_commented';
    notif_title := coalesce(commenter_name, 'Quelqu''un') || ' a commenté ton reel';
  else
    select author_id into parent_author
      from public.reel_comments
     where id = new.parent_id
       and deleted_at is null;
    notif_target := parent_author;
    notif_type := 'reel_comment_replied';
    notif_title := coalesce(commenter_name, 'Quelqu''un') || ' a répondu à ton commentaire';
  end if;

  if notif_target is null or notif_target = new.author_id then
    return new;
  end if;
  if not public.should_notify_user(notif_target, notif_type) then
    return new;
  end if;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, related_reel_id, related_reel_comment_id, href
  ) values (
    notif_target,
    notif_type,
    notif_title,
    preview,
    new.author_id,
    new.reel_id,
    new.id,
    '/reels/' || new.reel_id::text
  );
  return new;
end;
$$;

-- reel_comment_liked
create or replace function public.notify_reel_comment_liked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  liker_name text;
  comment_author uuid;
  comment_reel uuid;
  comment_preview text;
begin
  select author_id, reel_id, substring(body from 1 for 80)
    into comment_author, comment_reel, comment_preview
    from public.reel_comments
   where id = new.comment_id
     and deleted_at is null;

  if comment_author is null or comment_author = new.user_id then
    return new;
  end if;
  if not public.should_notify_user(comment_author, 'reel_comment_liked') then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into liker_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, related_reel_id, related_reel_comment_id, href
  ) values (
    comment_author,
    'reel_comment_liked',
    coalesce(liker_name, 'Quelqu''un') || ' a aimé ton commentaire',
    comment_preview,
    new.user_id,
    comment_reel,
    new.comment_id,
    '/reels/' || comment_reel::text
  );
  return new;
end;
$$;

-- reel_mentions
create or replace function public.notify_reel_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
  body_preview text;
  target uuid;
begin
  if new.mentioned_users is null or array_length(new.mentioned_users, 1) is null then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into author_name
    from public.profiles
   where id = new.author_id;

  body_preview := substring(coalesce(new.description, '') from 1 for 120);

  foreach target in array new.mentioned_users loop
    if target = new.author_id then continue; end if;
    if not public.should_notify_user(target, 'reel_mention') then continue; end if;

    insert into public.notifications (
      user_id, type, title, body,
      related_user_id, related_reel_id, href
    ) values (
      target,
      'reel_mention',
      coalesce(author_name, 'Quelqu''un') || ' t''a mentionné dans un reel',
      nullif(body_preview, ''),
      new.author_id,
      new.id,
      '/reels/' || new.id::text
    );
  end loop;

  return new;
end;
$$;
