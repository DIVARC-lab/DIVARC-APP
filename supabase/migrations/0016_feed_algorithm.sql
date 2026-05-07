-- =====================================================
-- DIVARC — Migration 0016 : Algorithme de feed
-- =====================================================

-- 1. post_views : suivi des impressions par utilisateur
create table if not exists public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (post_id, viewer_id)
);

create index if not exists post_views_viewer_id_viewed_at_idx
  on public.post_views (viewer_id, viewed_at desc);

-- 2. RLS : un user voit/écrit uniquement ses propres vues
alter table public.post_views enable row level security;

drop policy if exists "users see own views" on public.post_views;
create policy "users see own views"
  on public.post_views for select
  using (viewer_id = auth.uid());

drop policy if exists "users record own views" on public.post_views;
create policy "users record own views"
  on public.post_views for insert
  with check (viewer_id = auth.uid());

-- 3. RPC : feed scoré (algorithme heuristique)
-- Score = engagement × decay × friendship × view_penalty
-- Engagement = ln(1 + likes + 2*comments)
-- Decay = exp(-age_hours / 30) (demi-vie ~21h)
-- Friendship = 3 si ami, 1 sinon
-- View_penalty = 0.25 si déjà vu, 1 sinon
create or replace function public.rank_feed_posts(
  feed_limit integer default 30
)
returns table (
  id uuid,
  author_id uuid,
  body text,
  visibility text,
  created_at timestamptz,
  likes_count integer,
  comments_count integer,
  is_friend boolean,
  is_viewed boolean,
  is_liked boolean,
  score double precision
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_uid uuid;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  return query
  with friend_ids as (
    select case when requester_id = current_uid then recipient_id
                else requester_id end as friend_id
      from public.friendships
     where status = 'accepted'
       and (requester_id = current_uid or recipient_id = current_uid)
  ),
  visible as (
    select p.*
      from public.posts p
     where p.deleted_at is null
       and p.created_at > (now() - interval '30 days')
       and (
         p.author_id = current_uid
         or p.visibility = 'public'
         or (p.visibility = 'friends' and exists (
              select 1 from friend_ids where friend_id = p.author_id
            ))
       )
  ),
  enriched as (
    select
      v.id,
      v.author_id,
      v.body,
      v.visibility,
      v.created_at,
      coalesce((select count(*) from public.post_likes l where l.post_id = v.id), 0)::integer as likes_count,
      coalesce((
        select count(*) from public.post_comments c
         where c.post_id = v.id and c.deleted_at is null
      ), 0)::integer as comments_count,
      exists (select 1 from friend_ids fi where fi.friend_id = v.author_id) as is_friend,
      exists (
        select 1 from public.post_views pv
         where pv.post_id = v.id and pv.viewer_id = current_uid
      ) as is_viewed,
      exists (
        select 1 from public.post_likes pl
         where pl.post_id = v.id and pl.user_id = current_uid
      ) as is_liked
    from visible v
  )
  select
    e.id,
    e.author_id,
    e.body,
    e.visibility,
    e.created_at,
    e.likes_count,
    e.comments_count,
    e.is_friend,
    e.is_viewed,
    e.is_liked,
    (
      ln(1 + e.likes_count + 2 * e.comments_count + 0.5)
      * exp(- extract(epoch from (now() - e.created_at)) / 3600.0 / 30.0)
      * (case when e.is_friend then 3.0 else 1.0 end)
      * (case when e.is_viewed then 0.25 else 1.0 end)
      * (case when e.author_id = current_uid then 0.6 else 1.0 end)
    )::double precision as score
  from enriched e
  order by score desc, e.created_at desc
  limit feed_limit;
end;
$$;

grant execute on function public.rank_feed_posts(integer) to authenticated;

-- 4. RPC pour enregistrer une vue (idempotent)
create or replace function public.record_post_view(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.post_views (post_id, viewer_id)
    values (target_post_id, auth.uid())
    on conflict (post_id, viewer_id) do update
      set viewed_at = excluded.viewed_at;
end;
$$;

grant execute on function public.record_post_view(uuid) to authenticated;
