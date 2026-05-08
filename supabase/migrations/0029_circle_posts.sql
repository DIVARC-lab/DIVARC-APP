-- =====================================================
-- DIVARC — Migration 0029 : Posts dans les Cercles
--   - Colonne circle_id sur posts : un post peut être posté
--     dans un cercle, ou en dehors (NULL = post normal).
--   - RLS étendue : les posts de cercle sont visibles
--     uniquement aux membres + l'auteur.
--   - Le feed général (visibility filter) ne montre PAS les
--     posts de cercle (ils restent dans /circles/[slug]).
-- =====================================================

-- 1. Ajout de la colonne
alter table public.posts
  add column if not exists circle_id uuid
    references public.circles(id) on delete cascade;

create index if not exists posts_circle_id_created_at_idx
  on public.posts (circle_id, created_at desc)
  where circle_id is not null and deleted_at is null;

-- 2. Politique de visibilité étendue
--    Un post avec circle_id est visible :
--    - à son auteur (toujours)
--    - aux membres du cercle (si membre)
--    Un post sans circle_id garde la visibilité héritée
--    de visibility (public/friends/private).
drop policy if exists "posts visible per visibility rules" on public.posts;
create policy "posts visible per visibility rules"
  on public.posts for select
  using (
    deleted_at is null and (
      author_id = auth.uid()
      or (
        circle_id is null and (
          visibility = 'public'
          or (visibility = 'friends' and public.are_friends(author_id, auth.uid()))
        )
      )
      or (
        circle_id is not null
        and public.is_circle_member(circle_id, auth.uid())
      )
    )
  );

-- 3. Politique d'insertion : si circle_id, l'auteur doit être membre
drop policy if exists "owner can insert post" on public.posts;
create policy "owner can insert post"
  on public.posts for insert
  with check (
    author_id = auth.uid()
    and (
      circle_id is null
      or public.is_circle_member(circle_id, auth.uid())
    )
  );

-- 4. Mise à jour de rank_feed_posts (algo for-you) pour exclure
--    les posts de cercle. Ils n'apparaissent que dans /circles/[slug].
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
       and p.circle_id is null
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
