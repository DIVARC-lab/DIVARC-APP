-- =====================================================
-- DIVARC — Migration 0019 : Emploi LinkedIn-grade
--   Fondation : profil pro enrichi + entreprises + endorsements
--   + open_to_work / hiring + saved searches + profile views
--   + statuts candidature enrichis
-- =====================================================

-- =========================================================
-- 1. Colonnes profil pro
-- =========================================================

alter table public.profiles
  add column if not exists headline text
    check (headline is null or char_length(headline) between 1 and 200),
  add column if not exists open_to_work boolean not null default false,
  add column if not exists open_to_hiring boolean not null default false,
  add column if not exists discrete_search boolean not null default false;

-- =========================================================
-- 2. Entreprises (pages)
-- =========================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 1 and 120),
  tagline text check (tagline is null or char_length(tagline) between 1 and 200),
  description text check (description is null or char_length(description) between 1 and 4000),
  logo_url text,
  cover_url text,
  website text check (website is null or website ~* '^https?://'),
  industry text,
  size_label text
    check (size_label is null or size_label in (
      '1-10', '11-50', '51-200', '201-500', '501-1000',
      '1001-5000', '5001-10000', '10000+'
    )),
  headquarters text,
  founded_year integer
    check (founded_year is null or founded_year between 1800 and extract(year from now())::int),
  owner_id uuid not null references auth.users(id) on delete cascade,
  verified boolean not null default false,
  followers_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_owner_idx on public.companies (owner_id);
create index if not exists companies_industry_idx on public.companies (industry);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table if not exists public.company_followers (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create or replace function public.bump_company_followers_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.companies set followers_count = followers_count + 1
      where id = new.company_id;
  elsif tg_op = 'DELETE' then
    update public.companies set followers_count = greatest(followers_count - 1, 0)
      where id = old.company_id;
  end if;
  return null;
end;
$$;

drop trigger if exists company_followers_count_ins on public.company_followers;
drop trigger if exists company_followers_count_del on public.company_followers;
create trigger company_followers_count_ins
  after insert on public.company_followers
  for each row execute function public.bump_company_followers_count();
create trigger company_followers_count_del
  after delete on public.company_followers
  for each row execute function public.bump_company_followers_count();

-- =========================================================
-- 3. Lien jobs ↔ companies (optionnel, garde company_name texte pour back-compat)
-- =========================================================

alter table public.jobs
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists jobs_company_id_idx on public.jobs (company_id)
  where company_id is not null;

-- =========================================================
-- 4. Profil pro : expériences, formations, compétences, langues, certifs
-- =========================================================

create table if not exists public.profile_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  company_name text not null check (char_length(company_name) between 1 and 120),
  company_id uuid references public.companies(id) on delete set null,
  employment_type text
    check (employment_type is null or employment_type in (
      'cdi', 'cdd', 'freelance', 'mission', 'alternance', 'stage', 'benevolat'
    )),
  work_mode text
    check (work_mode is null or work_mode in ('on_site', 'remote', 'hybrid')),
  location text,
  description text check (description is null or char_length(description) <= 4000),
  start_month date not null,
  end_month date,
  is_current boolean not null default false,
  position_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint experience_dates_consistent check (
    end_month is null or end_month >= start_month
  ),
  constraint current_no_end check (
    is_current = false or end_month is null
  )
);

create index if not exists profile_experiences_user_idx
  on public.profile_experiences (user_id, position_order, start_month desc);

create table if not exists public.profile_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school text not null check (char_length(school) between 1 and 160),
  degree text check (degree is null or char_length(degree) <= 120),
  field_of_study text check (field_of_study is null or char_length(field_of_study) <= 120),
  start_year integer check (start_year is null or start_year between 1900 and extract(year from now())::int + 10),
  end_year integer check (end_year is null or end_year between 1900 and extract(year from now())::int + 10),
  description text check (description is null or char_length(description) <= 2000),
  position_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint education_years_consistent check (
    end_year is null or start_year is null or end_year >= start_year
  )
);

create index if not exists profile_education_user_idx
  on public.profile_education (user_id, position_order, start_year desc);

create table if not exists public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  level text
    check (level is null or level in ('beginner', 'intermediate', 'advanced', 'expert')),
  position_order integer not null default 0,
  endorsements_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists profile_skills_user_idx
  on public.profile_skills (user_id, position_order);

create table if not exists public.skill_endorsements (
  skill_id uuid not null references public.profile_skills(id) on delete cascade,
  endorser_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (skill_id, endorser_id)
);

create or replace function public.bump_skill_endorsements_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profile_skills
       set endorsements_count = endorsements_count + 1
     where id = new.skill_id;
  elsif tg_op = 'DELETE' then
    update public.profile_skills
       set endorsements_count = greatest(endorsements_count - 1, 0)
     where id = old.skill_id;
  end if;
  return null;
end;
$$;

drop trigger if exists skill_endorsements_count_ins on public.skill_endorsements;
drop trigger if exists skill_endorsements_count_del on public.skill_endorsements;
create trigger skill_endorsements_count_ins
  after insert on public.skill_endorsements
  for each row execute function public.bump_skill_endorsements_count();
create trigger skill_endorsements_count_del
  after delete on public.skill_endorsements
  for each row execute function public.bump_skill_endorsements_count();

create table if not exists public.profile_languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  level text not null
    check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native')),
  position_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists profile_languages_user_idx
  on public.profile_languages (user_id, position_order);

