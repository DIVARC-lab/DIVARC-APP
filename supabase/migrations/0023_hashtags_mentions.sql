-- =====================================================
-- DIVARC — Migration 0023 : Hashtags + Mentions
--   Extraction automatique via trigger Postgres après INSERT/UPDATE
--   sur posts et post_comments.
--   Stockage normalisé pour requêtes /feed/tag/[tag] efficaces.
--   Notification automatique des utilisateurs mentionnés.
-- =====================================================

-- =========================================================
-- 1. hashtags : référentiel global, lowercase, slug
-- =========================================================
create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag ~ '^[a-z0-9_éèêëàâäîïôöùûüç]{1,40}$'),
  posts_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists hashtags_posts_count_idx
  on public.hashtags (posts_count desc);

-- =========================================================
-- 2. post_hashtags : join (post, hashtag)
-- =========================================================
create table if not exists public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, hashtag_id)
);

create index if not exists post_hashtags_hashtag_idx
  on public.post_hashtags (hashtag_id, created_at desc);

-- =========================================================
-- 3. post_mentions : join (post, mentioned_user)
-- =========================================================
create table if not exists public.post_mentions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_mentions_user_idx
  on public.post_mentions (user_id, created_at desc);

-- =========================================================
-- 4. Compteur posts_count : trigger sur post_hashtags
-- =========================================================
create or replace function public.bump_hashtag_posts_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.hashtags set posts_count = posts_count + 1
      where id = new.hashtag_id;
  elsif tg_op = 'DELETE' then
    update public.hashtags set posts_count = greatest(posts_count - 1, 0)
      where id = old.hashtag_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_hashtags_count_ins on public.post_hashtags;
drop trigger if exists post_hashtags_count_del on public.post_hashtags;
create trigger post_hashtags_count_ins
  after insert on public.post_hashtags
  for each row execute function public.bump_hashtag_posts_count();
create trigger post_hashtags_count_del
  after delete on public.post_hashtags
  for each row execute function public.bump_hashtag_posts_count();

-- =========================================================
-- 5. Extraction automatique sur INSERT/UPDATE de post.body
--    - hashtags : matchs #word, slugifiés
--    - mentions : matchs @username, résolus contre profiles.username
-- =========================================================
create or replace function public.extract_post_entities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_record record;
  tag_value text;
  hashtag_id uuid;
  username_value text;
  mentioned_user uuid;
  author_full_name text;
  body_preview text;
begin
  -- Skip si body inchangé sur UPDATE
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return new;
  end if;

  -- Reset des anciennes entités du post
  delete from public.post_hashtags where post_id = new.id;
  delete from public.post_mentions where post_id = new.id;

  if new.body is null then return new; end if;

  -- ===== Hashtags =====
  for match_record in
    select distinct lower(substring(m[1] from 2))
        as tag
      from regexp_matches(
        new.body,
        '(#[A-Za-zÀ-ÖØ-öø-ÿ0-9_]{1,40})',
        'g'
      ) as m
  loop
    tag_value := match_record.tag;
    if tag_value is null or length(tag_value) = 0 then continue; end if;
    -- Insert ou récupère
    insert into public.hashtags (tag) values (tag_value)
      on conflict (tag) do update set tag = excluded.tag
      returning id into hashtag_id;
    if hashtag_id is null then
      select id into hashtag_id from public.hashtags where tag = tag_value;
    end if;
    if hashtag_id is not null then
      insert into public.post_hashtags (post_id, hashtag_id)
           values (new.id, hashtag_id)
        on conflict do nothing;
    end if;
  end loop;

  -- ===== Mentions =====
  -- Récupère l'auteur pour les notifs
  select coalesce(full_name, username, 'Quelqu''un')
    into author_full_name
    from public.profiles where id = new.author_id;

  body_preview := substring(coalesce(new.body, '') from 1 for 120);

  for match_record in
    select distinct lower(substring(m[1] from 2))
        as username
      from regexp_matches(
        new.body,
        '(@[a-z0-9_]{3,20})',
        'g'
      ) as m
  loop
    username_value := match_record.username;
    select id into mentioned_user
      from public.profiles
     where username = username_value;
    if mentioned_user is null then continue; end if;
    if mentioned_user = new.author_id then continue; end if;

    insert into public.post_mentions (post_id, user_id)
         values (new.id, mentioned_user)
      on conflict do nothing;

    -- Notif uniquement à l'INSERT (pas re-notif sur edit)
    if tg_op = 'INSERT' then
      insert into public.notifications (
        user_id, type, title, body, related_user_id, href
      ) values (
        mentioned_user,
        'mention',
        author_full_name || ' t''a mentionné',
        body_preview,
        new.author_id,
        '/feed/' || new.id::text
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists posts_extract_entities on public.posts;
create trigger posts_extract_entities
  after insert or update on public.posts
  for each row execute function public.extract_post_entities();

-- =========================================================
-- 6. RLS — hashtags / post_hashtags (lecture publique, écriture trigger)
-- =========================================================

alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.post_mentions enable row level security;

drop policy if exists "hashtags are public" on public.hashtags;
create policy "hashtags are public"
  on public.hashtags for select using (true);

drop policy if exists "post_hashtags are public" on public.post_hashtags;
create policy "post_hashtags are public"
  on public.post_hashtags for select using (true);

drop policy if exists "post_mentions visible to mentionned and author"
  on public.post_mentions;
create policy "post_mentions visible to mentionned and author"
  on public.post_mentions for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.posts p
       where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- (Insertions sont faites uniquement par les triggers SECURITY DEFINER,
--  pas besoin de policy permissive sur INSERT.)

-- =========================================================
-- 7. RPC : posts par hashtag (visibilité = public uniquement)
-- =========================================================
create or replace function public.posts_by_hashtag(
  tag_text text,
  page_limit integer default 30
)
returns table (
  id uuid,
  author_id uuid,
  body text,
  visibility text,
  created_at timestamptz,
  likes_count integer,
  comments_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select p.id,
           p.author_id,
           p.body,
           p.visibility,
           p.created_at,
           (select count(*) from public.post_likes l where l.post_id = p.id)::integer,
           (select count(*) from public.post_comments c where c.post_id = p.id and c.deleted_at is null)::integer
      from public.posts p
      join public.post_hashtags ph on ph.post_id = p.id
      join public.hashtags h on h.id = ph.hashtag_id
     where h.tag = lower(tag_text)
       and p.deleted_at is null
       and p.visibility = 'public'
     order by p.created_at desc
     limit page_limit;
end;
$$;

grant execute on function public.posts_by_hashtag(text, integer) to authenticated;

-- =========================================================
-- 8. Realtime
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'hashtags', 'post_hashtags', 'post_mentions'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
