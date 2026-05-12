-- Chantier 2.5 — Recommandations personnalisées marketplace.
--
-- Objectif : exposer une RPC `recommended_listings_for_user` qui retourne
-- les listings les plus pertinents pour un user, basé sur :
--   1. ses catégories préférées (déduites de ses favoris)
--   2. les boosts (sponsoring) et popularité (views_count)
--   3. fraicheur (created_at)
-- avec exclusion :
--   - de ses propres listings (on ne se recommande pas)
--   - des listings déjà favorités (déjà sauvegardés, inutile)
--
-- Cold start : si l'user n'a aucun favori, on fallback sur les trending
-- globaux (is_boosted + views_count + récence).
--
-- IDEMPOTENT.

create or replace function public.recommended_listings_for_user(
  p_user_id uuid,
  p_limit   int default 20
)
returns table (id uuid, score real)
language sql
stable
parallel safe
as $$
  with user_prefs as (
    -- Catégories préférées : poids = nb de favoris dans cette catégorie.
    select
      l.category,
      count(*)::real as weight
    from public.favorites f
    join public.listings l on l.id = f.listing_id
    where f.user_id = p_user_id
    group by l.category
  ),
  excluded as (
    -- Listings déjà favorités → on les évince des recos.
    select listing_id from public.favorites where user_id = p_user_id
  ),
  scored as (
    select
      l.id,
      (
        coalesce(up.weight, 0) * 1.5
        + case when l.is_boosted then 1.0 else 0 end
        + least(coalesce(l.views_count, 0)::real / 100.0, 1.0)
        + greatest(
            0,
            1.0 - extract(epoch from (now() - l.created_at)) / (86400.0 * 14)
          ) * 0.5
      )::real as score
    from public.listings l
    left join user_prefs up on up.category = l.category
    where
      l.status = 'active'
      and l.seller_id <> p_user_id
      and l.id not in (select listing_id from excluded)
  )
  select id, score
  from scored
  order by score desc, random()
  limit greatest(p_limit, 1)
$$;

grant execute on function public.recommended_listings_for_user(uuid, int)
  to authenticated;
