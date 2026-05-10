-- =====================================================
-- DIVARC — Migration 0048 : Régie publicitaire (Ads Manager)
--
-- Pile complète Business → AdAccount → Campaign → AdSet → Ad
-- conforme DSA art. 26/28/39, RGPD art. 9, Loi Évin, ARPP, ARCOM.
--
-- Hiérarchie multi-tenant :
--   business_accounts (raison sociale + KYB)
--     └── ad_accounts (un par marque/produit, multi-currency)
--           └── ad_account_users (rôles admin/editor/analyst/finance)
--           └── advertiser_entities (pages DIVARC + sites externes)
--           └── audiences (saved / custom / lookalike / divarc_special)
--           └── campaigns
--                 └── ad_sets (audience + budget + placements)
--                       └── ads (creative + tracking + review_status)
--           └── ad_charges (facturation, wallet en V1, Stripe en V4)
--           └── ads_pixels (DIVARC Pixel installé sur sites externes)
--
-- Tables tracking (volumineuses, partition à terme) :
--   ad_impressions
--   ad_clicks
--   ad_conversions
--   ad_frequency_caps  -- tracking par user
--
-- Tables transparence + user privacy :
--   ads_library_entries  -- snapshot pour DSA art. 39 (1 an conservation)
--   user_ad_preferences  -- opt-out, blocked categories, blocked advertisers
--
-- RLS multi-tenant : ad_account_users gate l'accès à toutes les tables
-- liées (campagnes, ad_sets, ads, audiences, charges).
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1. business_accounts — Raison sociale (KYB)
-- =====================================================
create table if not exists public.ads_business_accounts (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  legal_form text, -- SARL, SAS, EI, EURL, association, etc.
  siret text,      -- France 14 chiffres
  vat_number text, -- FRXXXXXXXXXXX
  /* Adresse de facturation. */
  billing_address jsonb not null default '{}'::jsonb,
  /* Contact principal. */
  primary_contact_user_id uuid not null references public.profiles(id) on delete restrict,
  primary_contact_email text not null,
  primary_contact_phone text,
  /* KYB — obligatoire si dépense > 5000€/mois (gardé en jsonb pour
     flexibilité doc types : kbis_url, id_card_url, etc.). */
  verification_status text not null default 'pending'
    check (verification_status in ('pending','submitted','verified','rejected')),
  verification_documents jsonb not null default '[]'::jsonb,
  verification_notes text,
  verified_at timestamptz,
  /* Industry pour reporting + brand safety inverse (ex: marque alcool
     refuse contextes mineurs). */
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_business_accounts_contact_idx
  on public.ads_business_accounts (primary_contact_user_id);
create unique index if not exists ads_business_accounts_siret_uniq
  on public.ads_business_accounts (siret) where siret is not null;

-- =====================================================
-- 2. ad_accounts — Compte publicitaire (un par marque/produit)
-- =====================================================
create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid not null references public.ads_business_accounts(id) on delete restrict,
  name text not null,
  currency text not null default 'EUR' check (currency in ('EUR','USD','GBP','CAD','CHF')),
  timezone text not null default 'Europe/Paris',
  /* Limites de dépense — protection annonceur. NULL = illimité (admin only). */
  spend_limit_daily numeric(12,2),
  spend_limit_monthly numeric(12,2),
  /* Solde wallet (pré-paiement V1 sans Stripe). En V4 : Stripe Connect
     payment_method_id ici + thresholds progressifs. */
  prepaid_balance numeric(12,2) not null default 0 check (prepaid_balance >= -1000), -- crédit -1000 max
  total_spent numeric(14,2) not null default 0,
  /* Statut. */
  status text not null default 'active'
    check (status in ('active','paused','suspended','closed')),
  suspension_reason text,
  /* Métadonnées. */
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_accounts_business_idx
  on public.ad_accounts (business_account_id);
create index if not exists ad_accounts_status_idx
  on public.ad_accounts (status);

-- =====================================================
-- 3. ad_account_users — Permissions multi-tenant
-- =====================================================
create table if not exists public.ad_account_users (
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','editor','analyst','finance')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (ad_account_id, user_id)
);

create index if not exists ad_account_users_user_idx
  on public.ad_account_users (user_id);

/* Helper : check role. Inline-able dans RLS via security definer. */
create or replace function public.user_has_ad_account_role(
  p_ad_account_id uuid,
  p_min_role text default 'analyst'
) returns boolean
language sql stable security definer set search_path = public as $$
  /* Hiérarchie : admin > editor > finance > analyst. */
  select exists(
    select 1 from public.ad_account_users
    where ad_account_id = p_ad_account_id
      and user_id = auth.uid()
      and (
        p_min_role = 'analyst'
        or (p_min_role = 'finance' and role in ('admin','finance'))
        or (p_min_role = 'editor' and role in ('admin','editor'))
        or (p_min_role = 'admin' and role = 'admin')
      )
  );
$$;
revoke all on function public.user_has_ad_account_role(uuid, text) from public;
grant execute on function public.user_has_ad_account_role(uuid, text)
  to authenticated, service_role;

-- =====================================================
-- 4. advertiser_entities — Pages représentées (DIVARC + sites externes)
-- =====================================================
create table if not exists public.advertiser_entities (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  type text not null check (type in (
    'divarc_company','external_site','mobile_app','physical_store'
  )),
  name text not null,
  url text,
  logo_url text,
  /* Si type=divarc_company : référence à la table companies. */
  divarc_company_id uuid references public.companies(id) on delete set null,
  /* Vérification propriété (DNS TXT, meta tag) pour external_site. */
  verified_owner boolean not null default false,
  verification_method text, -- 'dns_txt' | 'meta_tag' | 'manual'
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists advertiser_entities_account_idx
  on public.advertiser_entities (ad_account_id);

-- =====================================================
-- 5. ads_audiences — Saved / Custom / Lookalike / DIVARC special
-- =====================================================
create table if not exists public.ads_audiences (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  name text not null,
  type text not null check (type in (
    'saved','custom_list','custom_pixel','custom_engagement',
    'lookalike','divarc_special'
  )),
  /* Pour saved audiences : la spec de targeting complète. */
  targeting_spec jsonb,
  /* Pour custom_list : count de SHA-256 hashes uploadés + match rate. */
  custom_list_count integer,
  custom_match_count integer,
  custom_match_rate numeric(5,4),
  /* Pour lookalike : audience source + pays cible + taille (1-10%). */
  lookalike_source_id uuid references public.ads_audiences(id) on delete set null,
  lookalike_countries text[],
  lookalike_size_pct integer check (lookalike_size_pct between 1 and 10),
  /* Pour divarc_special : description du segment (jsonb config). */
  divarc_special_config jsonb,
  /* Métadonnées. */
  estimated_size integer, -- mis à jour par cron
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_audiences_account_idx
  on public.ads_audiences (ad_account_id, type);

/* Custom list members (hashes SHA-256 emails/phones — RGPD-friendly).
   On stocke seulement les hashes, jamais le PII en clair. */
create table if not exists public.ads_audience_members (
  audience_id uuid not null references public.ads_audiences(id) on delete cascade,
  /* SHA-256 normalized (email lowercased, phone E.164). */
  identifier_hash text not null,
  identifier_type text not null check (identifier_type in ('email','phone','external_id')),
  /* Si match avec un user DIVARC, on stocke l'id pour activer le
     re-targeting effectif. NULL = pas de match. */
  matched_user_id uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  primary key (audience_id, identifier_hash)
);

create index if not exists ads_audience_members_matched_idx
  on public.ads_audience_members (matched_user_id)
  where matched_user_id is not null;

-- =====================================================
-- 6. ads_campaigns
-- =====================================================
create table if not exists public.ads_campaigns (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  name text not null,
  /* Objectif (catégories DSA). */
  objective text not null check (objective in (
    'brand_awareness','reach','traffic','engagement','app_installs',
    'video_views','lead_generation','messages','event_responses',
    'conversions','catalog_sales','store_traffic',
    'marketplace_listing_boost','job_applications','circle_growth'
  )),
  status text not null default 'draft' check (status in (
    'draft','pending_review','active','paused','completed','rejected'
  )),
  buying_type text not null default 'auction' check (buying_type in ('auction','reservation')),
  /* Budget. */
  daily_budget numeric(10,2),
  lifetime_budget numeric(12,2),
  spend_cap numeric(12,2),
  /* Planning. */
  start_time timestamptz,
  end_time timestamptz,
  /* A/B test. */
  is_split_test boolean not null default false,
  split_test_variant_ids uuid[] not null default array[]::uuid[],
  /* Special ad category (anti-discrimination housing/employment/credit/social). */
  special_ad_category text check (
    special_ad_category in ('housing','employment','credit','social') or special_ad_category is null
  ),
  /* Compliance review. */
  compliance_review_status text not null default 'pending'
    check (compliance_review_status in ('pending','approved','rejected','holding')),
  compliance_notes text,
  /* Audit. */
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_campaigns_account_status_idx
  on public.ads_campaigns (ad_account_id, status);
create index if not exists ads_campaigns_active_idx
  on public.ads_campaigns (status, start_time, end_time)
  where status = 'active';

-- =====================================================
-- 7. ads_ad_sets — Audience + budget + placements
-- =====================================================
create table if not exists public.ads_ad_sets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ads_campaigns(id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  name text not null,
  /* Budget (mutually exclusive avec campaign budget — fallback). */
  daily_budget numeric(10,2),
  lifetime_budget numeric(12,2),
  bid_strategy text not null default 'lowest_cost'
    check (bid_strategy in ('lowest_cost','cost_cap','bid_cap','target_cost')),
  bid_amount numeric(10,4), -- cap ou target selon strategy
  /* Targeting complet (cf TargetingSpec côté code). */
  targeting jsonb not null default '{}'::jsonb,
  /* Placements éligibles. */
  placements text[] not null default array[
    'feed_home','marketplace_feed','jobs_feed','stories'
  ]::text[],
  /* Optimisation. */
  optimization_goal text not null check (optimization_goal in (
    'impressions','reach','link_clicks','landing_page_views',
    'post_engagement','video_views_3s','video_views_15s','thruplay',
    'lead_generation','conversions','app_installs','messages_initiated'
  )),
  billing_event text not null check (billing_event in (
    'impressions','clicks','video_views','app_installs','conversions'
  )),
  pacing_type text not null default 'standard' check (pacing_type in ('standard','no_pacing')),
  /* Frequency cap : ex {"max_impressions": 3, "period_days": 7}. */
  frequency_cap jsonb,
  /* Schedule. */
  start_time timestamptz,
  end_time timestamptz,
  dayparting jsonb, -- {"mon": ["09-18"], "tue": ["09-18"], ...}
  /* Status. */
  status text not null default 'active' check (status in ('active','paused','archived')),
  /* Stats dénormalisées (refresh par cron). */
  total_impressions bigint not null default 0,
  total_clicks bigint not null default 0,
  total_spend numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_ad_sets_campaign_idx on public.ads_ad_sets (campaign_id);
create index if not exists ads_ad_sets_eligible_idx
  on public.ads_ad_sets (status, start_time, end_time)
  where status = 'active';

-- =====================================================
-- 8. ads_creatives — Le visuel publicitaire
-- =====================================================
create table if not exists public.ads_creatives (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  type text not null check (type in (
    'single_image','single_video','carousel','collection','instant_experience'
  )),
  /* Single. */
  media_url text,
  media_thumbnail_url text,
  /* Carousel : array de cards (2-10). */
  carousel_cards jsonb default '[]'::jsonb,
  /* Texte. */
  primary_text text not null,
  headline text not null,
  description text,
  /* CTA. */
  call_to_action text not null default 'learn_more',
  destination_url text,
  deep_link text,
  /* Page DIVARC associée (social proof obligatoire). */
  advertiser_entity_id uuid not null references public.advertiser_entities(id) on delete restrict,
  /* Lead form si objectif lead_gen. */
  lead_form_id uuid,
  /* Hashes des médias pour cache scan modération. */
  media_sha256 text,
  /* Disclaimers ajoutés auto par catégorie. */
  auto_disclaimer text,
  manual_disclaimer text,
  paid_for_by text, -- transparence politique/sociale (DSA art. 39)
  created_at timestamptz not null default now()
);

create index if not exists ads_creatives_account_idx
  on public.ads_creatives (ad_account_id);

-- =====================================================
-- 9. ads_ads — L'ad finale liée à un creative + adset
-- =====================================================
create table if not exists public.ads_ads (
  id uuid primary key default gen_random_uuid(),
  ad_set_id uuid not null references public.ads_ad_sets(id) on delete cascade,
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  campaign_id uuid not null references public.ads_campaigns(id) on delete cascade,
  creative_id uuid not null references public.ads_creatives(id) on delete restrict,
  name text not null,
  /* Tracking. */
  pixel_id uuid,
  utm_params jsonb,
  /* Status. */
  status text not null default 'paused' check (status in ('active','paused','archived','rejected')),
  /* Review modération brand safety. */
  review_status text not null default 'pending' check (review_status in (
    'pending','auto_approved','approved','rejected','limited','re_review'
  )),
  review_feedback text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  /* Quality score (0-10) — historique de perf, feedback négatif, CTR. */
  quality_score numeric(3,1) not null default 5.0 check (quality_score between 0 and 10),
  /* Stats dénormalisées. */
  total_impressions bigint not null default 0,
  total_clicks bigint not null default 0,
  total_spend numeric(12,2) not null default 0,
  /* CTR observée (clicks / impressions) — pour ranker auction. */
  observed_ctr numeric(6,5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_ads_eligible_idx
  on public.ads_ads (status, review_status)
  where status = 'active' and review_status in ('auto_approved','approved');
create index if not exists ads_ads_set_idx on public.ads_ads (ad_set_id);

-- =====================================================
-- 10. ads_pixels — Pixels DIVARC installés sur sites annonceurs
-- =====================================================
create table if not exists public.ads_pixels (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  name text not null,
  /* Token Bearer pour Conversions API server-to-server. */
  api_token text not null unique,
  /* Domaines autorisés (CORS + validation). */
  authorized_domains text[] not null default array[]::text[],
  /* Stats. */
  total_events bigint not null default 0,
  last_event_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ads_pixels_account_idx
  on public.ads_pixels (ad_account_id);

-- =====================================================
-- 11. ads_charges — Facturation (wallet V1, Stripe V4)
-- =====================================================
create table if not exists public.ads_charges (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete restrict,
  amount numeric(12,2) not null,
  currency text not null,
  type text not null check (type in (
    'topup','threshold','monthly','manual','refund','spend'
  )),
  /* Pour V1 wallet : référence vers wallet_transactions. */
  wallet_transaction_id uuid,
  /* Pour V4 Stripe : payment_method, charge_id, invoice_url. */
  stripe_payment_method_id text,
  stripe_charge_id text,
  invoice_url text,
  status text not null default 'pending' check (status in (
    'pending','succeeded','failed','refunded'
  )),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists ads_charges_account_idx
  on public.ads_charges (ad_account_id, created_at desc);

-- =====================================================
-- 12. ad_impressions — Tracking impressions (high-volume)
-- =====================================================
create table if not exists public.ad_impressions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads_ads(id) on delete cascade,
  ad_set_id uuid not null,
  campaign_id uuid not null,
  ad_account_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  /* Anonyme pour anonymes (pas de user_id). */
  session_id text,
  surface text not null,
  position integer,
  /* Auction info. */
  bid_amount numeric(10,4),
  charged_amount numeric(10,4),
  /* Contexte. */
  device_type text,
  locale text,
  country text,
  /* Quality signals — collectés pour mesurer fraude/UX. */
  viewability_pct numeric(5,2), -- % visible
  view_duration_ms integer,
  /* RGPD : IP anonymisée (drop dernier octet) si user non-loggé. */
  client_ip_anon inet,
  client_user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists ad_impressions_ad_idx
  on public.ad_impressions (ad_id, created_at desc);
create index if not exists ad_impressions_user_idx
  on public.ad_impressions (user_id, created_at desc)
  where user_id is not null;
create index if not exists ad_impressions_freq_cap_idx
  on public.ad_impressions (user_id, ad_id, created_at desc)
  where user_id is not null;

-- =====================================================
-- 13. ad_clicks
-- =====================================================
create table if not exists public.ad_clicks (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads_ads(id) on delete cascade,
  ad_set_id uuid not null,
  campaign_id uuid not null,
  ad_account_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  surface text,
  /* Lien direct vers impression source pour attribution last-click. */
  source_impression_id uuid,
  destination_url text,
  /* Anti-fraud : score 0-1. >0.7 = suspect → exclu de la facturation. */
  fraud_score numeric(4,3) not null default 0,
  is_invalid boolean not null default false,
  invalid_reason text,
  client_ip_anon inet,
  client_user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists ad_clicks_ad_idx
  on public.ad_clicks (ad_id, created_at desc);
create index if not exists ad_clicks_user_idx
  on public.ad_clicks (user_id, created_at desc)
  where user_id is not null;

-- =====================================================
-- 14. ad_conversions — Pixel + Conversions API events
-- =====================================================
create table if not exists public.ad_conversions (
  id uuid primary key default gen_random_uuid(),
  pixel_id uuid not null references public.ads_pixels(id) on delete cascade,
  ad_account_id uuid not null,
  /* event_id pour dédoublonnage Pixel × Conversions API. */
  event_id text not null,
  event_name text not null,
  event_time timestamptz not null,
  event_source text not null check (event_source in ('pixel','conversions_api','both')),
  /* Attribution — résolue par pipeline async. */
  attributed_ad_id uuid references public.ads_ads(id) on delete set null,
  attributed_click_id uuid references public.ad_clicks(id) on delete set null,
  attribution_model text, -- last_click | first_click | linear | time_decay | position_based
  attribution_window_days integer,
  /* User data (PII hashed côté client). */
  user_data jsonb, -- {em: [hash], ph: [hash], external_id: [...]}
  user_id uuid references public.profiles(id) on delete set null,
  /* Custom data : value, currency, content_ids, etc. */
  custom_data jsonb,
  client_ip_anon inet,
  /* Anti-fraud. */
  fraud_score numeric(4,3) not null default 0,
  is_invalid boolean not null default false,
  created_at timestamptz not null default now(),
  unique (pixel_id, event_id)
);

create index if not exists ad_conversions_event_idx
  on public.ad_conversions (event_name, event_time desc);
create index if not exists ad_conversions_attribution_idx
  on public.ad_conversions (attributed_ad_id) where attributed_ad_id is not null;

-- =====================================================
-- 15. ad_frequency_caps — Rolling window par user/ad
-- =====================================================
/* On utilise ad_impressions avec un index dédié pour le freq cap.
   Pas de table séparée pour éviter la dénormalisation. */

-- =====================================================
-- 16. ads_library_entries — DSA art. 39 (1 an conservation)
-- =====================================================
create table if not exists public.ads_library_entries (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references public.ads_ads(id) on delete set null,
  /* Snapshot au moment de la première diffusion. */
  ad_account_id uuid not null,
  business_name text not null,
  business_id uuid,
  campaign_objective text,
  creative_snapshot jsonb not null, -- {type, media_url, primary_text, headline, ...}
  /* Targeting anonymisé pour transparence (jamais le détail individuel). */
  targeting_summary jsonb not null, -- {age_range, genders, countries, interests_categories}
  placements text[] not null,
  paid_for_by text,
  /* Période de diffusion. */
  first_served_at timestamptz not null,
  last_served_at timestamptz,
  is_active boolean not null default true,
  /* Stats anonymisées en ranges (DSA art. 39 — pas de chiffres exacts). */
  impressions_range text, -- "1K-5K" | "10K-50K" | etc.
  spend_range text,        -- "100€-500€" | etc.
  /* Conservation 1 an post-fin de diffusion (art. 39). */
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ads_library_active_idx
  on public.ads_library_entries (is_active, first_served_at desc)
  where is_active = true;
create index if not exists ads_library_business_idx
  on public.ads_library_entries (business_name, first_served_at desc);

-- =====================================================
-- 17. user_ad_preferences — Settings privacy/ads par user
-- =====================================================
create table if not exists public.user_ad_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  /* Toggles RGPD/ePrivacy (case non pré-cochée par défaut). */
  personalized_ads_consent boolean not null default false,
  behavioral_data_consent boolean not null default false,
  location_data_consent boolean not null default false,
  /* Catégories d'annonceurs masquées (alcool, jeux, finance, etc.). */
  blocked_categories text[] not null default array[]::text[],
  /* Annonceurs spécifiquement masqués (par business_account_id). */
  blocked_advertisers uuid[] not null default array[]::uuid[],
  /* Intérêts retirés manuellement du profil pub. */
  removed_interests text[] not null default array[]::text[],
  /* Audit. */
  consent_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 18. ad_reports — Signalements d'ads par les users (DSA)
-- =====================================================
/* On réutilise moderation_reports avec target_type='ad' (à ajouter dans
   la migration 0046 — extension future). Pour V1, on a une table
   dédiée pour découpler. */
create table if not exists public.ad_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  /* L'ad signalée — référence soit l'ad live, soit la library entry. */
  ad_id uuid references public.ads_ads(id) on delete set null,
  ads_library_entry_id uuid references public.ads_library_entries(id) on delete set null,
  category text not null check (category in (
    'misleading','illegal','offensive','political_undisclosed',
    'targeting_minors','sensitive_data','spam','other'
  )),
  description text check (length(description) <= 1000),
  status text not null default 'pending' check (status in (
    'pending','reviewed','actioned','dismissed'
  )),
  created_at timestamptz not null default now()
);

create index if not exists ad_reports_status_idx
  on public.ad_reports (status, created_at);

-- =====================================================
-- RLS Policies — multi-tenant strict
-- =====================================================
alter table public.ads_business_accounts enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.ad_account_users enable row level security;
alter table public.advertiser_entities enable row level security;
alter table public.ads_audiences enable row level security;
alter table public.ads_audience_members enable row level security;
alter table public.ads_campaigns enable row level security;
alter table public.ads_ad_sets enable row level security;
alter table public.ads_creatives enable row level security;
alter table public.ads_ads enable row level security;
alter table public.ads_pixels enable row level security;
alter table public.ads_charges enable row level security;
alter table public.ad_impressions enable row level security;
alter table public.ad_clicks enable row level security;
alter table public.ad_conversions enable row level security;
alter table public.ads_library_entries enable row level security;
alter table public.user_ad_preferences enable row level security;
alter table public.ad_reports enable row level security;

/* business_accounts : primary contact ou is_admin lit/écrit. */
drop policy if exists "ads_business_select" on public.ads_business_accounts;
create policy "ads_business_select" on public.ads_business_accounts
  for select using (
    primary_contact_user_id = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists "ads_business_insert" on public.ads_business_accounts;
create policy "ads_business_insert" on public.ads_business_accounts
  for insert with check (primary_contact_user_id = auth.uid());

drop policy if exists "ads_business_update_self" on public.ads_business_accounts;
create policy "ads_business_update_self" on public.ads_business_accounts
  for update using (primary_contact_user_id = auth.uid())
  with check (primary_contact_user_id = auth.uid());

/* ad_accounts : accessible aux ad_account_users, lecture admin. */
drop policy if exists "ad_accounts_select" on public.ad_accounts;
create policy "ad_accounts_select" on public.ad_accounts
  for select using (
    public.user_has_ad_account_role(id, 'analyst')
    or public.current_user_is_admin()
  );

drop policy if exists "ad_accounts_update" on public.ad_accounts;
create policy "ad_accounts_update" on public.ad_accounts
  for update using (public.user_has_ad_account_role(id, 'admin'))
  with check (public.user_has_ad_account_role(id, 'admin'));

drop policy if exists "ad_accounts_insert" on public.ad_accounts;
create policy "ad_accounts_insert" on public.ad_accounts
  for insert with check (
    /* Le user créant l'ad_account doit être primary_contact du business_account. */
    exists (
      select 1 from public.ads_business_accounts
      where id = business_account_id
        and primary_contact_user_id = auth.uid()
    )
  );

/* ad_account_users : un user voit ses propres rôles + admin du compte
   peut tout voir/écrire. */
drop policy if exists "ad_account_users_select" on public.ad_account_users;
create policy "ad_account_users_select" on public.ad_account_users
  for select using (
    user_id = auth.uid()
    or public.user_has_ad_account_role(ad_account_id, 'admin')
    or public.current_user_is_admin()
  );

drop policy if exists "ad_account_users_admin_write" on public.ad_account_users;
create policy "ad_account_users_admin_write" on public.ad_account_users
  for all using (public.user_has_ad_account_role(ad_account_id, 'admin'))
  with check (public.user_has_ad_account_role(ad_account_id, 'admin'));

/* Tables liées (advertiser_entities, audiences, campaigns, ad_sets,
   creatives, ads, pixels, charges) : accès via ad_account_id role check.
   Lecture analyst+, écriture editor+ (sauf charges = finance ou admin). */
drop policy if exists "advertiser_entities_select" on public.advertiser_entities;
create policy "advertiser_entities_select" on public.advertiser_entities
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));

drop policy if exists "advertiser_entities_write" on public.advertiser_entities;
create policy "advertiser_entities_write" on public.advertiser_entities
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

drop policy if exists "audiences_select" on public.ads_audiences;
create policy "audiences_select" on public.ads_audiences
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "audiences_write" on public.ads_audiences;
create policy "audiences_write" on public.ads_audiences
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

drop policy if exists "audience_members_owner" on public.ads_audience_members;
create policy "audience_members_owner" on public.ads_audience_members
  for all using (
    exists (
      select 1 from public.ads_audiences a
      where a.id = audience_id
        and public.user_has_ad_account_role(a.ad_account_id, 'editor')
    )
  );

drop policy if exists "campaigns_select" on public.ads_campaigns;
create policy "campaigns_select" on public.ads_campaigns
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "campaigns_write" on public.ads_campaigns;
create policy "campaigns_write" on public.ads_campaigns
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

drop policy if exists "ad_sets_select" on public.ads_ad_sets;
create policy "ad_sets_select" on public.ads_ad_sets
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "ad_sets_write" on public.ads_ad_sets;
create policy "ad_sets_write" on public.ads_ad_sets
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

drop policy if exists "creatives_select" on public.ads_creatives;
create policy "creatives_select" on public.ads_creatives
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "creatives_write" on public.ads_creatives;
create policy "creatives_write" on public.ads_creatives
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

drop policy if exists "ads_select" on public.ads_ads;
create policy "ads_select" on public.ads_ads
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "ads_write" on public.ads_ads;
create policy "ads_write" on public.ads_ads
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

drop policy if exists "pixels_select" on public.ads_pixels;
create policy "pixels_select" on public.ads_pixels
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "pixels_write" on public.ads_pixels;
create policy "pixels_write" on public.ads_pixels
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

drop policy if exists "charges_select" on public.ads_charges;
create policy "charges_select" on public.ads_charges
  for select using (public.user_has_ad_account_role(ad_account_id, 'finance'));

/* Impressions/clicks/conversions : RLS ferme (service_role écrit, analyst+
   lit pour reporting). */
drop policy if exists "impressions_select" on public.ad_impressions;
create policy "impressions_select" on public.ad_impressions
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "clicks_select" on public.ad_clicks;
create policy "clicks_select" on public.ad_clicks
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));
drop policy if exists "conversions_select" on public.ad_conversions;
create policy "conversions_select" on public.ad_conversions
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));

/* Ads library : lecture publique (DSA art. 39). */
drop policy if exists "ads_library_public_select" on public.ads_library_entries;
create policy "ads_library_public_select" on public.ads_library_entries
  for select using (true);

/* user_ad_preferences : self-only. */
drop policy if exists "user_ad_prefs_self" on public.user_ad_preferences;
create policy "user_ad_prefs_self" on public.user_ad_preferences
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

/* ad_reports : reporter voit ses reports, admin voit tout. */
drop policy if exists "ad_reports_self_or_admin" on public.ad_reports;
create policy "ad_reports_self_or_admin" on public.ad_reports
  for select using (
    reporter_id = auth.uid() or public.current_user_is_admin()
  );
drop policy if exists "ad_reports_insert_self" on public.ad_reports;
create policy "ad_reports_insert_self" on public.ad_reports
  for insert with check (reporter_id = auth.uid());

-- =====================================================
-- Comments
-- =====================================================
comment on table public.ads_business_accounts is
  'Raison sociale annonceur (KYB Stripe/manuel). Conformité B2B et facturation.';
comment on table public.ad_accounts is
  'Compte publicitaire (un par marque/produit). Multi-currency, multi-user via ad_account_users.';
comment on table public.ads_library_entries is
  'Snapshot DSA art. 39 — toute ad diffusée doit y figurer pendant 1 an post-fin.';
comment on table public.user_ad_preferences is
  'Préférences user RGPD/ePrivacy : consent personnalisation/behavioral/location, opt-out catégories/annonceurs.';
