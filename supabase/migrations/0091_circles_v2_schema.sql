-- Chantier 1.1 — Cercles v2 schema (upgrade additif, aucune breaking change).
--
-- Étend la table circles avec :
--   - identité riche : tagline, cover, color_accent personnalisable
--   - catégorisation : primary_category + secondary_categories[] + tags[] + language
--   - localisation optionnelle : is_local + city/country/lat/lng/radius_km
--   - type + join_policy + visibility (remplace is_private — gardé pour compat)
--   - modules activables (modules jsonb)
--   - welcome_message
--   - compteurs stats (recalculés async, voir Chantier 5)
--   - monétisation (jsonb, V2 fonctionnel plus tard)
--   - archived_at + updated_at + trigger
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Identité étendue
-- =====================================================

alter table public.circles
  add column if not exists tagline text
    check (tagline is null or char_length(tagline) <= 140);

alter table public.circles
  add column if not exists cover_url text
    check (cover_url is null or cover_url ~* '^https?://');

alter table public.circles
  add column if not exists cover_video_url text
    check (cover_video_url is null or cover_video_url ~* '^https?://');

/* Couleur d'accent libre (hex). Default = gold DIVARC. La colonne legacy
 * `color` (gold/navy/emerald/...) reste utilisée par l'UI v1 — on bridge
 * côté code applicatif pendant la transition. */
alter table public.circles
  add column if not exists color_accent text not null default '#C9A961'
    check (color_accent ~* '^#[0-9a-f]{6}$');

-- =====================================================
-- 2. Catégorisation
-- =====================================================
--
-- primary_category = id depuis lib/circles/categories.ts (chantier 1.4).
-- Pas de CHECK constraint enum côté DB pour permettre l'évolution de la
-- taxonomie sans migration ; validation au niveau action.

alter table public.circles
  add column if not exists primary_category text;

alter table public.circles
  add column if not exists secondary_categories text[] not null default '{}'::text[];

alter table public.circles
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.circles
  add column if not exists language text not null default 'fr'
    check (char_length(language) between 2 and 5);

-- =====================================================
-- 3. Localisation (optionnelle pour cercles locaux)
-- =====================================================

alter table public.circles
  add column if not exists is_local boolean not null default false;

alter table public.circles
  add column if not exists location_city text;

alter table public.circles
  add column if not exists location_country text
    check (location_country is null or char_length(location_country) = 2);

alter table public.circles
  add column if not exists location_lat double precision
    check (location_lat is null or location_lat between -90 and 90);

alter table public.circles
  add column if not exists location_lng double precision
    check (location_lng is null or location_lng between -180 and 180);

alter table public.circles
  add column if not exists location_radius_km integer
    check (location_radius_km is null or location_radius_km between 1 and 500);

-- =====================================================
-- 4. Type & accès (granularité — remplace is_private)
-- =====================================================

alter table public.circles
  add column if not exists type text not null default 'open';
alter table public.circles
  drop constraint if exists circles_type_check;
alter table public.circles
  add constraint circles_type_check
  check (type in ('open', 'semi_open', 'private', 'hidden'));

alter table public.circles
  add column if not exists join_policy text not null default 'instant';
alter table public.circles
  drop constraint if exists circles_join_policy_check;
alter table public.circles
  add constraint circles_join_policy_check
  check (join_policy in ('instant', 'request', 'invite_only', 'paid', 'quiz'));

alter table public.circles
  add column if not exists visibility text not null default 'public';
alter table public.circles
  drop constraint if exists circles_visibility_check;
alter table public.circles
  add constraint circles_visibility_check
  check (visibility in ('public', 'unlisted', 'invite_only'));

-- =====================================================
-- 5. Modules activables (jsonb)
-- =====================================================
--
-- Default = social_feed + events + polls (les 3 universellement utiles).
-- Les autres modules s'activent dans le wizard de création (chantier 4.1).

