-- =====================================================
-- DIVARC — Migration 0056 : Notifications Reels & Posts (V3)
--
-- Étend l'enum notifications.type pour couvrir les interactions sur
-- reels (like, comment, comment_reply, comment_like, mention) et posts
-- (like, comment, mention). Ajoute les colonnes related_* nécessaires
-- et les triggers DB SECURITY DEFINER pour insérer les notifs dès qu'un
-- engagement a lieu, en skippant les self-notifications.
--
-- Tous les triggers sont idempotents (drop+create) et résistants aux
-- soft-deletes (deleted_at filter sur reel_comments).
-- =====================================================

-- 1. Étendre l'enum CHECK type
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    -- legacy
    'friend_request_received',
    'friend_request_accepted',
    'friend_request_rejected',
    'new_message',
    'system',
    -- moderation (préservés pour compat TS)
    'moderation_decision',
    'moderation_report_resolved',
    'moderation_appeal_resolved',
    -- legacy : mention émis par 0023 trigger sur posts
    'mention',
    -- posts (V3)
    'post_liked',
    'post_commented',
    'post_mention',
    -- reels (V3)
    'reel_liked',
    'reel_commented',
    'reel_comment_replied',
    'reel_comment_liked',
    'reel_mention'
  ));

-- 2. Colonnes liées (FK ON DELETE CASCADE pour cleanup auto)
alter table public.notifications
  add column if not exists related_post_id uuid
    references public.posts(id) on delete cascade;

alter table public.notifications
  add column if not exists related_reel_id uuid
    references public.reels(id) on delete cascade;

alter table public.notifications
  add column if not exists related_reel_comment_id uuid
    references public.reel_comments(id) on delete cascade;

create index if not exists notifications_related_reel_id_idx
  on public.notifications (related_reel_id)
  where related_reel_id is not null;

create index if not exists notifications_related_post_id_idx
  on public.notifications (related_post_id)
  where related_post_id is not null;

-- =====================================================
-- 3. Trigger : like sur un post
-- =====================================================
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

  -- Skip si auteur supprimé/inconnu OU self-like
  if post_author is null or post_author = new.user_id then
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

drop trigger if exists notify_post_liked_trg on public.post_likes;
create trigger notify_post_liked_trg
  after insert on public.post_likes
  for each row execute function public.notify_post_liked();

-- =====================================================
-- 4. Trigger : commentaire sur un post
-- =====================================================
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
  if new.deleted_at is not null then
    return new;
  end if;

  select author_id into post_author
    from public.posts
   where id = new.post_id
     and deleted_at is null;

  if post_author is null or post_author = new.author_id then
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

drop trigger if exists notify_post_commented_trg on public.post_comments;
create trigger notify_post_commented_trg
  after insert on public.post_comments
  for each row execute function public.notify_post_commented();

-- =====================================================
-- 5. Trigger : like sur un reel
-- =====================================================
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

drop trigger if exists notify_reel_liked_trg on public.reel_likes;
create trigger notify_reel_liked_trg
  after insert on public.reel_likes
  for each row execute function public.notify_reel_liked();

-- =====================================================
-- 6. Trigger : commentaire / reply sur un reel
--    - Root comment (parent_id null) → notif au reel_author
--    - Reply (parent_id not null)    → notif au parent_author
--    Skip self-notifications.
-- =====================================================
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
  if new.deleted_at is not null then
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

  if new.parent_id is null then
    -- Root comment → notify reel author
    select author_id into reel_author
      from public.reels
     where id = new.reel_id
       and deleted_at is null;

    notif_target := reel_author;
    notif_type := 'reel_commented';
    notif_title := coalesce(commenter_name, 'Quelqu''un') || ' a commenté ton reel';
  else
    -- Reply → notify parent comment author
    select author_id into parent_author
      from public.reel_comments
     where id = new.parent_id
       and deleted_at is null;

    notif_target := parent_author;
    notif_type := 'reel_comment_replied';
    notif_title := coalesce(commenter_name, 'Quelqu''un') || ' a répondu à ton commentaire';
  end if;

  -- Skip si target nulle ou self-comment
  if notif_target is null or notif_target = new.author_id then
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

drop trigger if exists notify_reel_commented_trg on public.reel_comments;
create trigger notify_reel_commented_trg
  after insert on public.reel_comments
  for each row execute function public.notify_reel_commented();

-- =====================================================
-- 7. Trigger : like sur un commentaire de reel
-- =====================================================
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

drop trigger if exists notify_reel_comment_liked_trg on public.reel_comment_likes;
create trigger notify_reel_comment_liked_trg
  after insert on public.reel_comment_likes
  for each row execute function public.notify_reel_comment_liked();

-- =====================================================
-- 8. Trigger : mention dans la description d'un reel
--    Itère mentioned_users[] (déjà résolu côté action) et notifie.
-- =====================================================
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
  -- Skip si pas de mentions ou si reel pas encore publié
  if new.mentioned_users is null or array_length(new.mentioned_users, 1) is null then
    return new;
  end if;

  if new.status is not null and new.status not in ('published', 'public') then
    -- On notifie au moment de la publication uniquement (V1 : status='published' direct).
    -- Si un reel passe de scheduled→published, ce trigger refire-t-il ? Non,
    -- car after insert seulement. Pour scheduled→published on aurait besoin
    -- d'un trigger after update — V3.5.
    null;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into author_name
    from public.profiles
   where id = new.author_id;

  body_preview := substring(coalesce(new.description, '') from 1 for 120);

  foreach target in array new.mentioned_users loop
    -- Skip self-mention
    if target = new.author_id then continue; end if;

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

drop trigger if exists notify_reel_mentions_trg on public.reels;
create trigger notify_reel_mentions_trg
  after insert on public.reels
  for each row execute function public.notify_reel_mentions();

-- =====================================================
-- 9. RPC : marquer comme lues les notifs liées à un reel
-- =====================================================
create or replace function public.mark_reel_notifications_read(reel_id uuid)
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
     and related_reel_id = reel_id
     and read_at is null;
end;
$$;

grant execute on function public.mark_reel_notifications_read(uuid)
  to authenticated;

-- 10. RPC : marquer comme lues les notifs liées à un post
create or replace function public.mark_post_notifications_read(post_id uuid)
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
     and related_post_id = post_id
     and read_at is null;
end;
$$;

grant execute on function public.mark_post_notifications_read(uuid)
  to authenticated;
