-- =====================================================
-- DIVARC — Migration 0069 : Facette Créateur (étape 2.7)
--
-- Tables pour la facette créateur de contenu :
--   - creator_stats         : 1 row/user, KPIs publics (vues, engagement)
--   - creator_featured      : contenus épinglés sur la facette créateur
--   - creator_collaborations : marques/partenaires (Media Kit)
--   - creator_media_kit     : tarifs, audience, contact pro
--
-- Visible si profiles.facets contient 'createur'.
-- =====================================================

-- 1. creator_stats (1 row par user)
create table if not exists public.creator_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  /* Compteurs agrégés (mis à jour via cron/trigger). */
  total_views bigint not null default 0,
  total_likes bigint not null default 0,
  /* Engagement rate moyen [0..100] */
  avg_engagement_rate numeric(5, 2) not null default 0
    check (avg_engagement_rate >= 0 and avg_engagement_rate <= 100),
  monthly_active_followers integer not null default 0,
  /* Demographics audience (déclaré ou inféré). */
  primary_audience_age text
    check (primary_audience_age is null or primary_audience_age in (
      '13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
    )),
  primary_audience_geo text[] not null default '{}'::text[],
  /* Catégories de contenu (max 5). */
  content_categories text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

drop trigger if exists creator_stats_set_updated_at on public.creator_stats;
create trigger creator_stats_set_updated_at
  before update on public.creator_stats
  for each row execute function public.set_updated_at();

-- 2. creator_featured (contenus épinglés sur le profil créateur)
create table if not exists public.creator_featured (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /* Type du contenu épinglé. */
  content_type text not null
    check (content_type in ('post', 'reel', 'story_highlight', 'external')),
  /* References selon le type (1 seul non-null). */
  post_id uuid references public.posts(id) on delete cascade,
  reel_id uuid references public.reels(id) on delete cascade,
  story_highlight_id uuid references public.story_highlights(id) on delete cascade,
  /* External : URL extérieure (YouTube, Spotify, etc.) */
  external_url text
    check (external_url is null or external_url ~* '^https?://'),
  external_title text
    check (external_title is null or char_length(external_title) <= 120),
  external_thumbnail_url text
    check (external_thumbnail_url is null or external_thumbnail_url ~* '^https?://'),
  sort_position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint exactly_one_ref check (
    (case when post_id is not null then 1 else 0 end)
    + (case when reel_id is not null then 1 else 0 end)
    + (case when story_highlight_id is not null then 1 else 0 end)
    + (case when external_url is not null then 1 else 0 end) = 1
  )
);

create index if not exists creator_featured_user_idx
  on public.creator_featured (user_id, sort_position);

-- 3. creator_collaborations (marques/partenaires)
create table if not exists public.creator_collaborations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_name text not null check (char_length(brand_name) between 1 and 120),
  /* Si la marque a une page company DIVARC, on lie. Sinon texte libre. */
  brand_company_id uuid references public.companies(id) on delete set null,
  brand_logo_url text
    check (brand_logo_url is null or brand_logo_url ~* '^https?://'),
  collaboration_type text
    check (collaboration_type is null or collaboration_type in (
      'sponsorship', 'partnership', 'ambassador', 'affiliate',
      'placement', 'review', 'event', 'other'
    )),
  start_month date,
  end_month date,
  is_ongoing boolean not null default false,
  description text check (description is null or char_length(description) <= 500),
  sort_position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint collab_dates_consistent check (
    end_month is null or start_month is null or end_month >= start_month
  ),
  constraint collab_ongoing_no_end check (
    is_ongoing = false or end_month is null
  )
);

create index if not exists creator_collaborations_user_idx
  on public.creator_collaborations (user_id, sort_position, start_month desc);

-- 4. creator_media_kit (1 row/user, tarifs + contact pro)
create table if not exists public.creator_media_kit (
  user_id uuid primary key references auth.users(id) on delete cascade,
  /* Disponible pour des partenariats payants ? */
  is_open_to_partnerships boolean not null default false,
  /* Tarifs (numerics, currency séparée). */
  rate_post_amount numeric(10, 2)
    check (rate_post_amount is null or rate_post_amount >= 0),
  rate_reel_amount numeric(10, 2)
    check (rate_reel_amount is null or rate_reel_amount >= 0),
  rate_story_amount numeric(10, 2)
    check (rate_story_amount is null or rate_story_amount >= 0),
  rate_currency text
    check (rate_currency is null or rate_currency in (
      'EUR', 'USD', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF', 'GBP'
    )),
  /* Contact pro email (différent de l'email perso). */
  contact_email text
    check (contact_email is null or contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  /* Booking platform link (Linktree, Stan, Beacons, etc.) */
  booking_url text
    check (booking_url is null or booking_url ~* '^https?://'),
  /* Audience demographics PDF (Supabase Storage). */
  media_kit_pdf_url text
    check (media_kit_pdf_url is null or media_kit_pdf_url ~* '^https?://'),
  notes text check (notes is null or char_length(notes) <= 1000),
  updated_at timestamptz not null default now()
);

drop trigger if exists creator_media_kit_set_updated_at on public.creator_media_kit;
create trigger creator_media_kit_set_updated_at
  before update on public.creator_media_kit
  for each row execute function public.set_updated_at();

-- =====================================================
-- RLS
-- =====================================================
alter table public.creator_stats enable row level security;
alter table public.creator_featured enable row level security;
alter table public.creator_collaborations enable row level security;
alter table public.creator_media_kit enable row level security;

-- creator_stats : SELECT public, RW owner
drop policy if exists "creator stats visible by everyone" on public.creator_stats;
create policy "creator stats visible by everyone"
  on public.creator_stats for select using (true);

drop policy if exists "owner manages creator stats" on public.creator_stats;
create policy "owner manages creator stats"
  on public.creator_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- creator_featured : SELECT public, RW owner
drop policy if exists "creator featured visible by everyone" on public.creator_featured;
create policy "creator featured visible by everyone"
  on public.creator_featured for select using (true);

drop policy if exists "owner manages creator featured" on public.creator_featured;
create policy "owner manages creator featured"
  on public.creator_featured for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- creator_collaborations : SELECT public, RW owner
drop policy if exists "collabs visible by everyone" on public.creator_collaborations;
create policy "collabs visible by everyone"
  on public.creator_collaborations for select using (true);

drop policy if exists "owner manages collabs" on public.creator_collaborations;
create policy "owner manages collabs"
  on public.creator_collaborations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- creator_media_kit : SELECT visible si is_open_to_partnerships ou owner
drop policy if exists "media_kit visible if open or own" on public.creator_media_kit;
create policy "media_kit visible if open or own"
  on public.creator_media_kit for select
  using (
    is_open_to_partnerships = true
    or auth.uid() = user_id
  );

drop policy if exists "owner manages media_kit" on public.creator_media_kit;
create policy "owner manages media_kit"
  on public.creator_media_kit for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
