-- =====================================================
-- DIVARC — Migration 0067 : Follow asymétrique + Close Friends (étape 2.5)
--
-- Système de relations sociales en 3 couches :
--   1. friendships (existant, 0004) : relation SYMÉTRIQUE bilatérale
--      → besoin acceptation, accès profil étendu
--   2. pro_connections (existant, 0026) : relation pro SYMÉTRIQUE avec
--      context (manager/colleague/etc.) → LinkedIn-style
--   3. user_follows (NOUVEAU) : suivi ASYMÉTRIQUE unilatéral
--      → comme Instagram, pas d'acceptation requise (sauf profile privé)
--   4. close_friends (NOUVEAU) : ami proche pour visibilité privilégiée
--      → liste curated par l'utilisateur pour stories/posts close-friends
--
-- Counters dénormalisés sur profiles : followers_count, following_count
-- (maintenus par triggers).
-- =====================================================

-- 1. user_follows (follow asymétrique style Instagram)
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint no_self_follow check (follower_id <> followed_id)
);

create index if not exists user_follows_follower_idx
  on public.user_follows (follower_id, created_at desc);

create index if not exists user_follows_followed_idx
  on public.user_follows (followed_id, created_at desc);

-- 2. close_friends (visibilité privilégiée)
create table if not exists public.close_friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  close_friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, close_friend_id),
  constraint no_self_close_friend check (user_id <> close_friend_id)
);

create index if not exists close_friends_user_idx
  on public.close_friends (user_id);

-- =====================================================
-- 3. Counters dénormalisés sur profiles
-- =====================================================
alter table public.profiles
  add column if not exists followers_count integer not null default 0
    check (followers_count >= 0),
  add column if not exists following_count integer not null default 0
    check (following_count >= 0);

-- Trigger : maintient followers_count + following_count sur user_follows
create or replace function public.bump_follows_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
       set followers_count = followers_count + 1
     where id = new.followed_id;
    update public.profiles
       set following_count = following_count + 1
     where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update public.profiles
       set followers_count = greatest(followers_count - 1, 0)
     where id = old.followed_id;
    update public.profiles
       set following_count = greatest(following_count - 1, 0)
     where id = old.follower_id;
  end if;
  return null;
end;
$$;

drop trigger if exists user_follows_counters_ins on public.user_follows;
drop trigger if exists user_follows_counters_del on public.user_follows;
create trigger user_follows_counters_ins
  after insert on public.user_follows
  for each row execute function public.bump_follows_counters();
create trigger user_follows_counters_del
  after delete on public.user_follows
  for each row execute function public.bump_follows_counters();

-- Backfill counters pour les rows déjà existantes (pas de user_follows
-- préexistants, mais on initialise à 0 pour cohérence).
update public.profiles set followers_count = 0, following_count = 0
  where followers_count is null or following_count is null;

-- =====================================================
-- 4. RLS
-- =====================================================
alter table public.user_follows enable row level security;
alter table public.close_friends enable row level security;

-- user_follows :
-- SELECT : tout authenticated (utile pour graphes mutuels + lists publiques)
-- INSERT/DELETE : seulement par le follower
drop policy if exists "follows visible by everyone" on public.user_follows;
create policy "follows visible by everyone"
  on public.user_follows for select using (true);

drop policy if exists "users can follow others" on public.user_follows;
create policy "users can follow others"
  on public.user_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "users can unfollow" on public.user_follows;
create policy "users can unfollow"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

-- close_friends : visible seulement par l'owner, RW only owner
drop policy if exists "owner reads own close friends" on public.close_friends;
create policy "owner reads own close friends"
  on public.close_friends for select
  using (auth.uid() = user_id);

drop policy if exists "owner manages own close friends" on public.close_friends;
create policy "owner manages own close friends"
  on public.close_friends for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================
-- 5. RPC utilitaires
-- =====================================================

-- Toggle follow (insert si pas suivi, delete si déjà suivi)
create or replace function public.toggle_follow(p_followed_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  exists_row boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if uid = p_followed_id then raise exception 'cannot follow self'; end if;

  select exists(
    select 1 from public.user_follows
     where follower_id = uid and followed_id = p_followed_id
  ) into exists_row;

  if exists_row then
    delete from public.user_follows
      where follower_id = uid and followed_id = p_followed_id;
    return false; -- now not following
  else
    insert into public.user_follows (follower_id, followed_id)
      values (uid, p_followed_id);
    return true; -- now following
  end if;
end;
$$;

grant execute on function public.toggle_follow(uuid) to authenticated;

-- Check si A suit B
create or replace function public.is_following(
  p_follower_id uuid,
  p_followed_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_follows
     where follower_id = p_follower_id and followed_id = p_followed_id
  );
$$;

grant execute on function public.is_following(uuid, uuid) to authenticated;

-- Mutual connections (users qui suivent A ET B)
create or replace function public.get_mutual_followers(
  p_user_a uuid,
  p_user_b uuid,
  p_limit integer default 12
)
returns table (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id as user_id, p.full_name, p.username, p.avatar_url
    from public.user_follows fa
    join public.user_follows fb on fa.follower_id = fb.follower_id
    join public.profiles p on p.id = fa.follower_id
   where fa.followed_id = p_user_a
     and fb.followed_id = p_user_b
   order by p.full_name nulls last
   limit p_limit;
$$;

grant execute on function public.get_mutual_followers(uuid, uuid, integer)
  to authenticated;

-- Toggle close friend
create or replace function public.toggle_close_friend(p_close_friend_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  exists_row boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if uid = p_close_friend_id then raise exception 'cannot close-friend self'; end if;

  select exists(
    select 1 from public.close_friends
     where user_id = uid and close_friend_id = p_close_friend_id
  ) into exists_row;

  if exists_row then
    delete from public.close_friends
      where user_id = uid and close_friend_id = p_close_friend_id;
    return false;
  else
    insert into public.close_friends (user_id, close_friend_id)
      values (uid, p_close_friend_id);
    return true;
  end if;
end;
$$;

grant execute on function public.toggle_close_friend(uuid) to authenticated;
