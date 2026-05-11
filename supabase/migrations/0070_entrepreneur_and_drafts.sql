-- =====================================================
-- DIVARC — Migration 0070 : Facette Entrepreneur + Drafts profil (étape 2.8)
--
-- Dernière migration de l'étape 2 (schéma).
--
-- Tables :
--   - entrepreneur_companies : sociétés fondées / dirigées
--   - entrepreneur_investments : portfolio d'investissement
--   - entrepreneur_fundraising_status : statut levée en cours (1/user)
--   - draft_profiles : brouillon d'édition sync multi-device (V1)
-- =====================================================

-- 1. entrepreneur_companies (sociétés fondées par l'user)
create table if not exists public.entrepreneur_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /* Lien company DIVARC ou texte libre. */
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null check (char_length(company_name) between 1 and 120),
  company_logo_url text
    check (company_logo_url is null or company_logo_url ~* '^https?://'),
  role text not null check (char_length(role) between 1 and 80),
  /* Statut du founder par rapport à la société. */
  founder_status text not null
    check (founder_status in (
      'founder', 'co_founder', 'ceo', 'cto', 'cfo', 'coo',
      'president', 'managing_director', 'board_member', 'advisor', 'other'
    )),
  founded_year integer
    check (founded_year is null or founded_year between 1900 and extract(year from now())::int + 1),
  exit_year integer
    check (exit_year is null or exit_year between 1900 and extract(year from now())::int + 5),
  is_current boolean not null default true,
  description text check (description is null or char_length(description) <= 2000),
  industry text check (industry is null or char_length(industry) <= 60),
  /* État de la société. */
  company_stage text
    check (company_stage is null or company_stage in (
      'idea', 'mvp', 'seed', 'series_a', 'series_b', 'series_c_plus',
      'profitable', 'acquired', 'shutdown', 'ipo'
    )),
  sort_position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint entrepreneur_dates_consistent check (
    exit_year is null or founded_year is null or exit_year >= founded_year
  )
);

create index if not exists entrepreneur_companies_user_idx
  on public.entrepreneur_companies (user_id, sort_position, founded_year desc);

-- 2. entrepreneur_investments (portfolio investisseur)
create table if not exists public.entrepreneur_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /* Société investie : lien company DIVARC ou texte libre. */
  invested_company_id uuid references public.companies(id) on delete set null,
  company_name text not null check (char_length(company_name) between 1 and 120),
  company_logo_url text
    check (company_logo_url is null or company_logo_url ~* '^https?://'),
  /* Round / stage. */
  round text
    check (round is null or round in (
      'pre_seed', 'seed', 'series_a', 'series_b', 'series_c',
      'series_d_plus', 'bridge', 'crowdfunding', 'angel', 'other'
    )),
  /* Montant masquable (privacy). */
  amount numeric(15, 2)
    check (amount is null or amount >= 0),
  currency text
    check (currency is null or currency in (
      'EUR', 'USD', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF', 'GBP'
    )),
  is_amount_public boolean not null default false,
  invested_at date,
  exit_at date,
  description text check (description is null or char_length(description) <= 1000),
  sort_position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists entrepreneur_investments_user_idx
  on public.entrepreneur_investments (user_id, sort_position, invested_at desc);

-- 3. entrepreneur_fundraising_status (1 row/user, état levée en cours)
create table if not exists public.entrepreneur_fundraising_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  /* Ouvert aux investisseurs ? Affiche le bandeau "Fundraising" sur le
     profil entrepreneur. */
  is_open boolean not null default false,
  round_type text
    check (round_type is null or round_type in (
      'pre_seed', 'seed', 'series_a', 'series_b', 'series_c',
      'series_d_plus', 'bridge', 'crowdfunding', 'other'
    )),
  target_amount numeric(15, 2)
    check (target_amount is null or target_amount >= 0),
  raised_amount numeric(15, 2)
    check (raised_amount is null or raised_amount >= 0),
  currency text
    check (currency is null or currency in (
      'EUR', 'USD', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF', 'GBP'
    )),
  /* Pitch deck PDF (Supabase Storage). */
  pitch_deck_url text
    check (pitch_deck_url is null or pitch_deck_url ~* '^https?://'),
  /* Contact dédié levée. */
  contact_email text
    check (contact_email is null or contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  /* Deadline soft. */
  closing_date date,
  notes text check (notes is null or char_length(notes) <= 2000),
  updated_at timestamptz not null default now(),
  constraint fundraising_amounts_consistent check (
    target_amount is null or raised_amount is null or raised_amount <= target_amount
  )
);

