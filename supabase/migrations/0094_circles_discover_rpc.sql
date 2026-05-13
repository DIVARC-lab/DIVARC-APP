-- Chantier 2.4 — Sort engine transparent pour la discovery des cercles.
--
-- RPC `discover_circles_v2` qui calcule un score d'activité EXPLICABLE
-- (formule pondérée fixe, aucun ML) et retourne le breakdown jsonb pour
-- transparence côté UI ("Comment ce cercle est-il classé ?").
--
-- Formule (poids = 100%) :
--   posts 7j         × 0.40  (cap 50)   → 40 pts max
--   engagement 7j    × 0.30  (cap 200)  → 30 pts max
--   nouveaux membres × 0.15  (cap 20)   → 15 pts max
--   diversité posteurs × 0.15 (cap 30)  → 15 pts max
--   ────────────────────────────────────────────
--   Total : 0-100 pts
--
-- Engagement = somme upvotes + helpful_marks sur posts 7j (approximation V1,
-- engagement_rate dénormalisé au Chantier 5.5 prendra le relais).
--
-- IDEMPOTENT.

create or replace function public.discover_circles_v2(
  p_category text default null,
  p_query text default null,
  p_country text default null,
  p_sort text default 'active',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  score real,
  breakdown jsonb
)
language plpgsql
stable
parallel safe
as $$
declare
  v_cap_posts constant numeric := 50;
  v_cap_engagement constant numeric := 200;
  v_cap_new constant numeric := 20;
  v_cap_diversity constant numeric := 30;
  v_w_posts constant numeric := 0.40;
  v_w_engagement constant numeric := 0.30;
  v_w_new constant numeric := 0.15;
  v_w_diversity constant numeric := 0.15;
  v_q text := nullif(trim(coalesce(p_query, '')), '');
begin
  return query
  with base as (
    select c.id, c.created_at, c.members_count, c.vitality_score
      from public.circles c
     where c.archived_at is null
       and (
         c.visibility = 'public' or c.is_private = false
       )
       and (p_category is null or c.primary_category = p_category)
       and (
         v_q is null
         or c.name ilike '%' || v_q || '%'
         or c.description ilike '%' || v_q || '%'
         or c.tagline ilike '%' || v_q || '%'
       )
       and (
         p_sort <> 'nearby' or (
           c.is_local = true
           and (p_country is null or c.location_country = p_country)
         )
       )
  ),
  /* Composantes calculées en live sur les 7 derniers jours.
   * Coûteux mais OK pour <200 cercles publics au lancement. À optimiser
   * en branchant sur les counters dénormalisés (cron Chantier 5.5). */
  stats as (
    select b.id,
           coalesce((
             select count(*)::numeric
               from public.posts p
              where p.circle_id = b.id
                and p.deleted_at is null
                and p.created_at > now() - interval '7 days'
           ), 0) as posts_7d,
           coalesce((
             select count(distinct p.author_id)::numeric
               from public.posts p
              where p.circle_id = b.id
                and p.deleted_at is null
                and p.created_at > now() - interval '7 days'
           ), 0) as unique_posters_7d,
           coalesce((
             select sum(p.upvotes + p.helpful_marks)::numeric
               from public.posts p
              where p.circle_id = b.id
                and p.deleted_at is null
                and p.created_at > now() - interval '7 days'
           ), 0) as engagement_7d,
           coalesce((
             select count(*)::numeric
               from public.circle_members m
              where m.circle_id = b.id
                and m.status = 'active'
                and m.joined_at > now() - interval '7 days'
           ), 0) as new_members_7d,
           b.members_count::numeric as members_count,
           b.created_at,
           b.vitality_score
      from base b
  ),
  ranked as (
    select s.id,
           s.posts_7d,
           s.engagement_7d,
           s.new_members_7d,
           s.unique_posters_7d,
           s.members_count,
           s.created_at,
           s.vitality_score,
           least(s.posts_7d / v_cap_posts, 1.0) * v_w_posts as p_posts,
           least(s.engagement_7d / v_cap_engagement, 1.0) * v_w_engagement as p_eng,
           least(s.new_members_7d / v_cap_new, 1.0) * v_w_new as p_new,
           least(s.unique_posters_7d / v_cap_diversity, 1.0) * v_w_diversity as p_div
      from stats s
  )
  select r.id,
         ((r.p_posts + r.p_eng + r.p_new + r.p_div) * 100)::real as score,
         jsonb_build_object(
           'sort', p_sort,
           'posts_7d', r.posts_7d::int,
           'engagement_7d', r.engagement_7d::int,
           'new_members_7d', r.new_members_7d::int,
           'unique_posters_7d', r.unique_posters_7d::int,
           'members_count', r.members_count::int,
           'pts_posts', round((r.p_posts * 100)::numeric, 1),
           'pts_engagement', round((r.p_eng * 100)::numeric, 1),
           'pts_new_members', round((r.p_new * 100)::numeric, 1),
           'pts_diversity', round((r.p_div * 100)::numeric, 1),
           'weights', jsonb_build_object(
             'posts', v_w_posts,
             'engagement', v_w_engagement,
             'new_members', v_w_new,
             'diversity', v_w_diversity
           ),
           'caps', jsonb_build_object(
             'posts', v_cap_posts,
             'engagement', v_cap_engagement,
             'new_members', v_cap_new,
             'diversity', v_cap_diversity
           )
         ) as breakdown
    from ranked r
   order by
     case when p_sort = 'recent' then extract(epoch from r.created_at) end desc nulls last,
     case when p_sort = 'largest' or p_sort = 'nearby' then r.members_count end desc nulls last,
     (r.p_posts + r.p_eng + r.p_new + r.p_div) desc,
     r.members_count desc
   limit greatest(p_limit, 1)
   offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.discover_circles_v2(
  text, text, text, text, int, int
) to authenticated, anon;

comment on function public.discover_circles_v2(text, text, text, text, int, int) is
  'Discovery cercles avec score d''activité transparent (formule pondérée fixe, aucun ML). Retourne breakdown jsonb pour affichage UI.';