create table if not exists public.profile_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  issuer text not null check (char_length(issuer) between 1 and 120),
  issued_month date,
  expires_month date,
  credential_url text check (credential_url is null or credential_url ~* '^https?://'),
  position_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profile_certifications_user_idx
  on public.profile_certifications (user_id, position_order, issued_month desc);

-- =========================================================
-- 5. Saved searches (job alerts)
-- =========================================================

create table if not exists public.job_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  query text,
  category text,
  job_type text,
  work_mode text,
  experience_level text,
  location text,
  alerts_enabled boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists job_saved_searches_user_idx
  on public.job_saved_searches (user_id, created_at desc);

-- =========================================================
-- 6. Profile views ("qui a vu mon profil")
-- =========================================================

create table if not exists public.profile_views (
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_id uuid not null references auth.users(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  view_count integer not null default 1,
  primary key (viewer_id, viewed_id),
  constraint no_self_view check (viewer_id <> viewed_id)
);

create index if not exists profile_views_viewed_idx
  on public.profile_views (viewed_id, last_viewed_at desc);

-- Upsert helper : ne crée pas de vue si le viewer est en mode discrete_search
create or replace function public.record_profile_view(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  viewer_discrete boolean;
begin
  if viewer is null or viewer = target_user_id then return; end if;

  select discrete_search into viewer_discrete
    from public.profiles where id = viewer;

  if viewer_discrete then return; end if;

  insert into public.profile_views (viewer_id, viewed_id, last_viewed_at, view_count)
       values (viewer, target_user_id, now(), 1)
  on conflict (viewer_id, viewed_id) do update
       set last_viewed_at = now(),
           view_count = public.profile_views.view_count + 1;
end;
$$;

grant execute on function public.record_profile_view(uuid) to authenticated;

-- =========================================================
-- 7. Application tracking enrichi : statuts shortlisted / interview
-- =========================================================

alter table public.job_applications
  drop constraint if exists job_applications_status_check;

alter table public.job_applications
  add constraint job_applications_status_check check (
    status in ('pending', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn')
  );

-- =========================================================
-- 8. RLS — companies + followers
-- =========================================================

alter table public.companies enable row level security;
alter table public.company_followers enable row level security;

drop policy if exists "companies are public" on public.companies;
create policy "companies are public"
  on public.companies for select using (true);

drop policy if exists "owner can insert company" on public.companies;
create policy "owner can insert company"
  on public.companies for insert
  with check (owner_id = auth.uid());

drop policy if exists "owner can update company" on public.companies;
create policy "owner can update company"
  on public.companies for update using (owner_id = auth.uid());

drop policy if exists "owner can delete company" on public.companies;
create policy "owner can delete company"
  on public.companies for delete using (owner_id = auth.uid());

drop policy if exists "follows are public" on public.company_followers;
create policy "follows are public"
  on public.company_followers for select using (true);

drop policy if exists "users follow companies" on public.company_followers;
create policy "users follow companies"
  on public.company_followers for insert
  with check (user_id = auth.uid());

drop policy if exists "users unfollow companies" on public.company_followers;
create policy "users unfollow companies"
  on public.company_followers for delete using (user_id = auth.uid());

-- =========================================================
-- 9. RLS — sections de profil pro (lecture publique, écriture owner)
-- =========================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profile_experiences',
    'profile_education',
    'profile_skills',
    'profile_languages',
    'profile_certifications'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "section is public" on public.%I;', t);
    execute format('create policy "section is public" on public.%I for select using (true);', t);
    execute format('drop policy if exists "owner can write section" on public.%I;', t);
    execute format(
      'create policy "owner can write section" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;

-- =========================================================
-- 10. RLS — endorsements (lecture publique, insertion par les autres uniquement)
-- =========================================================

alter table public.skill_endorsements enable row level security;

drop policy if exists "endorsements are public" on public.skill_endorsements;
create policy "endorsements are public"
  on public.skill_endorsements for select using (true);

drop policy if exists "users endorse others skills" on public.skill_endorsements;
create policy "users endorse others skills"
  on public.skill_endorsements for insert
  with check (
    endorser_id = auth.uid()
    and exists (
      select 1 from public.profile_skills s
       where s.id = skill_id and s.user_id <> auth.uid()
    )
  );

drop policy if exists "users delete own endorsements" on public.skill_endorsements;
create policy "users delete own endorsements"
  on public.skill_endorsements for delete using (endorser_id = auth.uid());

-- =========================================================
-- 11. RLS — saved searches (privé)
-- =========================================================

alter table public.job_saved_searches enable row level security;

drop policy if exists "users see own saved searches" on public.job_saved_searches;
create policy "users see own saved searches"
  on public.job_saved_searches for select using (user_id = auth.uid());

drop policy if exists "users write own saved searches" on public.job_saved_searches;
create policy "users write own saved searches"
  on public.job_saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- 12. RLS — profile_views (le viewed voit, le viewer aussi)
-- =========================================================

alter table public.profile_views enable row level security;

drop policy if exists "viewer or viewed can read" on public.profile_views;
create policy "viewer or viewed can read"
  on public.profile_views for select
  using (viewer_id = auth.uid() or viewed_id = auth.uid());

-- Pas d'insert/update direct : passe uniquement par record_profile_view().

-- =========================================================
-- 13. Realtime (idempotent)
-- =========================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'company_followers', 'profile_experiences',
    'profile_education', 'profile_skills', 'skill_endorsements',
    'profile_languages', 'profile_certifications',
    'job_saved_searches', 'profile_views'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
