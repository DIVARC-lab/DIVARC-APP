-- =====================================================
-- DIVARC — Migration 0066 : Sections profil étendues (étape 2.4)
--
-- Crée 5 tables pour les sections supplémentaires du profil pro :
--   - profile_projects        : projets persos / pro avec techs + medias
--   - profile_publications    : livres / articles / podcasts auteurs
--   - profile_volunteer       : bénévolat
--   - profile_awards          : distinctions / awards
--   - profile_open_to_work    : 1 row/user, struct détaillée des
--     préférences d'opportunités (vs juste boolean open_to_work)
--
-- Toutes les tables suivent le même pattern :
--   id uuid PK + user_id FK + position_order + created_at
-- =====================================================

-- =====================================================
-- 1. profile_projects
-- =====================================================
create table if not exists public.profile_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 4000),
  start_month date,
  end_month date,
  is_ongoing boolean not null default false,
  demo_url text
    check (demo_url is null or demo_url ~* '^https?://'),
  source_url text
    check (source_url is null or source_url ~* '^https?://'),
  tech_tags text[] not null default '{}'::text[],
  /* Médias attachés (screenshots, vidéo demo) : array d'URL Supabase Storage */
  media_urls text[] not null default '{}'::text[],
  position_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint project_dates_consistent check (
    end_month is null or start_month is null or end_month >= start_month
  ),
  constraint ongoing_no_end check (
    is_ongoing = false or end_month is null
  )
);

create index if not exists profile_projects_user_idx
  on public.profile_projects (user_id, position_order, start_month desc);

-- =====================================================
-- 2. profile_publications
-- =====================================================
create table if not exists public.profile_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  /* book | article | podcast | research_paper | blog_post | white_paper */
  media_type text not null
    check (media_type in (
      'book', 'article', 'podcast', 'research_paper',
      'blog_post', 'white_paper', 'other'
    )),
  publisher text check (publisher is null or char_length(publisher) <= 120),
  publication_date date,
  url text check (url is null or url ~* '^https?://'),
  description text check (description is null or char_length(description) <= 2000),
  /* Co-auteurs : array d'UUIDs (users DIVARC) — text si pas DIVARC */
  co_author_user_ids uuid[] not null default '{}'::uuid[],
  co_authors_text text[] not null default '{}'::text[],
  cover_image_url text
    check (cover_image_url is null or cover_image_url ~* '^https?://'),
  position_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profile_publications_user_idx
  on public.profile_publications (user_id, position_order, publication_date desc);

-- =====================================================
-- 3. profile_volunteer
-- =====================================================
create table if not exists public.profile_volunteer (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization text not null check (char_length(organization) between 1 and 160),
  cause text check (cause is null or char_length(cause) <= 80),
  role text not null check (char_length(role) between 1 and 120),
  start_month date not null,
  end_month date,
  is_current boolean not null default false,
  description text check (description is null or char_length(description) <= 2000),
  position_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint volunteer_dates_consistent check (
    end_month is null or end_month >= start_month
  ),
  constraint volunteer_current_no_end check (
    is_current = false or end_month is null
  )
);

create index if not exists profile_volunteer_user_idx
  on public.profile_volunteer (user_id, position_order, start_month desc);

-- =====================================================
-- 4. profile_awards
-- =====================================================
create table if not exists public.profile_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  issuer text check (issuer is null or char_length(issuer) <= 120),
  issued_date date,
  description text check (description is null or char_length(description) <= 1500),
  url text check (url is null or url ~* '^https?://'),
  position_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profile_awards_user_idx
  on public.profile_awards (user_id, position_order, issued_date desc);