alter table public.circles
  add column if not exists modules jsonb not null default jsonb_build_object(
    'social_feed', true,
    'marketplace', false,
    'jobs', false,
    'library', false,
    'events', true,
    'live_audio', false,
    'polls', true,
    'wiki', false,
    'challenges', false,
    'mentorship', false
  );

-- =====================================================
-- 6. Welcome message
-- =====================================================

alter table public.circles
  add column if not exists welcome_message text
    check (welcome_message is null or char_length(welcome_message) <= 1000);

-- =====================================================
-- 7. Compteurs stats (recalculés async côté Chantier 5)
-- =====================================================

alter table public.circles
  add column if not exists active_members_count_7d integer not null default 0
    check (active_members_count_7d >= 0);

alter table public.circles
  add column if not exists posts_count_total integer not null default 0
    check (posts_count_total >= 0);

alter table public.circles
  add column if not exists posts_count_7d integer not null default 0
    check (posts_count_7d >= 0);

alter table public.circles
  add column if not exists new_members_count_7d integer not null default 0
    check (new_members_count_7d >= 0);

alter table public.circles
  add column if not exists new_members_count_30d integer not null default 0
    check (new_members_count_30d >= 0);

alter table public.circles
  add column if not exists engagement_rate real not null default 0
    check (engagement_rate >= 0);

alter table public.circles
  add column if not exists vitality_score real not null default 0
    check (vitality_score between 0 and 100);

-- =====================================================
-- 8. Monétisation (jsonb, V2 fonctionnel plus tard)
-- =====================================================
--
-- Structure quand renseigné :
--   {
--     "is_paid": true,
--     "pricing_model": "subscription_monthly" | "subscription_yearly" | "one_time",
--     "price_amount": 9.99,
--     "currency": "EUR",
--     "free_trial_days": 7,
--     "revenue_split_creator": 0.85,
--     "revenue_split_divarc": 0.15
--   }

alter table public.circles
  add column if not exists monetization jsonb;

-- =====================================================
-- 9. Lifecycle (archived_at + updated_at)
-- =====================================================

alter table public.circles
  add column if not exists archived_at timestamptz;

alter table public.circles
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists circles_set_updated_at on public.circles;
create trigger circles_set_updated_at
  before update on public.circles
  for each row execute function public.set_updated_at();

-- =====================================================
-- 10. Backfill legacy is_private → type/join_policy/visibility
-- =====================================================
--
-- Les cercles déjà privés gardent leur sémantique (private + request +
-- public discoverable). On ne touche que les rows encore aux defaults
-- pour éviter d'écraser un état explicite.

update public.circles
   set type = 'private',
       join_policy = 'request'
 where is_private = true
   and type = 'open';

-- =====================================================
-- 11. Indexes pour discovery (Chantier 2)
-- =====================================================

create index if not exists circles_primary_category_idx
  on public.circles (primary_category)
  where archived_at is null;

create index if not exists circles_visibility_created_at_idx
  on public.circles (visibility, created_at desc)
  where archived_at is null;

create index if not exists circles_vitality_idx
  on public.circles (vitality_score desc)
  where archived_at is null and visibility = 'public';

create index if not exists circles_is_local_idx
  on public.circles (location_country, location_city)
  where is_local = true and archived_at is null;

create index if not exists circles_tags_gin_idx
  on public.circles using gin (tags);

comment on column public.circles.modules is
  'Modules activables du cercle. Schéma : {social_feed, marketplace, jobs, library, events, live_audio, polls, wiki, challenges, mentorship} (booleans).';
comment on column public.circles.monetization is
  'Configuration monétisation (V2). Null si gratuit. Structure : {is_paid, pricing_model, price_amount, currency, free_trial_days, revenue_split_*}.';
comment on column public.circles.vitality_score is
  'Score 0-100 calculé async par compute_circle_vitality (Chantier 5.5). Formule transparente, visible aux membres.';
