-- =====================================================
-- DIVARC — Migration 0063 : Profil étendu (V3.14 / Profil v2 étape 2.1)
--
-- Étend la table profiles avec les colonnes manquantes pour le profil
-- "LinkedIn + Facebook + Instagram" :
--   - Identité : pronouns
--   - Médias : cover_photo_url, cover_gradient (fallback élégant)
--   - Web : website (URL primaire), social_links (jsonb array)
--   - UX : sections_order (jsonb), sections_visibility (jsonb)
--   - Score : profile_completion_score (0-100, recalc trigger)
--   - Facettes : facets[] (multi) + primary_facet (mise en avant)
--
-- Note : `headline`, `open_to_work`, `open_to_hiring`, `intro_video_url`,
-- `interests`, `identity_verified_at`, `trust_score` existent déjà depuis
-- les migrations 0026/0034/0047 — pas re-créés.
-- =====================================================

-- 1. ALTER profiles : nouvelles colonnes
alter table public.profiles
  add column if not exists pronouns text
    check (pronouns is null or char_length(pronouns) <= 30),
  add column if not exists cover_photo_url text
    check (cover_photo_url is null or cover_photo_url ~* '^https?://'),
  add column if not exists cover_gradient text
    check (cover_gradient is null or cover_gradient in (
      'navy_gold', 'sunset', 'ocean', 'forest', 'rose', 'aurora',
      'cream_navy', 'noir', 'cyber'
    )),
  add column if not exists website text
    check (website is null or website ~* '^https?://'),
  /* social_links : array de {kind, url, label?} validé côté action.
     kind = instagram | twitter | linkedin | github | youtube | tiktok |
            behance | dribbble | mastodon | bluesky | custom */
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  /* sections_order : array de section_id pour customiser l'ordre.
     Default null = ordre par défaut côté UI. */
  add column if not exists sections_order jsonb,
  /* sections_visibility : map { section_id: visibility }
     visibility ∈ public | friends | friends_of_friends | private | custom */
  add column if not exists sections_visibility jsonb not null default '{}'::jsonb,
  /* profile_completion_score : 0-100, recalculé via trigger après update */
  add column if not exists profile_completion_score integer not null default 0
    check (profile_completion_score between 0 and 100),
  /* Facettes (multi-select). 'particulier' toujours présent. */
  add column if not exists facets text[] not null default array['particulier']::text[],
  add column if not exists primary_facet text not null default 'particulier'
    check (primary_facet in (
      'particulier', 'professionnel', 'createur',
      'vendeur', 'mentor', 'recruteur', 'entrepreneur'
    ));

-- 2. Index sur facets pour requêtes "users avec facette X"
create index if not exists profiles_facets_idx
  on public.profiles using gin (facets);

create index if not exists profiles_primary_facet_idx
  on public.profiles (primary_facet);

-- 3. Trigger : recalcul profile_completion_score
--    Algorithme inspiré du brief :
--      Avatar uploadé        : +10
--      Cover uploadée         : +10
--      Bio >= 50 chars        : +15
--      Headline non null      : +5
--      Localisation           : +5
--      Website                : +5
--      ≥ 1 social link        : +5
--      ≥ 1 expérience         : +15
--      ≥ 1 éducation          : +10
--      ≥ 5 skills             : +10
--      ≥ 1 highlight (table V2): +5 (skip V1 si table absente)
--      ≥ 1 reco reçue (V2)    : +5 (skip V1)
--    Total max 100 sans highlights/recos, 100 avec.
create or replace function public.compute_profile_completion_score(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  prof public.profiles%rowtype;
  score integer := 0;
  exp_count integer;
  edu_count integer;
  skill_count integer;
  highlight_count integer := 0;
  reco_count integer := 0;
begin
  select * into prof from public.profiles where id = p_user_id;
  if not found then return 0; end if;

  if prof.avatar_url is not null then score := score + 10; end if;
  if prof.cover_photo_url is not null then score := score + 10; end if;
  if prof.bio is not null and char_length(prof.bio) >= 50 then score := score + 15; end if;
  if prof.headline is not null and char_length(prof.headline) > 0 then score := score + 5; end if;
  if prof.location is not null and char_length(prof.location) > 0 then score := score + 5; end if;
  if prof.website is not null then score := score + 5; end if;
  if jsonb_array_length(coalesce(prof.social_links, '[]'::jsonb)) > 0 then
    score := score + 5;
  end if;

  select count(*) into exp_count from public.profile_experiences where user_id = p_user_id;
  if exp_count >= 1 then score := score + 15; end if;

  select count(*) into edu_count from public.profile_education where user_id = p_user_id;
  if edu_count >= 1 then score := score + 10; end if;

  select count(*) into skill_count from public.profile_skills where user_id = p_user_id;
  if skill_count >= 5 then score := score + 10; end if;

  /* Highlights + recos : skip V1 si tables absentes (migrations 0064/0065
     pas encore appliquées). Lookup pg_class pour éviter exception. */
  if exists (select 1 from pg_class where relname = 'story_highlights' and relnamespace = (select oid from pg_namespace where nspname = 'public')) then
    execute 'select count(*) from public.story_highlights where user_id = $1'
      into highlight_count using p_user_id;
    if highlight_count >= 1 then score := score + 5; end if;
  end if;

  if exists (select 1 from pg_class where relname = 'profile_recommendations' and relnamespace = (select oid from pg_namespace where nspname = 'public')) then
    execute 'select count(*) from public.profile_recommendations where to_user_id = $1 and is_visible = true'
      into reco_count using p_user_id;
    if reco_count >= 1 then score := score + 5; end if;
  end if;

  return least(score, 100);
end;
$$;

grant execute on function public.compute_profile_completion_score(uuid)
  to authenticated;

-- 4. Trigger qui recalcule le score après UPDATE de profiles
create or replace function public.refresh_profile_completion_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.profile_completion_score := public.compute_profile_completion_score(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_refresh_completion_score on public.profiles;
create trigger profiles_refresh_completion_score
  before update on public.profiles
  for each row
  when (
    old.avatar_url is distinct from new.avatar_url
    or old.cover_photo_url is distinct from new.cover_photo_url
    or old.bio is distinct from new.bio
    or old.headline is distinct from new.headline
    or old.location is distinct from new.location
    or old.website is distinct from new.website
    or old.social_links is distinct from new.social_links
  )
  execute function public.refresh_profile_completion_score();

-- 5. RPC pour recalcul forcé depuis le client (ex: après ajout expérience
-- qui ne modifie pas profiles directement)
create or replace function public.refresh_my_completion_score()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_score integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  new_score := public.compute_profile_completion_score(auth.uid());
  update public.profiles set profile_completion_score = new_score where id = auth.uid();
  return new_score;
end;
$$;

grant execute on function public.refresh_my_completion_score()
  to authenticated;

-- 6. Constraint : primary_facet doit être dans facets[]
alter table public.profiles
  drop constraint if exists primary_facet_in_facets;

alter table public.profiles
  add constraint primary_facet_in_facets
  check (primary_facet = any(facets));

-- 7. Backfill : recalcule le score pour tous les profils existants
--    (one-shot, ne se relance pas car set explicite)
do $$
declare
  rec record;
begin
  for rec in select id from public.profiles loop
    update public.profiles
       set profile_completion_score = public.compute_profile_completion_score(rec.id)
     where id = rec.id;
  end loop;
end $$;