-- =====================================================
-- 5. profile_open_to_work (1 row/user)
-- =====================================================
-- Note : profiles.open_to_work bool existait déjà. Ce row apporte la
-- struct détaillée des préférences (visible seulement si bool=true).
create table if not exists public.profile_open_to_work (
  user_id uuid primary key references auth.users(id) on delete cascade,
  /* Titres recherchés (multi). */
  job_titles text[] not null default '{}'::text[],
  /* Localisations préférées (libellés). Mode 'remote' = télétravail. */
  locations text[] not null default '{}'::text[],
  /* Types de contrat : fulltime, parttime, contract, temporary,
     volunteer, internship, remote */
  work_types text[] not null default '{}'::text[],
  /* Industries (taxonomie DIVARC). */
  industries text[] not null default '{}'::text[],
  /* Préférence date de début. */
  start_date_preference text
    check (start_date_preference is null or start_date_preference in (
      'immediately', 'within_1_month', 'within_3_months', 'flexible'
    )),
  /* Visibilité du bandeau "Open to work" :
       all_members  : visible par tous (style bandeau LinkedIn)
       recruiters_only : visible seulement par les users facette=recruteur
       hidden       : pas de bandeau, juste préférences enregistrées */
  visibility text not null default 'all_members'
    check (visibility in ('all_members', 'recruiters_only', 'hidden')),
  /* Note libre pour les recruteurs (max 500 chars). */
  note text check (note is null or char_length(note) <= 500),
  updated_at timestamptz not null default now()
);

drop trigger if exists profile_open_to_work_set_updated_at on public.profile_open_to_work;
create trigger profile_open_to_work_set_updated_at
  before update on public.profile_open_to_work
  for each row execute function public.set_updated_at();

-- =====================================================
-- RLS
-- =====================================================
alter table public.profile_projects enable row level security;
alter table public.profile_publications enable row level security;
alter table public.profile_volunteer enable row level security;
alter table public.profile_awards enable row level security;
alter table public.profile_open_to_work enable row level security;

-- Pattern uniforme : SELECT public, INSERT/UPDATE/DELETE owner only.
-- La filtration par sections_visibility se fait V12 côté query.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profile_projects', 'profile_publications',
    'profile_volunteer', 'profile_awards'
  ] loop
    execute format(
      'drop policy if exists "%I visible by everyone" on public.%I',
      t, t
    );
    execute format(
      'create policy "%I visible by everyone" on public.%I for select using (true)',
      t, t
    );
    execute format(
      'drop policy if exists "owner can manage %I" on public.%I',
      t, t
    );
    execute format(
      'create policy "owner can manage %I" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end $$;

-- profile_open_to_work : visible selon visibility column
drop policy if exists "open_to_work visible by visibility rules" on public.profile_open_to_work;
create policy "open_to_work visible by visibility rules"
  on public.profile_open_to_work for select
  using (
    -- propriétaire toujours
    auth.uid() = user_id
    -- ou visibility = all_members
    or visibility = 'all_members'
    -- ou visibility = recruiters_only ET viewer a facette recruteur
    or (
      visibility = 'recruiters_only'
      and exists (
        select 1 from public.profiles
         where id = auth.uid()
           and 'recruteur' = any(facets)
      )
    )
  );

drop policy if exists "owner can manage open_to_work" on public.profile_open_to_work;
create policy "owner can manage open_to_work"
  on public.profile_open_to_work for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================
-- Trigger : recalc completion_score après mutation de ces tables.
-- L'algorithme V0063 ne compte pas encore ces sections — pour V12 on
-- pourrait ajouter +N points par section non vide. Pour l'instant on
-- déclenche refresh juste pour s'assurer que le score reflète bien le
-- compte d'expériences/edu/skills (qui dépend d'updates indirects).
-- =====================================================
create or replace function public.refresh_completion_score_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
begin
  target_user := coalesce(new.user_id, old.user_id);
  if target_user is null then return null; end if;
  update public.profiles
     set profile_completion_score = public.compute_profile_completion_score(target_user)
   where id = target_user;
  return null;
end;
$$;

-- Pas attaché aux 5 nouvelles tables V3.14 (les sections ne comptent pas
-- encore dans le score V0063). Function exportée pour usage explicite.
grant execute on function public.refresh_completion_score_for_user()
  to authenticated;
