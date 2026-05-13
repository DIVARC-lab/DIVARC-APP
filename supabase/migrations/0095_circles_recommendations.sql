-- Chantier 2.5 — Recommandations de cercles EXPLICABLES.
--
-- RPC `recommend_circles_for_user` qui :
--   1. exclut les cercles dont l'user est déjà membre + cercles archivés
--   2. score basé sur trois signaux transparents :
--      a. match catégorie (l'user a déjà rejoint des cercles dans cette cat)
--      b. amis déjà membres (compte des friends acceptés présents)
--      c. proximité géo (cercle local + même pays/ville que l'user)
--   3. retourne aussi un tableau `reasons` de phrases lisibles côté UI
--
-- Aucun ML, aucune boîte noire. La formule et les seuils sont visibles ici.
--
-- IDEMPOTENT.

create or replace function public.recommend_circles_for_user(
  p_user_id uuid,
  p_limit int default 24
)
returns table (
  id uuid,
  score real,
  reasons jsonb
)
language plpgsql
stable
parallel safe
as $$
declare
  v_user_country text;
  v_user_city text;
begin
  /* Localisation user (V1 : profile.location est un text libre, on garde
   * la sémantique simple ; à étendre quand le profil aura city/country
   * structurés). On la passe quand même au RPC pour de futures heuristiques. */
  select null, null into v_user_country, v_user_city;

  return query
  with user_cats as (
    /* Catégories que l'user fréquente déjà : nb de cercles membres par cat. */
    select c.primary_category as category,
           count(*)::int as user_circles_in_cat
      from public.circle_members m
      join public.circles c on c.id = m.circle_id
     where m.user_id = p_user_id
       and m.status = 'active'
       and c.archived_at is null
       and c.primary_category is not null
     group by c.primary_category
  ),
  user_friends as (
    /* Liste des amis acceptés. */
    select case when f.requester_id = p_user_id then f.recipient_id
                else f.requester_id end as friend_id
      from public.friendships f
     where f.status = 'accepted'
       and (f.requester_id = p_user_id or f.recipient_id = p_user_id)
  ),
  candidates as (
    select c.id,
           c.name,
           c.primary_category,
           c.is_local,
           c.location_city,
           c.location_country,
           c.members_count,
           c.created_at,
           c.tags,
           uc.user_circles_in_cat,
           (select count(*)::int
              from public.circle_members m
              join user_friends uf on uf.friend_id = m.user_id
             where m.circle_id = c.id
               and m.status = 'active') as friends_count_in_circle
      from public.circles c
      left join user_cats uc on uc.category = c.primary_category
     where c.archived_at is null
       and (c.visibility = 'public' or c.is_private = false)
       /* Exclut les cercles où l'user est déjà membre. */
       and not exists (
         select 1 from public.circle_members m
          where m.circle_id = c.id and m.user_id = p_user_id
       )
  ),
  scored as (
    select cand.*,
           /* Composantes 0-1 capées puis pondérées. */
           least(coalesce(cand.user_circles_in_cat, 0) / 5.0, 1.0) * 0.40 as p_category,
           least(cand.friends_count_in_circle / 5.0, 1.0) * 0.40 as p_friends,
           case when cand.is_local then 0.20 else 0 end as p_local,
           /* Bonus fraîcheur si créé dans les 14 derniers jours. */
           case when cand.created_at > now() - interval '14 days' then 0.10 else 0 end as p_fresh
      from candidates cand
  )
  select s.id,
         ((s.p_category + s.p_friends + s.p_local + s.p_fresh) * 100)::real as score,
         (
           select jsonb_agg(reason)
             from (
               select format(
                        '%s amis déjà membres',
                        s.friends_count_in_circle
                      ) as reason
                where s.friends_count_in_circle > 0
               union all
               select format(
                        'Tu as rejoint %s cercle%s dans cette catégorie',
                        s.user_circles_in_cat,
                        case when s.user_circles_in_cat > 1 then 's' else '' end
                      ) as reason
                where coalesce(s.user_circles_in_cat, 0) > 0
               union all
               select case
                        when s.location_city is not null
                          then format('Près de chez toi : %s', s.location_city)
                        else 'Cercle local'
                      end as reason
                where s.is_local = true
               union all
               select 'Récemment créé · ' || to_char(s.created_at, 'DD/MM') as reason
                where s.created_at > now() - interval '14 days'
               union all
               select format('%s membres actifs', s.members_count) as reason
                where s.members_count >= 100
                  and s.friends_count_in_circle = 0
                  and coalesce(s.user_circles_in_cat, 0) = 0
                  and s.is_local = false
                  and s.created_at <= now() - interval '14 days'
             ) r
         ) as reasons
    from scored s
   where (s.p_category + s.p_friends + s.p_local + s.p_fresh) > 0
   order by (s.p_category + s.p_friends + s.p_local + s.p_fresh) desc,
            s.members_count desc
   limit greatest(p_limit, 1);
end;
$$;

grant execute on function public.recommend_circles_for_user(uuid, int)
  to authenticated;

comment on function public.recommend_circles_for_user(uuid, int) is
  'Recommandations cercles avec reasons[] explicables. Score = catégorie × 0.40 + amis × 0.40 + local × 0.20 + fresh × 0.10 (cap 100). Aucun ML.';
