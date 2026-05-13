-- Chantier 5.5 — Vitality score : recalcul quotidien transparent.
--
-- RPC `refresh_all_circles_vitality` qui parcourt tous les cercles non
-- archivés, recalcule les compteurs dénormalisés (posts_count_7d,
-- active_members_count_7d, new_members_count_*, engagement_rate) ET le
-- score de vitalité 0-100 selon la formule transparente du cahier des
-- charges.
--
-- Formule (poids = 100%) :
--   posts_score      × 0.20  (cap 10 posts/sem)
--   engagement_score × 0.25  (cap 5 interactions/post moy)
--   diversity_score  × 0.15  (cap 20% des actifs publient)
--   growth_score     × 0.15  (cap 5% nouveaux membres/mois)
--   retention_score  × 0.15  (cap 60% nouveaux actifs après 30j)
--   moderation_score × 0.10  (cible <2% posts modérés)
--
-- Aucun ML. Toutes les valeurs sont visibles via la vue
-- circle_vitality_breakdown (à compléter en V2 si besoin de drill-down).
--
-- IDEMPOTENT (DROP+CREATE OR REPLACE).

create or replace function public.refresh_all_circles_vitality()
returns table (
  circle_id uuid,
  vitality_score real,
  posts_count_7d int,
  active_members_count_7d int,
  new_members_count_7d int,
  new_members_count_30d int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now constant timestamptz := now();
  v_circle record;
  v_posts_7d int;
  v_posts_30d int;
  v_engagement_7d numeric;
  v_unique_posters_7d int;
  v_active_7d int;
  v_new_7d int;
  v_new_30d int;
  v_moderated_30d int;
  v_retention_30d numeric;
  v_posts_score numeric;
  v_engagement_score numeric;
  v_diversity_score numeric;
  v_growth_score numeric;
  v_retention_score numeric;
  v_moderation_score numeric;
  v_vitality numeric;
begin
  for v_circle in
    select id, members_count
      from public.circles
     where archived_at is null
  loop
    /* Posts 7j. */
    select count(*) into v_posts_7d
      from public.posts
     where circle_id = v_circle.id
       and deleted_at is null
       and created_at > v_now - interval '7 days';

    /* Posts 30j (pour modération rate). */
    select count(*) into v_posts_30d
      from public.posts
     where circle_id = v_circle.id
       and deleted_at is null
       and created_at > v_now - interval '30 days';

    /* Engagement total 7j (upvotes + helpful_marks). */
    select coalesce(sum(upvotes + helpful_marks), 0) into v_engagement_7d
      from public.posts
     where circle_id = v_circle.id
       and deleted_at is null
       and created_at > v_now - interval '7 days';

    /* Unique posters 7j. */
    select count(distinct author_id) into v_unique_posters_7d
      from public.posts
     where circle_id = v_circle.id
       and deleted_at is null
       and created_at > v_now - interval '7 days';

    /* Membres actifs 7j (last_active_at récent). */
    select count(*) into v_active_7d
      from public.circle_members
     where circle_id = v_circle.id
       and status = 'active'
       and last_active_at > v_now - interval '7 days';

    /* Nouveaux membres 7j et 30j. */
    select count(*) into v_new_7d
      from public.circle_members
     where circle_id = v_circle.id
       and joined_at > v_now - interval '7 days';

    select count(*) into v_new_30d
      from public.circle_members
     where circle_id = v_circle.id
       and joined_at > v_now - interval '30 days';

    /* Posts modérés 30j (approuvés à postériori). */
    select count(*) into v_moderated_30d
      from public.circle_moderation_actions
     where circle_id = v_circle.id
       and action_type in ('post_rejected', 'post_locked')
       and created_at > v_now - interval '30 days';

    /* Retention 30j : % nouveaux membres encore actifs après 30j. */
    select
      coalesce(
        count(*) filter (
          where last_active_at > v_now - interval '7 days'
        )::numeric / nullif(count(*), 0),
        0
      )
      into v_retention_30d
      from public.circle_members
     where circle_id = v_circle.id
       and joined_at between v_now - interval '60 days'
                         and v_now - interval '30 days';

    /* Scores composantes 0-1, capés selon cibles. */
    v_posts_score := least(v_posts_7d::numeric / 10.0, 1.0);
    v_engagement_score := least(
      (v_engagement_7d / greatest(v_posts_7d, 1)::numeric) / 5.0,
      1.0
    );
    v_diversity_score := least(
      (v_unique_posters_7d::numeric / greatest(v_active_7d, 1)::numeric) / 0.20,
      1.0
    );
    v_growth_score := least(
      (v_new_30d::numeric / greatest(v_circle.members_count, 1)::numeric) / 0.05,
      1.0
    );
    v_retention_score := least(v_retention_30d / 0.60, 1.0);
    v_moderation_score := greatest(
      1.0 - (v_moderated_30d::numeric / greatest(v_posts_30d, 1)::numeric) / 0.02,
      0.0
    );

    v_vitality :=
      v_posts_score * 0.20 +
      v_engagement_score * 0.25 +
      v_diversity_score * 0.15 +
      v_growth_score * 0.15 +
      v_retention_score * 0.15 +
      v_moderation_score * 0.10;

    /* Met à jour les counters dénormalisés + vitality_score. */
    update public.circles
       set posts_count_7d = v_posts_7d,
           active_members_count_7d = v_active_7d,
           new_members_count_7d = v_new_7d,
           new_members_count_30d = v_new_30d,
           engagement_rate = case
             when v_posts_7d > 0 then v_engagement_7d / v_posts_7d
             else 0
           end,
           vitality_score = round((v_vitality * 100)::numeric, 1)
     where id = v_circle.id;

    /* Yield row pour le rapport. */
    circle_id := v_circle.id;
    vitality_score := round((v_vitality * 100)::numeric, 1)::real;
    posts_count_7d := v_posts_7d;
    active_members_count_7d := v_active_7d;
    new_members_count_7d := v_new_7d;
    new_members_count_30d := v_new_30d;
    return next;
  end loop;
end;
$$;

grant execute on function public.refresh_all_circles_vitality()
  to service_role;

comment on function public.refresh_all_circles_vitality() is
  'Cron quotidien : recalcule vitality_score + counters dénormalisés pour tous les cercles non archivés (Chantier 5.5).';
