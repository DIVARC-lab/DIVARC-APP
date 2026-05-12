-- Chantier 1 Étape 1.1 — Listing v2 schema (extension du cahier des charges
-- marketplace DIVARC niveau Vinted/Leboncoin/eBay).
--
-- Aucune breaking change : toutes les colonnes nouvelles sont nullable
-- ou ont un DEFAULT, les rows existantes restent valides. La taxonomie
-- détaillée (étape 1.2) fait l'objet d'une migration séparée plus tard.

-- =====================================================
-- 1. Extension des CHECK constraints existantes (status, condition)
--    pour accueillir les nouvelles valeurs v2 sans casser les anciennes.
-- =====================================================

-- status : 'draft','active','sold','archived' → on ajoute pending_review,
-- paused, reserved, expired, removed_violation, removed_user
alter table public.listings
  drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check
  check (status in (
    'draft',
    'pending_review',
    'active',
    'paused',
    'reserved',
    'sold',
    'expired',
    'archived',
    'removed_violation',
    'removed_user'
  ));

-- condition : 'new','like_new','used','fair' → on accepte aussi les
-- valeurs Vinted-style (new_with_tags, new_without_tags, very_good,
-- good, satisfactory, damaged). Les rows existantes restent valides.
alter table public.listings
  drop constraint if exists listings_condition_check;
alter table public.listings
  add constraint listings_condition_check
  check (condition in (
    'new',
    'like_new',
    'used',
    'fair',
    'new_with_tags',
    'new_without_tags',
    'very_good',
    'good',
    'satisfactory',
    'damaged'
  ));

-- =====================================================
-- 2. Nouvelles colonnes sur listings (toutes idempotentes via if not exists)
-- =====================================================

alter table public.listings
  -- Type : objet, service, immo, véhicule, etc.
  add column if not exists listing_type text not null default 'goods'
    check (listing_type in (
      'goods',
      'service',
      'real_estate',
      'vehicle',
      'event_ticket',
      'digital',
      'job',
      'housing_rental'
    ));

-- Catégorisation hiérarchique (4 niveaux). Pour les rows existantes,
-- on backfill plus bas avec [category].
alter table public.listings
  add column if not exists category_path text[] not null default '{}';

-- Catégorie racine (premier élément du path) — détermine le ui_mode
-- côté front (vinted/leboncoin/vehicle/real_estate/service).
alter table public.listings
  add column if not exists primary_category text;

-- Attributs dynamiques selon catégorie (taille, marque, kilométrage…).
-- Schéma validé côté front via lib/marketplace/attributes-schemas.ts
alter table public.listings
  add column if not exists attributes jsonb not null default '{}'::jsonb;

-- Prix
alter table public.listings
  add column if not exists original_price numeric(12, 2)
    check (original_price is null or original_price >= 0);
alter table public.listings
  add column if not exists is_negotiable boolean not null default false;
alter table public.listings
  add column if not exists minimum_offer numeric(12, 2)
    check (minimum_offer is null or minimum_offer >= 0);

-- Localisation géo (en plus du `location` text déjà existant)
alter table public.listings
  add column if not exists location_lat numeric(9, 6);
alter table public.listings
  add column if not exists location_lng numeric(9, 6);
alter table public.listings
  add column if not exists show_exact_location boolean not null default false;

-- Livraison
alter table public.listings
  add column if not exists shipping_options jsonb not null default '[]'::jsonb;
alter table public.listings
  add column if not exists accepts_pickup boolean not null default true;
alter table public.listings
  add column if not exists pickup_locations jsonb not null default '[]'::jsonb;

-- Stock / produit
alter table public.listings
  add column if not exists quantity_available integer not null default 1
    check (quantity_available >= 0);
alter table public.listings
  add column if not exists is_made_to_order boolean not null default false;
alter table public.listings
  add column if not exists handmade boolean not null default false;

-- Extended data : pour véhicules/immo, payload structurel séparé
alter table public.listings
  add column if not exists extended_data jsonb;

-- Engagement / stats (cachés pour perf, mis à jour par triggers ou jobs)
alter table public.listings
  add column if not exists views_count integer not null default 0
    check (views_count >= 0);
alter table public.listings
  add column if not exists favorites_count_cached integer not null default 0
    check (favorites_count_cached >= 0);
