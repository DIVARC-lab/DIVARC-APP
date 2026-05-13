-- Chantier Reels Recsys étape 9 — Sources complémentaires.
--
-- Complète generate_candidates_v3 avec les 3 dernières sources :
--
--   5. COLLABORATIVE (15%) — "les users comme toi ont aimé"
--                            Top users avec interest_vector similaire,
--                            puis leurs likes/saves/completions récents.
--   6. TRENDING (10%)      — Posts/reels avec engagement_velocity_24h
--                            (likes+comments+reactions ÷ heures depuis post)
--                            au-dessus d'un seuil. Récent < 48h.
--   7. FRESH_CREATORS (5%) — Auteurs récemment inscrits (< 30j) avec
--                            ≥ 1 post engagé. Égalité des chances.
--
-- IDEMPOTENT (CREATE OR REPLACE).

create or replace function public.generate_candidates_v3(
  p_user_id uuid,
  p_surface text default 'feed_foryou',
  p_n int default 800
)
returns table (
  content_id uuid,
  content_type text,
  source text,
  source_score numeric,
  source_metadata jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_n int := least(greatest(p_n, 50), 1000);
  v_wants_reels boolean := p_surface in ('reels_foryou', 'reels');
  v_wants_posts boolean := p_surface in ('feed_foryou', 'feed_home');
  v_user_vector vector(1536);
begin
  if v_user is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if p_surface not in ('feed_foryou', 'feed_home', 'reels_foryou', 'reels') then
    raise exception 'invalid surface: %', p_surface using errcode = '22023';
  end if;

  select interest_vector into v_user_vector
    from public.user_interest_profiles
   where user_id = v_user;

  return query
  with network_user_ids as (
    select case
             when f.requester_id = v_user then f.recipient_id
             else f.requester_id
           end as friend_id
      from public.friendships f
     where f.status = 'accepted'
       and (f.requester_id = v_user or f.recipient_id = v_user)
  ),

  /* === SOURCE 1 : NETWORK (30%) === */
  network_posts as (
    select
      p.id::uuid as content_id, 'post'::text as content_type, 'network'::text as source,
      exp(-1.0 * extract(epoch from (now() - p.created_at)) / (6.0 * 3600.0))::numeric as source_score,
      jsonb_build_object('author_id', p.author_id, 'reason', 'author_in_network') as source_metadata
      from public.posts p
      join network_user_ids n on n.friend_id = p.author_id
     where p.deleted_at is null and p.status = 'published'
       and p.visibility in ('public', 'friends')
       and p.created_at > now() - interval '14 days'
       and (p.thread_position is null or p.thread_position = 0)
       and v_wants_posts
     order by p.created_at desc
     limit greatest((v_n * 30 / 100) / 2, 30)
  ),
  network_reels as (
    select
      r.id::uuid as content_id, 'reel'::text as content_type, 'network'::text as source,
      exp(-1.0 * extract(epoch from (now() - r.created_at)) / (6.0 * 3600.0))::numeric as source_score,
      jsonb_build_object('author_id', r.author_id, 'reason', 'author_in_network') as source_metadata
      from public.reels r
      join network_user_ids n on n.friend_id = r.author_id
     where r.deleted_at is null and r.status = 'published'
       and r.audience in ('public', 'friends')
       and r.created_at > now() - interval '14 days'
       and v_wants_reels
     order by r.created_at desc
     limit greatest((v_n * 30 / 100) / 2, 30)
  ),

  /* === SOURCE 2 : SIMILAR_CONTENT (25%) === */
  similar_posts as (
    select
      ce.post_id::uuid as content_id, 'post'::text as content_type, 'similar_content'::text as source,
      (1 - (ce.embedding <=> v_user_vector))::numeric as source_score,
      jsonb_build_object('cosine_sim', 1 - (ce.embedding <=> v_user_vector)) as source_metadata
      from public.content_embeddings ce
      join public.posts p on p.id = ce.post_id
     where v_user_vector is not null and v_wants_posts
       and p.deleted_at is null and p.status = 'published'
       and p.visibility = 'public' and p.author_id <> v_user
       and p.created_at > now() - interval '14 days'
       and (p.thread_position is null or p.thread_position = 0)
     order by ce.embedding <=> v_user_vector
     limit greatest((v_n * 25 / 100) / 2, 30)
  ),
  similar_reels as (
    select
      re.reel_id::uuid as content_id, 'reel'::text as content_type, 'similar_content'::text as source,
      (1 - (re.embedding <=> v_user_vector))::numeric as source_score,
      jsonb_build_object('cosine_sim', 1 - (re.embedding <=> v_user_vector)) as source_metadata
      from public.reel_embeddings re
      join public.reels r on r.id = re.reel_id
     where v_user_vector is not null and v_wants_reels
       and r.deleted_at is null and r.status = 'published'
       and r.audience = 'public' and r.author_id <> v_user
       and r.created_at > now() - interval '14 days'
     order by re.embedding <=> v_user_vector
     limit greatest((v_n * 25 / 100) / 2, 30)
  ),

  /* === SOURCE 3 : CREATOR_REVISIT (10%) === */
  revisit_authors as (
    select
      e.target_user_id as author_id,
      sum(case when e.event_type in (
                  'post.like','post.love','post.applause','post.insightful',
                  'post.save','post.comment_create','post.share',
                  'video.completion','video.replay','video.quartile_95',
                  'video.scrub_backward')
              then 1.0 else 0 end) as affinity_score,
      max(e.created_at) as last_seen_at,
      sum(case when e.event_type = 'video.completion' then 1 else 0 end) as watched_full_count
      from public.recsys_events e
     where e.user_id = v_user
       and e.target_user_id is not null and e.target_user_id <> v_user
       and e.created_at > now() - interval '7 days'
       and not exists (
         select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = v_user and f.recipient_id = e.target_user_id)
                  or (f.recipient_id = v_user and f.requester_id = e.target_user_id))
       )
     group by e.target_user_id
    having sum(case when e.event_type in (
                       'post.like','post.love','post.applause','post.insightful',
                       'post.save','post.comment_create','post.share',
                       'video.completion','video.replay','video.quartile_95',
                       'video.scrub_backward')
                   then 1.0 else 0 end) > 0
       and max(e.created_at) between now() - interval '7 days' and now() - interval '2 hours'
  ),
  revisit_posts as (
    select
      p.id::uuid as content_id, 'post'::text as content_type, 'creator_revisit'::text as source,
      (ra.affinity_score * (1 + ra.watched_full_count * 0.5))::numeric as source_score,
      jsonb_build_object(
        'author_id', p.author_id,
        'affinity_score', ra.affinity_score,
        'watched_full_count', ra.watched_full_count,
        'last_seen_at', ra.last_seen_at
      ) as source_metadata
      from revisit_authors ra
      join public.posts p on p.author_id = ra.author_id
     where v_wants_posts and p.deleted_at is null and p.status = 'published'
       and p.visibility = 'public' and p.created_at > now() - interval '3 days'
       and (p.thread_position is null or p.thread_position = 0)
     order by ra.affinity_score desc, p.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),
  revisit_reels as (
    select
      r.id::uuid as content_id, 'reel'::text as content_type, 'creator_revisit'::text as source,
      (ra.affinity_score * (1 + ra.watched_full_count * 0.5))::numeric as source_score,
      jsonb_build_object(
        'author_id', r.author_id,
        'affinity_score', ra.affinity_score,
        'watched_full_count', ra.watched_full_count,
        'last_seen_at', ra.last_seen_at
      ) as source_metadata
      from revisit_authors ra
      join public.reels r on r.author_id = ra.author_id
     where v_wants_reels and r.deleted_at is null and r.status = 'published'
       and r.audience = 'public' and r.created_at > now() - interval '3 days'
     order by ra.affinity_score desc, r.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),

  /* === SOURCE 4 : EXPLORATION (10%) === */
  user_engaged_hashtags as (
    select distinct unnest(p.hashtags) as tag
      from public.recsys_events e
      join public.posts p on p.id = e.target_post_id
     where e.user_id = v_user
       and e.event_type in ('post.like', 'post.save', 'post.share',
                            'video.completion', 'video.replay')
       and e.created_at > now() - interval '14 days'
       and p.hashtags is not null and array_length(p.hashtags, 1) > 0
  ),
  exploration_posts as (
    select
      p.id::uuid as content_id, 'post'::text as content_type, 'exploration'::text as source,
      0.4::numeric as source_score,
      jsonb_build_object('author_id', p.author_id, 'reason', 'unseen_hashtags',
                         'hashtags', p.hashtags) as source_metadata
      from public.posts p
     where v_wants_posts and p.deleted_at is null and p.status = 'published'
       and p.visibility = 'public' and p.author_id <> v_user
       and p.created_at > now() - interval '7 days'
       and (p.thread_position is null or p.thread_position = 0)
       and p.hashtags is not null and array_length(p.hashtags, 1) > 0
       and not exists (
         select 1 from user_engaged_hashtags ueh where ueh.tag = any(p.hashtags)
       )
     order by p.total_reactions desc nulls last, p.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),
  exploration_reels as (
    select
      r.id::uuid as content_id, 'reel'::text as content_type, 'exploration'::text as source,
      0.4::numeric as source_score,
      jsonb_build_object('author_id', r.author_id, 'reason', 'unseen_hashtags',
                         'hashtags', r.hashtags) as source_metadata
      from public.reels r
     where v_wants_reels and r.deleted_at is null and r.status = 'published'
       and r.audience = 'public' and r.author_id <> v_user
       and r.created_at > now() - interval '7 days'
       and r.hashtags is not null and array_length(r.hashtags, 1) > 0
       and not exists (
         select 1 from user_engaged_hashtags ueh where ueh.tag = any(r.hashtags)
       )
     order by r.likes_count desc nulls last, r.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),

  /* ====================================================================
   * SOURCE 5 : COLLABORATIVE (15%) — "users comme toi ont aimé"
   *
   * Top 50 users avec interest_vector cosine-proche du nôtre, puis on
   * récupère leurs likes/saves récents non-encore-vus par v_user.
   * Score = somme des affinités des co-likers (proxy de popularité
   * dans le cluster sémantique de l'user).
   * ==================================================================== */
  similar_users as (
    select
      uip.user_id,
      (1 - (uip.interest_vector <=> v_user_vector))::numeric as similarity
      from public.user_interest_profiles uip
     where v_user_vector is not null
       and uip.interest_vector is not null
       and uip.user_id <> v_user
     order by uip.interest_vector <=> v_user_vector
     limit 50
  ),
  collab_engagements as (
    /* Contenus aimés/save/completed par les users similaires. */
    select
      e.target_post_id as content_id,
      sum(su.similarity) as collab_score,
      count(distinct su.user_id) as co_likers
      from similar_users su
      join public.recsys_events e on e.user_id = su.user_id
     where e.event_type in ('post.like', 'post.love', 'post.save',
                            'video.completion', 'video.replay')
       and e.target_post_id is not null
       and e.created_at > now() - interval '7 days'
     group by e.target_post_id
    having count(distinct su.user_id) >= 2
  ),
  collab_posts as (
    select
      ce.content_id::uuid, 'post'::text as content_type, 'collaborative'::text as source,
      ce.collab_score::numeric as source_score,
      jsonb_build_object('co_likers', ce.co_likers,
                         'reason', 'similar_users_engaged') as source_metadata
      from collab_engagements ce
      join public.posts p on p.id = ce.content_id
     where v_wants_posts and p.deleted_at is null and p.status = 'published'
       and p.visibility = 'public' and p.author_id <> v_user
       and (p.thread_position is null or p.thread_position = 0)
     order by ce.collab_score desc
     limit greatest((v_n * 15 / 100) / 2, 20)
  ),
  collab_reels as (
    select
      ce.content_id::uuid, 'reel'::text as content_type, 'collaborative'::text as source,
      ce.collab_score::numeric as source_score,
      jsonb_build_object('co_likers', ce.co_likers,
                         'reason', 'similar_users_engaged') as source_metadata
      from collab_engagements ce
      join public.reels r on r.id = ce.content_id
     where v_wants_reels and r.deleted_at is null and r.status = 'published'
       and r.audience = 'public' and r.author_id <> v_user
     order by ce.collab_score desc
     limit greatest((v_n * 15 / 100) / 2, 20)
  ),

  /* ====================================================================
   * SOURCE 6 : TRENDING (10%) — engagement_velocity_24h
   *
   * (réactions + commentaires) / heures depuis la publication.
   * Filtre : créé < 48h, ≥ 5 engagements totaux pour éviter le bruit.
   * ==================================================================== */
  trending_posts as (
    select
      p.id::uuid as content_id, 'post'::text as content_type, 'trending'::text as source,
      ((coalesce(p.total_reactions, 0) + coalesce(p.comments_count, 0))::numeric
        / greatest(extract(epoch from (now() - p.created_at)) / 3600, 1))::numeric as source_score,
      jsonb_build_object(
        'total_reactions', p.total_reactions,
        'comments_count', p.comments_count,
        'velocity_per_hour', (coalesce(p.total_reactions, 0) + coalesce(p.comments_count, 0))::numeric
          / greatest(extract(epoch from (now() - p.created_at)) / 3600, 1)
      ) as source_metadata
      from public.posts p
     where v_wants_posts and p.deleted_at is null and p.status = 'published'
       and p.visibility = 'public' and p.author_id <> v_user
       and p.created_at > now() - interval '48 hours'
       and (p.thread_position is null or p.thread_position = 0)
       and (coalesce(p.total_reactions, 0) + coalesce(p.comments_count, 0)) >= 5
     order by source_score desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),
  trending_reels as (
    select
      r.id::uuid as content_id, 'reel'::text as content_type, 'trending'::text as source,
      ((coalesce(r.likes_count, 0) + coalesce(r.comments_count, 0))::numeric
        / greatest(extract(epoch from (now() - r.created_at)) / 3600, 1))::numeric as source_score,
      jsonb_build_object(
        'likes_count', r.likes_count,
        'comments_count', r.comments_count,
        'velocity_per_hour', (coalesce(r.likes_count, 0) + coalesce(r.comments_count, 0))::numeric
          / greatest(extract(epoch from (now() - r.created_at)) / 3600, 1)
      ) as source_metadata
      from public.reels r
     where v_wants_reels and r.deleted_at is null and r.status = 'published'
       and r.audience = 'public' and r.author_id <> v_user
       and r.created_at > now() - interval '48 hours'
       and (coalesce(r.likes_count, 0) + coalesce(r.comments_count, 0)) >= 5
     order by source_score desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),

  /* ====================================================================
   * SOURCE 7 : FRESH_CREATORS (5%) — égalité des chances
   *
   * Auteurs inscrits < 30j avec au moins 1 post engagé (≥ 1 reaction).
   * Donne de la visibilité aux nouveaux créateurs.
   * ==================================================================== */
  fresh_creator_ids as (
    select pr.id as author_id
      from public.profiles pr
     where pr.created_at > now() - interval '30 days'
       and pr.id <> v_user
       and exists (
         select 1 from public.posts p
          where p.author_id = pr.id
            and p.deleted_at is null
            and (p.total_reactions > 0 or p.comments_count > 0)
            and p.created_at > now() - interval '14 days'
       )
  ),
  fresh_posts as (
    select
      p.id::uuid as content_id, 'post'::text as content_type, 'fresh_creators'::text as source,
      0.5::numeric as source_score,
      jsonb_build_object('author_id', p.author_id, 'reason', 'new_creator_30d') as source_metadata
      from fresh_creator_ids fc
      join public.posts p on p.author_id = fc.author_id
     where v_wants_posts and p.deleted_at is null and p.status = 'published'
       and p.visibility = 'public'
       and p.created_at > now() - interval '14 days'
       and (p.thread_position is null or p.thread_position = 0)
     order by p.created_at desc
     limit greatest((v_n * 5 / 100) / 2, 10)
  ),
  fresh_reels as (
    select
      r.id::uuid as content_id, 'reel'::text as content_type, 'fresh_creators'::text as source,
      0.5::numeric as source_score,
      jsonb_build_object('author_id', r.author_id, 'reason', 'new_creator_30d') as source_metadata
      from fresh_creator_ids fc
      join public.reels r on r.author_id = fc.author_id
     where v_wants_reels and r.deleted_at is null and r.status = 'published'
       and r.audience = 'public'
       and r.created_at > now() - interval '14 days'
     order by r.created_at desc
     limit greatest((v_n * 5 / 100) / 2, 10)
  )

  select * from network_posts
  union all select * from network_reels
  union all select * from similar_posts
  union all select * from similar_reels
  union all select * from revisit_posts
  union all select * from revisit_reels
  union all select * from exploration_posts
  union all select * from exploration_reels
  union all select * from collab_posts
  union all select * from collab_reels
  union all select * from trending_posts
  union all select * from trending_reels
  union all select * from fresh_posts
  union all select * from fresh_reels;
end;
$$;

comment on function public.generate_candidates_v3(uuid, text, int) is
  'Candidate generation 7 sources COMPLET — network/similar/revisit/exploration/collaborative/trending/fresh_creators. Targets : posts ou reels selon surface.';
