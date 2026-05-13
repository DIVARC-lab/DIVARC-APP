-- Chantier Reels Recsys étape 8 — Sources critiques de generate_candidates_v3.
--
-- Ajoute 3 sources à la RPC v3 (network reste depuis étape 7) :
--
--   2. SIMILAR_CONTENT (25%)  — cosine similarity vs interest_vector
--                                via pgvector (HNSW). Filtre fraîcheur 14j.
--   3. CREATOR_REVISIT (10%)  — LE secret TikTok : reproposer créateurs
--                                vus mais NON SUIVIS. Source = aggregation
--                                des target_user_id dans recsys_events
--                                avec poids positifs cumulés.
--   4. EXPLORATION (10%)      — contenus hors-bulle : score statique
--                                neutre, sélection pseudo-aléatoire dans
--                                topics que l'user n'a pas dans son profil.
--
-- Sources 5-7 (collab_filtering, trending, fresh_creators) arrivent étape 9.
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

  /* Récupère le vecteur user pour SIMILAR_CONTENT. NULL = on skip. */
  select interest_vector into v_user_vector
    from public.user_interest_profiles
   where user_id = v_user;

  return query
  /* ====================================================================
   * SOURCE 1 : NETWORK (30%)
   * ==================================================================== */
  with network_user_ids as (
    select case
             when f.requester_id = v_user then f.recipient_id
             else f.requester_id
           end as friend_id
      from public.friendships f
     where f.status = 'accepted'
       and (f.requester_id = v_user or f.recipient_id = v_user)
  ),
  network_posts as (
    select
      p.id::uuid as content_id,
      'post'::text as content_type,
      'network'::text as source,
      exp(-1.0 * extract(epoch from (now() - p.created_at)) / (6.0 * 3600.0))::numeric as source_score,
      jsonb_build_object(
        'author_id', p.author_id,
        'reason', 'author_in_network',
        'age_hours', extract(epoch from (now() - p.created_at)) / 3600
      ) as source_metadata
      from public.posts p
      join network_user_ids n on n.friend_id = p.author_id
     where p.deleted_at is null
       and p.status = 'published'
       and p.visibility in ('public', 'friends')
       and p.created_at > now() - interval '14 days'
       and (p.thread_position is null or p.thread_position = 0)
       and v_wants_posts
     order by p.created_at desc
     limit greatest((v_n * 30 / 100) / 2, 30)
  ),
  network_reels as (
    select
      r.id::uuid as content_id,
      'reel'::text as content_type,
      'network'::text as source,
      exp(-1.0 * extract(epoch from (now() - r.created_at)) / (6.0 * 3600.0))::numeric as source_score,
      jsonb_build_object(
        'author_id', r.author_id,
        'reason', 'author_in_network',
        'age_hours', extract(epoch from (now() - r.created_at)) / 3600
      ) as source_metadata
      from public.reels r
      join network_user_ids n on n.friend_id = r.author_id
     where r.deleted_at is null
       and r.status = 'published'
       and r.audience in ('public', 'friends')
       and r.created_at > now() - interval '14 days'
       and v_wants_reels
     order by r.created_at desc
     limit greatest((v_n * 30 / 100) / 2, 30)
  ),

  /* ====================================================================
   * SOURCE 2 : SIMILAR_CONTENT (25%) — cosine via pgvector
   * ==================================================================== */
  similar_posts as (
    select
      ce.post_id::uuid as content_id,
      'post'::text as content_type,
      'similar_content'::text as source,
      (1 - (ce.embedding <=> v_user_vector))::numeric as source_score,
      jsonb_build_object('cosine_sim', 1 - (ce.embedding <=> v_user_vector)) as source_metadata
      from public.content_embeddings ce
      join public.posts p on p.id = ce.post_id
     where v_user_vector is not null
       and v_wants_posts
       and p.deleted_at is null
       and p.status = 'published'
       and p.visibility = 'public'
       and p.author_id <> v_user
       and p.created_at > now() - interval '14 days'
       and (p.thread_position is null or p.thread_position = 0)
     order by ce.embedding <=> v_user_vector
     limit greatest((v_n * 25 / 100) / 2, 30)
  ),
  similar_reels as (
    select
      re.reel_id::uuid as content_id,
      'reel'::text as content_type,
      'similar_content'::text as source,
      (1 - (re.embedding <=> v_user_vector))::numeric as source_score,
      jsonb_build_object('cosine_sim', 1 - (re.embedding <=> v_user_vector)) as source_metadata
      from public.reel_embeddings re
      join public.reels r on r.id = re.reel_id
     where v_user_vector is not null
       and v_wants_reels
       and r.deleted_at is null
       and r.status = 'published'
       and r.audience = 'public'
       and r.author_id <> v_user
       and r.created_at > now() - interval '14 days'
     order by re.embedding <=> v_user_vector
     limit greatest((v_n * 25 / 100) / 2, 30)
  ),

  /* ====================================================================
   * SOURCE 3 : CREATOR_REVISIT (10%) — LE secret TikTok
   *
   * Créateurs avec score positif cumulé dans recsys_events sur 7j,
   * NON SUIVIS, vus pour la dernière fois entre 2h et 7j (pas trop
   * récent pour ne pas spammer, pas trop vieux pour rester pertinent).
   * On récupère leur contenu publié < 3j.
   * ==================================================================== */
  revisit_authors as (
    select
      e.target_user_id as author_id,
      sum(case
            when e.event_type in ('post.like', 'post.love', 'post.applause', 'post.insightful',
                                  'post.save', 'post.comment_create', 'post.share',
                                  'video.completion', 'video.replay', 'video.quartile_95',
                                  'video.scrub_backward')
              then 1.0
            else 0
          end) as affinity_score,
      max(e.created_at) as last_seen_at,
      sum(case when e.event_type = 'video.completion' then 1 else 0 end) as watched_full_count
      from public.recsys_events e
     where e.user_id = v_user
       and e.target_user_id is not null
       and e.target_user_id <> v_user
       and e.created_at > now() - interval '7 days'
       and not exists (
         select 1 from public.friendships f
          where f.status = 'accepted'
            and (
              (f.requester_id = v_user and f.recipient_id = e.target_user_id)
              or (f.recipient_id = v_user and f.requester_id = e.target_user_id)
            )
       )
     group by e.target_user_id
    having sum(case
                 when e.event_type in ('post.like', 'post.love', 'post.applause', 'post.insightful',
                                       'post.save', 'post.comment_create', 'post.share',
                                       'video.completion', 'video.replay', 'video.quartile_95',
                                       'video.scrub_backward')
                   then 1.0
                 else 0
               end) > 0
       and max(e.created_at) between now() - interval '7 days' and now() - interval '2 hours'
  ),
  revisit_posts as (
    select
      p.id::uuid as content_id,
      'post'::text as content_type,
      'creator_revisit'::text as source,
      (ra.affinity_score * (1 + ra.watched_full_count * 0.5))::numeric as source_score,
      jsonb_build_object(
        'author_id', p.author_id,
        'affinity_score', ra.affinity_score,
        'watched_full_count', ra.watched_full_count,
        'last_seen_at', ra.last_seen_at
      ) as source_metadata
      from revisit_authors ra
      join public.posts p on p.author_id = ra.author_id
     where v_wants_posts
       and p.deleted_at is null
       and p.status = 'published'
       and p.visibility = 'public'
       and p.created_at > now() - interval '3 days'
       and (p.thread_position is null or p.thread_position = 0)
     order by ra.affinity_score desc, p.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),
  revisit_reels as (
    select
      r.id::uuid as content_id,
      'reel'::text as content_type,
      'creator_revisit'::text as source,
      (ra.affinity_score * (1 + ra.watched_full_count * 0.5))::numeric as source_score,
      jsonb_build_object(
        'author_id', r.author_id,
        'affinity_score', ra.affinity_score,
        'watched_full_count', ra.watched_full_count,
        'last_seen_at', ra.last_seen_at
      ) as source_metadata
      from revisit_authors ra
      join public.reels r on r.author_id = ra.author_id
     where v_wants_reels
       and r.deleted_at is null
       and r.status = 'published'
       and r.audience = 'public'
       and r.created_at > now() - interval '3 days'
     order by ra.affinity_score desc, r.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),

  /* ====================================================================
   * SOURCE 4 : EXPLORATION (10%) — hors-bulle
   *
   * Posts/reels avec hashtags QUE L'USER N'A JAMAIS engagés. Score
   * statique 0.4 (neutre) — le ranker décidera. Sélection : top posts
   * récents de hashtags peu vus, pour donner une chance à la sérendipité.
   * ==================================================================== */
  user_engaged_hashtags as (
    /* Hashtags présents dans les contenus engagés positivement par l'user. */
    select distinct unnest(p.hashtags) as tag
      from public.recsys_events e
      join public.posts p on p.id = e.target_post_id
     where e.user_id = v_user
       and e.event_type in ('post.like', 'post.save', 'post.share',
                            'video.completion', 'video.replay')
       and e.created_at > now() - interval '14 days'
       and p.hashtags is not null
       and array_length(p.hashtags, 1) > 0
  ),
  exploration_posts as (
    select
      p.id::uuid as content_id,
      'post'::text as content_type,
      'exploration'::text as source,
      0.4::numeric as source_score,
      jsonb_build_object(
        'author_id', p.author_id,
        'reason', 'unseen_hashtags',
        'hashtags', p.hashtags
      ) as source_metadata
      from public.posts p
     where v_wants_posts
       and p.deleted_at is null
       and p.status = 'published'
       and p.visibility = 'public'
       and p.author_id <> v_user
       and p.created_at > now() - interval '7 days'
       and (p.thread_position is null or p.thread_position = 0)
       and p.hashtags is not null
       and array_length(p.hashtags, 1) > 0
       and not exists (
         select 1 from user_engaged_hashtags ueh
          where ueh.tag = any(p.hashtags)
       )
     order by p.total_reactions desc nulls last, p.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  ),
  exploration_reels as (
    select
      r.id::uuid as content_id,
      'reel'::text as content_type,
      'exploration'::text as source,
      0.4::numeric as source_score,
      jsonb_build_object(
        'author_id', r.author_id,
        'reason', 'unseen_hashtags',
        'hashtags', r.hashtags
      ) as source_metadata
      from public.reels r
     where v_wants_reels
       and r.deleted_at is null
       and r.status = 'published'
       and r.audience = 'public'
       and r.author_id <> v_user
       and r.created_at > now() - interval '7 days'
       and r.hashtags is not null
       and array_length(r.hashtags, 1) > 0
       and not exists (
         select 1 from user_engaged_hashtags ueh
          where ueh.tag = any(r.hashtags)
       )
     order by r.likes_count desc nulls last, r.created_at desc
     limit greatest((v_n * 10 / 100) / 2, 15)
  )

  select * from network_posts
  union all select * from network_reels
  union all select * from similar_posts
  union all select * from similar_reels
  union all select * from revisit_posts
  union all select * from revisit_reels
  union all select * from exploration_posts
  union all select * from exploration_reels;

  /* Sources 5-7 (collaborative, trending, fresh_creators) arrivent étape 9. */
end;
$$;

comment on function public.generate_candidates_v3(uuid, text, int) is
  'Candidate generation multi-source — 4 sources critiques (network, similar_content, creator_revisit, exploration). 3 sources complémentaires étape 9.';
