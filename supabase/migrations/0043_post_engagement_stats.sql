-- =====================================================
-- DIVARC — Migration 0043 : Vue matérialisée post_engagement_stats
--
-- Pré-calcule les agrégats d'engagement par post (likes_count,
-- comments_count, shares_count, hourly_velocity) pour permettre au
-- ranker /api/feed/personalized de scorer rapidement sans N+1.
--
-- Refresh : toutes les 5 min via cron Supabase pg_cron OU au déclenchement
-- d'une action explicite. CONCURRENTLY pour ne pas bloquer les lecteurs.
--
-- Hourly velocity = engagement_score / age_hours, normalisée pour le
-- ranking (cap 1.0 à 50 likes/h).
-- =====================================================

create materialized view if not exists public.post_engagement_stats as
select
  p.id as post_id,
  p.author_id,
  p.created_at,
  /* Counts agrégés. Les triggers Postgres existants maintiennent les
     tables likes/comments/shares cohérentes. */
  coalesce(l.likes_count, 0) as likes_count,
  coalesce(c.comments_count, 0) as comments_count,
  coalesce(s.shares_count, 0) as shares_count,
  coalesce(l.likes_count, 0)
    + 2 * coalesce(c.comments_count, 0)
    + 3 * coalesce(s.shares_count, 0) as engagement_score,
  /* Age en heures (clamp à 1h min pour éviter division par 0). */
  greatest(
    1.0,
    extract(epoch from (now() - p.created_at)) / 3600.0
  ) as age_hours,
  /* Velocity : engagement_score / heure depuis publication. */
  (
    coalesce(l.likes_count, 0)
    + 2 * coalesce(c.comments_count, 0)
    + 3 * coalesce(s.shares_count, 0)
  ) / greatest(
    1.0,
    extract(epoch from (now() - p.created_at)) / 3600.0
  ) as hourly_velocity
from public.posts p
left join lateral (
  select count(*)::int as likes_count
  from public.post_likes
  where post_id = p.id
) l on true
left join lateral (
  select count(*)::int as comments_count
  from public.post_comments
  where post_id = p.id and deleted_at is null
) c on true
left join lateral (
  select 0::int as shares_count
  /* Pas de table post_shares en V1 — retourne 0. À ajouter quand le
     feature partage sera en DB. */
) s on true
where p.deleted_at is null
  and p.created_at >= (now() - interval '30 days');

-- Index pour le scoring / lookup rapide
create unique index if not exists post_engagement_stats_post_id_idx
  on public.post_engagement_stats (post_id);

create index if not exists post_engagement_stats_velocity_idx
  on public.post_engagement_stats (hourly_velocity desc);

create index if not exists post_engagement_stats_author_idx
  on public.post_engagement_stats (author_id);

comment on materialized view public.post_engagement_stats is
  'Stats engagement pré-calculées pour le ranking. Refresh par cron 5 min ou trigger.';

-- =====================================================
-- RPC : refresh_post_engagement_stats
--   Refresh CONCURRENTLY (ne bloque pas les lecteurs). À appeler
--   par cron ou par trigger sur posts/likes/comments.
-- =====================================================
create or replace function public.refresh_post_engagement_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.post_engagement_stats;
end;
$$;

revoke all on function public.refresh_post_engagement_stats() from public;
grant execute on function public.refresh_post_engagement_stats() to authenticated;
