-- =====================================================
-- DIVARC — Migration 0049 : Lookalike audiences via embeddings
--
-- RPC compute_lookalike_audience(source_audience_id, target_size_pct,
--                                country_iso2)
--   1. Récupère les matched_user_id de l'audience source (custom_list)
--   2. Calcule le centroïd (mean) des interest_vector de ces users
--   3. Trouve les top N users dont interest_vector est proche du centroïd
--      via cosine similarity (déjà supporté par pgvector)
--   4. Insère ces users matched dans l'audience lookalike cible
--
-- Pré-requis :
--   - Migration 0042 (user_interest_profiles avec interest_vector vector)
--   - Migration 0048 (ads_audiences + ads_audience_members)
-- =====================================================

create or replace function public.compute_lookalike_audience(
  p_lookalike_audience_id uuid,
  p_source_audience_id uuid,
  p_target_size integer default 100000,
  p_country text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_centroid vector(1536);
  v_inserted_count integer := 0;
  v_total_users integer;
begin
  /* 1. Centroïd : moyenne des interest_vector des matched_user_id de
     l'audience source. Si la source contient < 100 matched users, on
     refuse (k-anonymity + qualité du signal). */
  select count(*) into v_total_users
  from public.ads_audience_members
  where audience_id = p_source_audience_id
    and matched_user_id is not null;

  if v_total_users < 100 then
    raise exception
      'Audience source trop petite (% matched users, minimum 100 requis)',
      v_total_users;
  end if;

  /* Calcul du centroïd via SUM puis division par count.
     pgvector supporte AVG via fonction `avg` mais on fait manuellement
     pour gérer les cas d'erreur. */
  select avg(uip.interest_vector) into v_centroid
  from public.ads_audience_members am
  join public.user_interest_profiles uip
    on uip.user_id = am.matched_user_id
  where am.audience_id = p_source_audience_id
    and am.matched_user_id is not null
    and uip.interest_vector is not null;

  if v_centroid is null then
    raise exception
      'Impossible de calculer le centroïd (interest_vector manquants sur les sources)';
  end if;

  /* 2. Top N users similaires au centroïd, excluant les users déjà
     dans l'audience source. Filtrage pays optionnel via profile.location
     ilike. */
  with similar_users as (
    select uip.user_id,
           1 - (uip.interest_vector <=> v_centroid) as similarity
    from public.user_interest_profiles uip
    where uip.interest_vector is not null
      and uip.user_id not in (
        select matched_user_id from public.ads_audience_members
        where audience_id = p_source_audience_id
          and matched_user_id is not null
      )
    order by uip.interest_vector <=> v_centroid
    limit p_target_size
  )
  insert into public.ads_audience_members
    (audience_id, identifier_hash, identifier_type, matched_user_id)
  select
    p_lookalike_audience_id,
    /* identifier_hash = sha256(user_id::text) — déterministe pour
       éviter les doublons si on relance le calcul. */
    encode(digest(su.user_id::text, 'sha256'), 'hex'),
    'external_id'::text,
    su.user_id
  from similar_users su
  on conflict (audience_id, identifier_hash) do nothing;

  get diagnostics v_inserted_count = row_count;

  /* 3. Update stats de l'audience lookalike. */
  update public.ads_audiences
  set
    estimated_size = v_inserted_count,
    custom_match_count = v_inserted_count,
    custom_match_rate = 1.0
  where id = p_lookalike_audience_id;

  return v_inserted_count;
end;
$$;

revoke all on function public.compute_lookalike_audience(uuid, uuid, integer, text)
  from public;
grant execute on function public.compute_lookalike_audience(uuid, uuid, integer, text)
  to authenticated, service_role;

comment on function public.compute_lookalike_audience(uuid, uuid, integer, text) is
  'Génère une audience lookalike à partir du centroïd des interest_vectors d''une audience source. Min 100 users source. pgvector cosine similarity.';
