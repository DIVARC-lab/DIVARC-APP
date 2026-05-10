-- =====================================================
-- DIVARC — Analyse résultats A/B test
--
-- À exécuter dans le SQL Editor Supabase pour mesurer le lift d'une
-- expérience. Pas une migration : ne change pas le schéma, ne se
-- joue pas automatiquement. Copie-colle, ajuste l'experiment_id et
-- la fenêtre temporelle.
--
-- Mécanique : on retrouve l'assignment de chaque user via les events
-- "experiment.exposure" puis on calcule des KPI par variant sur la
-- même fenêtre. Pour des analyses plus poussées, exporter en CSV
-- vers un notebook (sklearn, R, etc.).
-- =====================================================

-- 1. Distribution des variants : combien de users dans chaque bucket ?
--    Sanity check du split 50/50.
with assignments as (
  select distinct on (user_id)
    user_id,
    properties ->> 'variant' as variant,
    created_at as exposure_at
  from public.recsys_events
  where event_type = 'experiment.exposure'
    and properties ->> 'experiment_id' = 'feed-ranking-v2026'
    and created_at >= now() - interval '30 days'
  order by user_id, created_at asc
)
select
  variant,
  count(*) as users,
  round(100.0 * count(*) / sum(count(*)) over (), 2) as pct
from assignments
group by variant
order by users desc;


-- 2. Engagement par variant — likes / comments / shares moyens par
--    user dans les 7 jours suivant l'exposition.
with assignments as (
  select distinct on (user_id)
    user_id,
    properties ->> 'variant' as variant,
    created_at as exposure_at
  from public.recsys_events
  where event_type = 'experiment.exposure'
    and properties ->> 'experiment_id' = 'feed-ranking-v2026'
    and created_at >= now() - interval '30 days'
  order by user_id, created_at asc
),
post_engagements as (
  select
    a.variant,
    a.user_id,
    count(*) filter (where e.event_type = 'post.like') as likes,
    count(*) filter (where e.event_type = 'post.comment') as comments,
    count(*) filter (where e.event_type = 'post.share') as shares,
    count(*) filter (where e.event_type = 'post.save') as saves,
    count(*) filter (where e.event_type = 'post.impression') as impressions,
    count(*) filter (where e.event_type = 'post.dwell') as dwells
  from assignments a
  left join public.recsys_events e
    on e.user_id = a.user_id
   and e.created_at between a.exposure_at and a.exposure_at + interval '7 days'
   and e.event_type in (
     'post.like', 'post.comment', 'post.share',
     'post.save', 'post.impression', 'post.dwell'
   )
  group by a.variant, a.user_id
)
select
  variant,
  count(*) as users,
  round(avg(impressions)::numeric, 2) as impressions_per_user,
  round(avg(likes)::numeric, 2) as likes_per_user,
  round(avg(comments)::numeric, 2) as comments_per_user,
  round(avg(shares)::numeric, 2) as shares_per_user,
  round(avg(saves)::numeric, 2) as saves_per_user,
  round(avg(dwells)::numeric, 2) as dwells_per_user,
  round(avg(likes + comments + shares + saves)::numeric, 2)
    as engagement_per_user
from post_engagements
group by variant
order by variant;


-- 3. Taux de rétention J+7 par variant — % d'users exposés qui sont
--    revenus au moins une fois entre J+1 et J+7.
with assignments as (
  select distinct on (user_id)
    user_id,
    properties ->> 'variant' as variant,
    created_at as exposure_at
  from public.recsys_events
  where event_type = 'experiment.exposure'
    and properties ->> 'experiment_id' = 'feed-ranking-v2026'
    and created_at >= now() - interval '30 days'
  order by user_id, created_at asc
),
returns as (
  select
    a.user_id,
    a.variant,
    exists (
      select 1
      from public.recsys_events e
      where e.user_id = a.user_id
        and e.created_at > a.exposure_at + interval '1 day'
        and e.created_at < a.exposure_at + interval '7 days'
    ) as returned
  from assignments a
)
select
  variant,
  count(*) as users,
  count(*) filter (where returned) as returned_users,
  round(100.0 * count(*) filter (where returned) / count(*), 2)
    as retention_d7_pct
from returns
group by variant
order by variant;


-- 4. Significativité statistique (test Z deux proportions, retention).
--    Donne une indication grossière — pour un test rigoureux, exporter
--    et utiliser scipy.stats.proportions_ztest ou equivalent.
--    z > 1.96 (ou < -1.96) = significatif au seuil 5%.
-- À enrichir manuellement après avoir lu les chiffres ci-dessus.