alter table public.listings
  add column if not exists shares_count integer not null default 0
    check (shares_count >= 0);
alter table public.listings
  add column if not exists messages_count integer not null default 0
    check (messages_count >= 0);

-- Boost / Premium
alter table public.listings
  add column if not exists is_boosted boolean not null default false;
alter table public.listings
  add column if not exists boost_expires_at timestamptz;
alter table public.listings
  add column if not exists boost_type text
    check (boost_type is null or boost_type in ('standard', 'premium', 'top'));

-- Modération
alter table public.listings
  add column if not exists moderation_status text not null default 'approved'
    check (moderation_status in ('approved', 'pending', 'flagged', 'rejected'));
alter table public.listings
  add column if not exists moderation_flags text[] not null default '{}';

-- SEO
alter table public.listings
  add column if not exists seo_slug text;
create unique index if not exists listings_seo_slug_unique
  on public.listings (seo_slug) where seo_slug is not null;

-- Timestamps additionnels
alter table public.listings
  add column if not exists published_at timestamptz;
alter table public.listings
  add column if not exists expires_at timestamptz;

-- Vente
alter table public.listings
  add column if not exists sold_to uuid references auth.users(id) on delete set null;
alter table public.listings
  add column if not exists sold_price numeric(12, 2)
    check (sold_price is null or sold_price >= 0);

-- Reputation vendeur (cache score pour ranking, alimenté par job)
alter table public.listings
  add column if not exists seller_response_rate numeric(5, 2)
    check (seller_response_rate is null or (seller_response_rate >= 0 and seller_response_rate <= 100));

-- =====================================================
-- 3. Indexes additionnels pour les requêtes futures
-- =====================================================

-- Search par type + status (filtres marketplace)
create index if not exists listings_type_status_idx
  on public.listings (listing_type, status);

-- Search géo (pour distance-based filtering futur, sans PostGIS V1)
create index if not exists listings_location_geo_idx
  on public.listings (location_lat, location_lng)
  where location_lat is not null and location_lng is not null;

-- Listings actifs publiés récemment (feed)
create index if not exists listings_published_at_idx
  on public.listings (published_at desc nulls last)
  where status = 'active';

-- Listings boostés actifs (mis en avant)
create index if not exists listings_boosted_idx
  on public.listings (boost_expires_at desc)
  where is_boosted = true and status = 'active';

-- Modération queue
create index if not exists listings_moderation_idx
  on public.listings (moderation_status, created_at)
  where moderation_status in ('pending', 'flagged');

-- Recherche par primary_category (UI mode lookup)
create index if not exists listings_primary_category_idx
  on public.listings (primary_category) where primary_category is not null;

-- =====================================================
-- 4. Backfill pour les rows existantes
-- =====================================================

-- primary_category ← category (mapping FR → FR pour V1, V2 fera le mapping
-- vers la nouvelle taxonomie EN avec l'étape 1.2)
update public.listings
   set primary_category = category
 where primary_category is null;

-- category_path ← [category] pour les rows sans path
update public.listings
   set category_path = array[category]
 where array_length(category_path, 1) is null;

-- published_at ← created_at pour les listings déjà 'active'
update public.listings
   set published_at = created_at
 where status = 'active' and published_at is null;

-- =====================================================
-- 5. Extension de listing_photos
-- =====================================================

alter table public.listing_photos
  add column if not exists is_primary boolean not null default false;
alter table public.listing_photos
  add column if not exists blurhash text;
alter table public.listing_photos
  add column if not exists ai_tags text[] not null default '{}';
alter table public.listing_photos
  add column if not exists has_nsfw_content boolean not null default false;

-- Backfill : la première photo (position=0) de chaque listing devient primary
-- (si aucune n'est primary)
update public.listing_photos lp
   set is_primary = true
  from (
    select listing_id, min(position) as min_pos
      from public.listing_photos
     group by listing_id
  ) m
 where lp.listing_id = m.listing_id
   and lp.position = m.min_pos
   and not exists (
     select 1 from public.listing_photos
      where listing_id = lp.listing_id and is_primary = true
   );

-- Index pour récupérer rapidement la photo primaire
create index if not exists listing_photos_primary_idx
  on public.listing_photos (listing_id) where is_primary = true;
