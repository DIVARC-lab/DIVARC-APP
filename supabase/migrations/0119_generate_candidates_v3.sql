-- Chantier Reels Recsys étape 7 — RPC generate_candidates_v3 (squelette).
--
-- Génère 500-800 candidats pour le ranker en mixant 7 sources documentées :
--   1. NETWORK (30%)              — abonnements + amis + cercles
--   2. SIMILAR_CONTENT (25%)      — cosine similarity vs interest_vector
--   3. CREATOR_REVISIT (10%)      — créateurs vus mais non suivis (secret TikTok)
--   4. EXPLORATION (10%)          — hors-bulle, topics non vus
--   5. COLLABORATIVE (15%)        — contenus aimés par users similaires
--   6. TRENDING (10%)             — viral récent dans topics affinitaires
--   7. FRESH_CREATORS (5%)        — nouveaux créateurs (égalité chances)
--
-- Le squelette de cette migration définit :
--   - signature stable (content_id, content_type, source, source_score, source_metadata)
--   - validation des paramètres (surface ∈ enum, p_n entre 50 et 1000)
--   - dispatch par surface (reels_foryou → reels uniquement, feed_foryou → posts)
--   - une seule source implémentée : NETWORK (sera complétée étape 8 + 9)
--
-- Les autres sources arrivent dans les étapes 8 (critiques) et 9 (complémentaires)
-- via CREATE OR REPLACE FUNCTION — IDEMPOTENT.

create or replace function public.generate_candidates_v3(
  p_user_id uuid,
  p_surface text default 'feed_foryou',
  p_n int default 800
)
returns table (
  content_id uuid,
  content_type text,   -- 'post' | 'reel'
  source text,         -- 'network' | 'similar_content' | 'creator_revisit' | 'exploration' | 'collaborative' | 'trending' | 'fresh_creators'
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
begin
  if v_user is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_surface not in ('feed_foryou', 'feed_home', 'reels_foryou', 'reels') then
    raise exception 'invalid surface: %', p_surface using errcode = '22023';
  end if;

  /* === SOURCE 1 : NETWORK (30%) =====================================
   * Posts/reels des comptes que l'user suit (friendships acceptées) +
   * cercles auxquels il appartient. Tri par recency.
   *
   * Score : recency normalisé (1.0 si <6h, decay exp). Pas de boost
   * via friend strength en V1 — le ranker le calculera ensuite. */
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
     limit greatest(v_n / 5, 60)
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
     limit greatest(v_n / 5, 60)
  )
  select * from network_posts
   union all
  select * from network_reels;

  /* Sources 2-7 ajoutées dans les étapes 8 et 9 via CREATE OR REPLACE. */
end;
$$;

grant execute on function public.generate_candidates_v3(uuid, text, int) to authenticated;

comment on function public.generate_candidates_v3(uuid, text, int) is
  'Candidate generation multi-source pour le For You Page (Chantier Reels Recsys 7-9). Surfaces : feed_foryou, reels_foryou. Sources : network, similar_content, creator_revisit, exploration, collaborative, trending, fresh_creators.';