drop trigger if exists entrepreneur_fundraising_status_set_updated_at on public.entrepreneur_fundraising_status;
create trigger entrepreneur_fundraising_status_set_updated_at
  before update on public.entrepreneur_fundraising_status
  for each row execute function public.set_updated_at();

-- =====================================================
-- 4. draft_profiles : brouillon édition profil (sync multi-device)
-- =====================================================
-- 1 row par user, contenu jsonb structuré. Auto-save côté client
-- toutes les Xs ; à la submit final on push vers profiles + tables
-- liées et on delete le draft.
create table if not exists public.draft_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  /* Snapshot complet des champs en cours d'édition. Structure :
     {
       identity: { pronouns, cover_photo_url, ... },
       bio: "...",
       sections: { experiences: [...], education: [...], ... },
       facets: ["particulier", ...],
       sections_order: [...],
       sections_visibility: {...}
     }
     Schema valide côté Zod, pas de check DB strict (jsonb libre). */
  payload jsonb not null default '{}'::jsonb,
  /* Section actuellement éditée (UI hint). */
  current_section text
    check (current_section is null or char_length(current_section) <= 60),
  /* Version pour optimistic locking en multi-device. */
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists draft_profiles_set_updated_at on public.draft_profiles;
create trigger draft_profiles_set_updated_at
  before update on public.draft_profiles
  for each row execute function public.set_updated_at();

-- =====================================================
-- RLS
-- =====================================================
alter table public.entrepreneur_companies enable row level security;
alter table public.entrepreneur_investments enable row level security;
alter table public.entrepreneur_fundraising_status enable row level security;
alter table public.draft_profiles enable row level security;

-- entrepreneur_companies : SELECT public, RW owner
drop policy if exists "entrepreneur companies visible by everyone" on public.entrepreneur_companies;
create policy "entrepreneur companies visible by everyone"
  on public.entrepreneur_companies for select using (true);

drop policy if exists "owner manages entrepreneur companies" on public.entrepreneur_companies;
create policy "owner manages entrepreneur companies"
  on public.entrepreneur_companies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- entrepreneur_investments :
-- SELECT public (montant filtré côté query si is_amount_public=false)
drop policy if exists "investments visible by everyone" on public.entrepreneur_investments;
create policy "investments visible by everyone"
  on public.entrepreneur_investments for select using (true);

drop policy if exists "owner manages investments" on public.entrepreneur_investments;
create policy "owner manages investments"
  on public.entrepreneur_investments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- entrepreneur_fundraising_status :
-- SELECT public si is_open OR owner (sinon caché)
drop policy if exists "fundraising visible if open or own" on public.entrepreneur_fundraising_status;
create policy "fundraising visible if open or own"
  on public.entrepreneur_fundraising_status for select
  using (
    is_open = true
    or auth.uid() = user_id
  );

drop policy if exists "owner manages fundraising" on public.entrepreneur_fundraising_status;
create policy "owner manages fundraising"
  on public.entrepreneur_fundraising_status for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- draft_profiles : owner only (privé strict)
drop policy if exists "owner reads own draft" on public.draft_profiles;
create policy "owner reads own draft"
  on public.draft_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "owner manages own draft" on public.draft_profiles;
create policy "owner manages own draft"
  on public.draft_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================
-- RPC : upsert draft (atomique, increment version)
-- =====================================================
create or replace function public.upsert_draft_profile(
  p_payload jsonb,
  p_current_section text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_version integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.draft_profiles (user_id, payload, current_section, version)
    values (uid, p_payload, p_current_section, 1)
    on conflict (user_id) do update
       set payload = excluded.payload,
           current_section = excluded.current_section,
           version = public.draft_profiles.version + 1,
           updated_at = now()
    returning version into new_version;

  return new_version;
end;
$$;

grant execute on function public.upsert_draft_profile(jsonb, text)
  to authenticated;

-- RPC : clear draft (après submit final)
create or replace function public.clear_draft_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.draft_profiles where user_id = auth.uid();
end;
$$;

grant execute on function public.clear_draft_profile()
  to authenticated;
