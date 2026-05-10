-- =====================================================
-- DIVARC — Migration 0050 : Ads Manager avancé (Smart + Expert)
--
-- Refonte vers niveau Google Ads + Meta Ads Manager combinés.
-- Cf prompt mission "Refonte complète DIVARC Ads".
--
-- 9 nouvelles tables :
--   ads_website_analyses          — cache analyses URL (TTL 30j)
--   ads_keyword_research           — cache DataForSEO (TTL 90j, partagé)
--   ads_lead_forms                 — formulaires natifs in-app
--   ads_lead_form_responses        — réponses utilisateurs (PII)
--   ads_dynamic_creative_variants  — variations multi-creative
--   ads_custom_conversions         — filtrage events sans code
--   ads_offline_conversions        — uploads CSV (match async)
--   ads_recommendations            — recos IA permanentes
--   ads_smart_audience_segments    — personas auto IA
--
-- 18+ colonnes ajoutées sur ads_campaigns / ads_ad_sets / ads_creatives
-- / ads_ads / ads_pixels.
--
-- RLS strict :
--   - analyst+ pour reads (sauf keyword_research = public cache)
--   - editor+ pour writes
--   - finance+ pour les tables PII (responses, offline_conversions)
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1. ads_website_analyses — cache du Website Analyzer
-- =====================================================
create table if not exists public.ads_website_analyses (
  id uuid primary key default gen_random_uuid(),
  /* Pour partage cross-comptes (un même site analysé par plusieurs
     annonceurs réutilise le cache). NULL si analyse "privée" gardée
     pour un seul ad_account. */
  ad_account_id uuid references public.ad_accounts(id) on delete set null,
  /* URL normalisée (lowercase, trailing slash retiré, query strings
     triées). Sert de clé cache. */
  url_normalized text not null,
  url_original text not null,
  /* Statut du pipeline. */
  status text not null default 'pending' check (status in (
    'pending','crawling','analyzing','completed','failed'
  )),
  error_message text,
  /* Résultat structuré complet (cf WebsiteAnalysisResponse côté code). */
  analysis_result jsonb,
  /* Métadonnées rapides pour requêtes sans déserialiser le jsonb. */
  business_name text,
  business_category text[],
  primary_objective text,
  /* Performance metrics. */
  pages_crawled integer not null default 0,
  llm_tokens_used integer not null default 0,
  cost_cents numeric(8,2) not null default 0,
  duration_ms integer,
  /* Cache TTL : 30 jours par défaut. */
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  /* Audit. */
  requested_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists ads_website_analyses_url_uniq
  on public.ads_website_analyses (url_normalized)
  where status = 'completed' and expires_at > now();

create index if not exists ads_website_analyses_account_idx
  on public.ads_website_analyses (ad_account_id, created_at desc)
  where ad_account_id is not null;

create index if not exists ads_website_analyses_expires_idx
  on public.ads_website_analyses (expires_at)
  where status = 'completed';

-- =====================================================
-- 2. ads_keyword_research — cache DataForSEO (partagé global)
-- =====================================================
create table if not exists public.ads_keyword_research (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  country text not null check (length(country) = 2), -- ISO 3166-1
  language text not null check (length(language) = 2),
  /* Volume mensuel approximatif. */
  search_volume integer,
  /* Compétition 0-100 (DataForSEO scale). */
  competition_index numeric(5,2),
  competition_level text check (competition_level in ('low','medium','high')),
  /* CPC moyen estimé top of page (€). */
  cpc_estimate numeric(8,4),
  /* Tendance 12 derniers mois — array de 12 valeurs 0-100. */
  trend_12m numeric(5,2)[],
  /* Intent classification. */
  intent text check (intent in ('informational','commercial','transactional','navigational','mixed')),
  /* Centres d'intérêt DIVARC associés (taxonomie topics). */
  related_topics text[],
  /* Synonymes + variantes. */
  related_keywords text[],
  /* Cache 90 jours par défaut (les volumes bougent peu). */
  expires_at timestamptz not null default (now() + interval '90 days'),
  fetched_at timestamptz not null default now(),
  /* Source (datafortseo / google_trends / divarc_internal). */
  data_source text not null default 'dataforseo'
);

create unique index if not exists ads_keyword_research_uniq
  on public.ads_keyword_research (keyword, country, language)
  where expires_at > now();
create index if not exists ads_keyword_research_volume_idx
  on public.ads_keyword_research (country, language, search_volume desc nulls last);

-- =====================================================
-- 3. ads_lead_forms — formulaires natifs in-app
-- =====================================================
create table if not exists public.ads_lead_forms (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  name text not null,
  /* Type : more_volume = court (1 step) / higher_intent = avec confirmation. */
  form_type text not null default 'more_volume' check (form_type in ('more_volume','higher_intent')),
  /* Intro screen. */
  intro_image_url text,
  intro_title text not null,
  intro_description text,
  /* Questions JSON :
     [
       { id, type: 'short_answer'|'multiple_choice'|'email'|'phone'|'consent',
         label, required, options?: [], conditional_logic?: {...} }
     ]
     Champs pré-remplis (email, phone, name) tirés du profile DIVARC user.
  */
  questions jsonb not null default '[]'::jsonb,
  /* Politique de confidentialité (URL obligatoire DSA + RGPD). */
  privacy_policy_url text not null,
  consent_text text not null default 'En soumettant ce formulaire, j''accepte que mes informations soient transmises à l''annonceur.',
  /* Thank you screen. */
  thankyou_title text not null default 'Merci !',
  thankyou_description text,
  thankyou_cta_label text,
  thankyou_cta_url text,
  /* Webhook ou intégration CRM. */
  webhook_url text,
  webhook_secret text, -- HMAC pour vérification côté CRM
  /* CRM integration future : hubspot/salesforce/mailchimp/custom. */
  crm_integration text,
  crm_config jsonb,
  /* Status. */
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_lead_forms_account_idx
  on public.ads_lead_forms (ad_account_id, is_active);

-- =====================================================
-- 4. ads_lead_form_responses — réponses (PII, finance+ access)
-- =====================================================
create table if not exists public.ads_lead_form_responses (
  id uuid primary key default gen_random_uuid(),
  lead_form_id uuid not null references public.ads_lead_forms(id) on delete cascade,
  ad_account_id uuid not null,
  /* Attribution à l'ad qui a généré le lead. */
  ad_id uuid references public.ads_ads(id) on delete set null,
  campaign_id uuid references public.ads_campaigns(id) on delete set null,
  /* User DIVARC ayant rempli (peut être null si formulaire anonyme,
     mais en pratique on impose login DIVARC). */
  user_id uuid references public.profiles(id) on delete set null,
  /* Réponses : { question_id: answer }. */
  answers jsonb not null,
  /* Tracking. */
  client_ip_anon inet,
  user_agent text,
  /* CRM sync status. */
  webhook_delivered_at timestamptz,
  webhook_response_code integer,
  webhook_attempts integer not null default 0,
  /* Audit. */
  submitted_at timestamptz not null default now()
);

create index if not exists ads_lead_form_responses_form_idx
  on public.ads_lead_form_responses (lead_form_id, submitted_at desc);
create index if not exists ads_lead_form_responses_ad_idx
  on public.ads_lead_form_responses (ad_id) where ad_id is not null;
create index if not exists ads_lead_form_responses_webhook_idx
  on public.ads_lead_form_responses (webhook_delivered_at)
  where webhook_delivered_at is null;

-- =====================================================
-- 5. ads_dynamic_creative_variants — variations multi-creative
-- =====================================================
create table if not exists public.ads_dynamic_creative_variants (
  id uuid primary key default gen_random_uuid(),
  /* Lié au creative parent (qui a dynamic_creative_enabled=true). */
  parent_creative_id uuid not null references public.ads_creatives(id) on delete cascade,
  /* Type de variant : permet jusqu'à 10 médias × 5 textes × 5 headlines × 5 descriptions × 5 CTAs. */
  variant_type text not null check (variant_type in (
    'media','primary_text','headline','description','cta'
  )),
  /* Contenu selon le type. */
  media_url text,
  media_thumbnail_url text,
  text_value text,
  cta_value text,
  /* Position dans le set de variants (0-N). */
  position integer not null default 0,
  /* Performance dénormalisée (pour favoriser les meilleures combinaisons). */
  total_impressions bigint not null default 0,
  total_clicks bigint not null default 0,
  total_conversions bigint not null default 0,
  /* Score ML — recalculé par cron quotidien. */
  performance_score numeric(5,4),
  is_winner boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ads_dynamic_variants_parent_idx
  on public.ads_dynamic_creative_variants (parent_creative_id, variant_type, position);

-- =====================================================
-- 6. ads_custom_conversions — filtrage events sans modifier le pixel
-- =====================================================
create table if not exists public.ads_custom_conversions (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  name text not null,
  description text,
  /* Filtre :
     {
       event_name: 'PageView' | 'Purchase' | ...,
       url_pattern: 'contains' | 'equals' | 'starts_with' | 'regex',
       url_value: '/merci',
       value_min?: 50, value_max?: ...,
       custom_data_filters?: { content_type: 'product', ... }
     }
  */
  filter_spec jsonb not null,
  /* Catégorie standard pour grouper (Lead, Purchase, Engagement...). */
  category text not null check (category in (
    'add_to_cart','add_to_wishlist','complete_registration','contact',
    'customize_product','donate','find_location','initiate_checkout',
    'lead','purchase','schedule','search','start_trial','submit_application',
    'subscribe','view_content','other'
  )),
  /* Valeur de conversion attribuée par défaut (si custom_data.value absente). */
  default_value numeric(10,2),
  default_currency text default 'EUR',
  /* Stats dénormalisées. */
  total_count bigint not null default 0,
  total_value numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ads_custom_conversions_account_idx
  on public.ads_custom_conversions (ad_account_id, is_active);

-- =====================================================
-- 7. ads_offline_conversions — uploads CSV (match async)
-- =====================================================
create table if not exists public.ads_offline_conversions (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  /* Batch d'upload — utile pour grouper et débugger. */
  batch_id uuid not null,
  event_name text not null,
  event_time timestamptz not null,
  /* PII hashed SHA-256 côté client (ou serveur si CRM). */
  hashed_email text,
  hashed_phone text,
  external_id text,
  /* Match status — calculé par cron. */
  match_status text not null default 'pending' check (match_status in (
    'pending','matched','unmatched','duplicate'
  )),
  matched_user_id uuid references public.profiles(id) on delete set null,
  /* Attribution rétroactive. */
  attributed_ad_id uuid references public.ads_ads(id) on delete set null,
  attributed_click_id uuid references public.ad_clicks(id) on delete set null,
  attribution_model text,
  /* Custom data (value, currency, content_ids, ...). */
  custom_data jsonb,
  /* Audit. */
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  matched_at timestamptz
);

create index if not exists ads_offline_conv_batch_idx
  on public.ads_offline_conversions (batch_id);
create index if not exists ads_offline_conv_match_idx
  on public.ads_offline_conversions (match_status, uploaded_at)
  where match_status = 'pending';
create index if not exists ads_offline_conv_attribution_idx
  on public.ads_offline_conversions (attributed_ad_id)
  where attributed_ad_id is not null;

-- =====================================================
-- 8. ads_recommendations — recos IA permanentes
-- =====================================================
create table if not exists public.ads_recommendations (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts(id) on delete cascade,
  /* Type d'action recommandée. */
  type text not null check (type in (
    'budget_increase','budget_decrease','audience_expand',
    'audience_create_lookalike','creative_refresh','creative_pause_fatigue',
    'placement_optimize','bid_adjustment','keyword_add','keyword_remove',
    'campaign_pause','schedule_optimize','seasonal_opportunity'
  )),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  /* Contenu user-facing. */
  title text not null,
  description text not null,
  /* Action one-click :
     {
       type: 'increase_budget' | 'create_lookalike' | 'pause_ad' | ...,
       target_type: 'campaign' | 'ad_set' | 'ad' | 'audience',
       target_id: uuid,
       params: { ... }
     }
  */
  action_payload jsonb,
  /* Impact estimé : { metric: 'conversions', delta: '+25/sem', confidence: 'high' }. */
  estimated_impact jsonb,
  /* Lifecycle. */
  status text not null default 'pending' check (status in (
    'pending','applied','dismissed','expired'
  )),
  applied_at timestamptz,
  applied_by uuid references public.profiles(id) on delete set null,
  dismissed_at timestamptz,
  dismissed_by uuid references public.profiles(id) on delete set null,
  /* Expire automatiquement après 7j si pas traité. */
  expires_at timestamptz not null default (now() + interval '7 days'),
  generated_at timestamptz not null default now(),
  /* Référence vers la version du modèle qui a généré (pour audit ML). */
  model_version text not null default 'v1'
);

create index if not exists ads_recommendations_account_status_idx
  on public.ads_recommendations (ad_account_id, status, severity desc);
create index if not exists ads_recommendations_expires_idx
  on public.ads_recommendations (expires_at)
  where status = 'pending';

-- =====================================================
-- 9. ads_smart_audience_segments — personas auto IA (Smart Mode)
-- =====================================================
create table if not exists public.ads_smart_audience_segments (
  id uuid primary key default gen_random_uuid(),
  /* Lié à l'analyse de site qui a généré ces segments. */
  website_analysis_id uuid references public.ads_website_analyses(id) on delete cascade,
  ad_account_id uuid references public.ad_accounts(id) on delete cascade,
  /* Persona name : "Jeunes pros tech 25-34 Paris". */
  persona_name text not null,
  persona_description text,
  /* Targeting spec auto-générée. */
  targeting_spec jsonb not null,
  /* Estimation reach (calculée à la création). */
  estimated_size integer,
  /* Estimation cost-per-result. */
  estimated_cpa_min numeric(8,2),
  estimated_cpa_max numeric(8,2),
  /* Ranking IA (le N°1 est en haut). */
  ai_ranking integer not null default 0,
  /* Confidence du modèle IA. */
  confidence_score numeric(4,3),
  created_at timestamptz not null default now()
);

create index if not exists ads_smart_segments_analysis_idx
  on public.ads_smart_audience_segments (website_analysis_id, ai_ranking)
  where website_analysis_id is not null;

-- =====================================================
-- COLONNES AJOUTÉES sur tables existantes
-- =====================================================

/* ads_campaigns : attribution, target ROAS, mode Smart, lien analyse. */
alter table public.ads_campaigns
  add column if not exists attribution_setting text default 'last_click_7d'
    check (attribution_setting in (
      'last_click_7d','last_click_1d','linear_7d','linear_28d',
      'position_based_7d','time_decay_7d','data_driven','view_through_1d'
    )),
  add column if not exists target_roas numeric(8,4),
  add column if not exists is_smart_campaign boolean not null default false,
  add column if not exists website_analysis_id uuid references public.ads_website_analyses(id) on delete set null;

/* ads_ad_sets : windows attribution, budget mode, costs caps, audience riche. */
alter table public.ads_ad_sets
  add column if not exists attribution_window_click_days integer default 7
    check (attribution_window_click_days in (1, 7, 28)),
  add column if not exists attribution_window_view_days integer default 1
    check (attribution_window_view_days in (1, 7)),
  add column if not exists budget_optimization_mode text default 'abo'
    check (budget_optimization_mode in ('cbo', 'abo')),
  add column if not exists cost_cap numeric(10,4),
  add column if not exists bid_cap numeric(10,4),
  add column if not exists minimum_roas numeric(8,4),
  add column if not exists delivery_type text default 'standard'
    check (delivery_type in ('standard', 'accelerated')),
  /* Audience riche (cf brief panels A-G). */
  add column if not exists audience_behaviors jsonb default '{}'::jsonb,
  add column if not exists audience_connections jsonb default '{}'::jsonb,
  add column if not exists audience_locations_advanced jsonb default '{}'::jsonb;

/* ads_creatives : dynamic, lead form, brand safety, UTM, deep link. */
alter table public.ads_creatives
  add column if not exists dynamic_creative_enabled boolean not null default false,
  add column if not exists lead_form_id uuid references public.ads_lead_forms(id) on delete set null,
  add column if not exists text_overlay_pct numeric(5,2),
  add column if not exists brand_safety_filter text default 'standard'
    check (brand_safety_filter in ('standard', 'limited', 'expanded')),
  add column if not exists deep_link_mobile text,
  add column if not exists utm_params jsonb default '{}'::jsonb,
  add column if not exists display_url text;

/* ads_ads : marqueur winner pour les variants dynamic creative. */
alter table public.ads_ads
  add column if not exists is_dynamic_winner boolean not null default false;

/* ads_pixels : last test du Pixel Helper. */
alter table public.ads_pixels
  add column if not exists last_helper_test_at timestamptz;

-- =====================================================
-- RPC : normalize_url — clé cache pour Website Analyzer
-- =====================================================
create or replace function public.normalize_url(p_url text)
returns text
language plpgsql immutable parallel safe as $$
declare
  v text;
begin
  /* Lowercase host, strip www., strip trailing slash, strip fragment.
     V1 simple — V2 trier les query params alphabétiquement. */
  v := lower(trim(p_url));
  v := regexp_replace(v, '^https?://', 'https://', 'i');
  v := regexp_replace(v, '^https?://www\.', 'https://', 'i');
  v := regexp_replace(v, '#.*$', ''); -- strip fragment
  v := regexp_replace(v, '/+$', ''); -- strip trailing slashes
  return v;
end;
$$;

revoke all on function public.normalize_url(text) from public;
grant execute on function public.normalize_url(text)
  to authenticated, service_role;

-- =====================================================
-- RPC : apply_recommendation — applique une reco en 1 clic (V11)
-- =====================================================
create or replace function public.apply_recommendation(
  p_recommendation_id uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_rec record;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_rec
  from public.ads_recommendations
  where id = p_recommendation_id;
  if not found then
    raise exception 'Recommendation not found';
  end if;
  if v_rec.status <> 'pending' then
    raise exception 'Recommendation already %', v_rec.status;
  end if;

  /* Vérification droit editor sur l'ad_account de la reco. */
  if not public.user_has_ad_account_role(v_rec.ad_account_id, 'editor') then
    raise exception 'Permission denied';
  end if;

  /* L'application réelle est faite côté API (TypeScript) qui décode
     action_payload et exécute le bon update. Ici on marque juste la
     reco comme appliquée. */
  update public.ads_recommendations
  set status = 'applied',
      applied_at = now(),
      applied_by = v_user_id
  where id = p_recommendation_id;

  return true;
end;
$$;

revoke all on function public.apply_recommendation(uuid) from public;
grant execute on function public.apply_recommendation(uuid)
  to authenticated, service_role;

-- =====================================================
-- RPC : dismiss_recommendation
-- =====================================================
create or replace function public.dismiss_recommendation(
  p_recommendation_id uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_rec record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_rec
  from public.ads_recommendations
  where id = p_recommendation_id;
  if not found then
    raise exception 'Recommendation not found';
  end if;

  if not public.user_has_ad_account_role(v_rec.ad_account_id, 'analyst') then
    raise exception 'Permission denied';
  end if;

  update public.ads_recommendations
  set status = 'dismissed',
      dismissed_at = now(),
      dismissed_by = v_user_id
  where id = p_recommendation_id;

  return true;
end;
$$;

revoke all on function public.dismiss_recommendation(uuid) from public;
grant execute on function public.dismiss_recommendation(uuid)
  to authenticated, service_role;

-- =====================================================
-- RLS Policies
-- =====================================================
alter table public.ads_website_analyses enable row level security;
alter table public.ads_keyword_research enable row level security;
alter table public.ads_lead_forms enable row level security;
alter table public.ads_lead_form_responses enable row level security;
alter table public.ads_dynamic_creative_variants enable row level security;
alter table public.ads_custom_conversions enable row level security;
alter table public.ads_offline_conversions enable row level security;
alter table public.ads_recommendations enable row level security;
alter table public.ads_smart_audience_segments enable row level security;

/* website_analyses : analyst+ sur ad_account (ou public si ad_account_id null). */
drop policy if exists "website_analyses_select" on public.ads_website_analyses;
create policy "website_analyses_select" on public.ads_website_analyses
  for select using (
    ad_account_id is null
    or public.user_has_ad_account_role(ad_account_id, 'analyst')
    or public.current_user_is_admin()
  );

/* keyword_research : public read (cache partagé entre tous les annonceurs). */
drop policy if exists "keyword_research_public_select" on public.ads_keyword_research;
create policy "keyword_research_public_select" on public.ads_keyword_research
  for select using (true);

/* lead_forms : analyst+ pour read, editor+ pour write. */
drop policy if exists "lead_forms_select" on public.ads_lead_forms;
create policy "lead_forms_select" on public.ads_lead_forms
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));

drop policy if exists "lead_forms_write" on public.ads_lead_forms;
create policy "lead_forms_write" on public.ads_lead_forms
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

/* lead_form_responses : finance+ uniquement (PII). */
drop policy if exists "lead_form_responses_finance_only" on public.ads_lead_form_responses;
create policy "lead_form_responses_finance_only" on public.ads_lead_form_responses
  for select using (public.user_has_ad_account_role(ad_account_id, 'finance'));

/* dynamic_creative_variants : analyst+ via creative parent → ad_account. */
drop policy if exists "dynamic_variants_select" on public.ads_dynamic_creative_variants;
create policy "dynamic_variants_select" on public.ads_dynamic_creative_variants
  for select using (
    exists (
      select 1 from public.ads_creatives c
      where c.id = parent_creative_id
        and public.user_has_ad_account_role(c.ad_account_id, 'analyst')
    )
  );

/* custom_conversions : analyst+ read, editor+ write. */
drop policy if exists "custom_conversions_select" on public.ads_custom_conversions;
create policy "custom_conversions_select" on public.ads_custom_conversions
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));

drop policy if exists "custom_conversions_write" on public.ads_custom_conversions;
create policy "custom_conversions_write" on public.ads_custom_conversions
  for all using (public.user_has_ad_account_role(ad_account_id, 'editor'))
  with check (public.user_has_ad_account_role(ad_account_id, 'editor'));

/* offline_conversions : finance+ uniquement (PII hashes). */
drop policy if exists "offline_conv_finance_only" on public.ads_offline_conversions;
create policy "offline_conv_finance_only" on public.ads_offline_conversions
  for select using (public.user_has_ad_account_role(ad_account_id, 'finance'));

/* recommendations : analyst+ read, editor+ apply. */
drop policy if exists "recommendations_select" on public.ads_recommendations;
create policy "recommendations_select" on public.ads_recommendations
  for select using (public.user_has_ad_account_role(ad_account_id, 'analyst'));

/* smart_audience_segments : analyst+ via ad_account. */
drop policy if exists "smart_segments_select" on public.ads_smart_audience_segments;
create policy "smart_segments_select" on public.ads_smart_audience_segments
  for select using (
    ad_account_id is null
    or public.user_has_ad_account_role(ad_account_id, 'analyst')
  );

-- =====================================================
-- Comments doc
-- =====================================================
comment on table public.ads_website_analyses is
  'Cache du Website Analyzer. TTL 30j sur url_normalized. Stocke résultat complet jsonb + métadonnées rapides.';
comment on table public.ads_keyword_research is
  'Cache DataForSEO partagé entre tous les annonceurs (économie d''API calls). TTL 90j.';
comment on table public.ads_lead_forms is
  'Formulaires natifs in-app (DSA art. 16 — collecte de leads conforme RGPD avec consent_text obligatoire).';
comment on table public.ads_lead_form_responses is
  'Réponses lead forms — PII : RLS finance+ uniquement.';
comment on table public.ads_offline_conversions is
  'Conversions offline uploadées en CSV. Match async via cron sur hashed_email/phone. PII : RLS finance+.';
comment on table public.ads_recommendations is
  'Recommandations IA générées en continu par worker async. Lifecycle pending → applied/dismissed/expired (7j TTL).';
