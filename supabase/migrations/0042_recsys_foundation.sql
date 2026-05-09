-- =====================================================
-- DIVARC — Migration 0042 : Foundations système de recommandation
--
-- Architecture V1 lite (validée par user via AskUserQuestion) :
--  - Stack 100% Next.js + Supabase (pas de Python, pas de Redis)
--  - pgvector activé pour préparer V2 sémantique
--  - 3 tables : events (log brut), user_interest_profiles (vecteur +
--    affinités JSONB), user_algorithm_settings (RGPD/DSA toggles)
--
-- Compliance :
--  - Consentement granulaire par défaut OFF (RGPD art. 7)
--  - Mode chronologique disponible (DSA art. 38, en pratique exempt
--    pour DIVARC <45M MAU mais on l'implémente pour conformité future)
--  - Rétention events 13 mois max via cleanup job
-- =====================================================

create extension if not exists vector;
create extension if not exists pg_trgm;

-- =====================================================
-- 1. events — log brut des interactions utilisateur
-- =====================================================
create type public.event_surface as enum (
  'feed_home',
  'feed_circle',
  'reels',
  'discover',
  'marketplace',
  'jobs',
  'profile',
  'search',
  'notif',
  'story',
  'message'
);

create table if not exists public.recsys_events (
  /* event_id généré côté client (UUID v4) pour idempotence et dédup. */
  event_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  /* session_id pour grouper les events d'une même session de navigation. */
  session_id text not null,
  event_type text not null,
  /* Contexte d'affichage (sur quelle surface l'event s'est produit). */
  surface public.event_surface,
  position integer,
  /* Cibles (un de ces champs selon event_type). */
  target_post_id uuid,
  target_user_id uuid,
  target_listing_id uuid,
  target_job_id uuid,
  target_circle_id uuid,
  /* Métadonnées spécifiques à l'event (reaction_type, dwell_ms, etc.). */
  properties jsonb not null default '{}'::jsonb,
  /* Anti-fraude / debugging */
  device_type text check (device_type in ('mobile', 'tablet', 'desktop')),
  locale text,
  client_ts bigint,
  created_at timestamptz not null default now()
);

create index if not exists recsys_events_user_created_idx
  on public.recsys_events (user_id, created_at desc);
create index if not exists recsys_events_type_created_idx
  on public.recsys_events (event_type, created_at desc);
create index if not exists recsys_events_target_post_idx
  on public.recsys_events (target_post_id) where target_post_id is not null;

alter table public.recsys_events enable row level security;

/* RLS : un user ne peut insérer QUE ses propres events.
   Lecture : seul le owner ou le service role (workers) — pas de lecture
   cross-user pour respecter la pseudonymisation. */
create policy "recsys_events_insert_self"
  on public.recsys_events for insert
  with check (auth.uid() = user_id);

create policy "recsys_events_select_owner"
  on public.recsys_events for select
  using (auth.uid() = user_id);

comment on table public.recsys_events is
  'Log brut des events comportementaux. Rétention 13 mois max (cleanup cron).';

-- =====================================================
-- 2. user_interest_profiles — profil agrégé par utilisateur
-- =====================================================
create table if not exists public.user_interest_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  /* Vecteur d'embedding (V2 — alimenté quand on activera OpenAI Embeddings).
     1536 dims = text-embedding-3-small. NULL en V1 lite. */
  interest_vector vector(1536),
  /* Affinités par topic (mise à jour par profile_updater).
     Format : { "tech.web_dev": 0.92, "lifestyle.cooking": 0.45, ... } */
  topic_affinity jsonb not null default '{}'::jsonb,
  /* Top 200 personnes avec qui l'user interagit le plus.
     Format : { "user-uuid": score } */
  user_affinity jsonb not null default '{}'::jsonb,
  /* Affinités cercles (top 50). */
  circle_affinity jsonb not null default '{}'::jsonb,
  /* Behavioral features (taux engagement, dwell moyen, diversité, etc.). */
  behavioral_features jsonb not null default '{}'::jsonb,
  /* Format préféré : { "video": 0.7, "image": 0.5, "text": 0.3 }. */
  format_preference jsonb not null default '{}'::jsonb,
  /* Heures d'activité (24 valeurs de 0 à 1, normalisé). */
  active_hours_distribution jsonb not null default '{}'::jsonb,
  /* Compteurs de contrôle. */
  events_processed_count integer not null default 0,
  profile_version integer not null default 1,
  last_updated timestamptz not null default now()
);

create index if not exists user_interest_profiles_updated_idx
  on public.user_interest_profiles (last_updated desc);

alter table public.user_interest_profiles enable row level security;

create policy "user_interest_profiles_select_owner"
  on public.user_interest_profiles for select
  using (auth.uid() = user_id);

/* Pas de policy insert/update grand public : seuls les workers
   (service_role) écrivent dans cette table. */

comment on table public.user_interest_profiles is
  'Profil d''intérêts agrégé. MAJ par profile_updater cron 15min.';

-- =====================================================
-- 3. user_algorithm_settings — toggles RGPD/DSA
-- =====================================================
create table if not exists public.user_algorithm_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  /* Mode chronologique strict (DSA art. 38). Si true, bypass tout le
     ranking algorithmique → posts en ordre temporel inverse pur. */
  chronological_mode boolean not null default false,
  /* Consentements granulaires (RGPD art. 7) — NON cochés par défaut. */
  personalization_consent boolean not null default false,
  location_consent boolean not null default false,
  contacts_consent boolean not null default false,
  ads_consent boolean not null default false,
  consent_timestamp timestamptz,
  /* Topics que l'user a explicitement masqués (via "Voir moins"). */
  hidden_topics text[] not null default array[]::text[],
  /* Auteurs masqués. */
  hidden_users uuid[] not null default array[]::uuid[],
  /* Topics que l'user a manuellement ajoutés à ses intérêts. */
  manual_topics text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

alter table public.user_algorithm_settings enable row level security;

create policy "user_algorithm_settings_select_owner"
  on public.user_algorithm_settings for select
  using (auth.uid() = user_id);

create policy "user_algorithm_settings_upsert_owner"
  on public.user_algorithm_settings for insert
  with check (auth.uid() = user_id);

create policy "user_algorithm_settings_update_owner"
  on public.user_algorithm_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.user_algorithm_settings is
  'Toggles algorithme par user. Conformité RGPD/DSA.';
