-- Chantier Reels Recsys étape 16 — Enrichissement user_interest_profiles.
--
-- La table user_interest_profiles existe depuis 0042 (interest_vector,
-- user_affinity, circle_affinity, active_hours_distribution).
--
-- V3 ajoute :
--   - cold_start_topics : 5 topics choisis au premier accès /reels
--                          (seed le profil avant qu'il y ait des events)
--   - cold_start_completed_at : marqueur du flow onboarding
--   - hashtag_affinity : { tag: score } pour boost matching côté ranker
--   - sound_affinity : { sound_id: score } pour Reels avec son partagé
--   - behavioral_features : { is_lurker, video_completion_rate,
--                              avg_session_duration_min, ... } (jsonb)
--   - last_session_at : sert au context "session_position" du ranker
--
-- Toutes les colonnes nullable ou jsonb '{}' default — aucune breaking change.
-- IDEMPOTENT.

alter table public.user_interest_profiles
  add column if not exists cold_start_topics text[];

alter table public.user_interest_profiles
  add column if not exists cold_start_completed_at timestamptz;

alter table public.user_interest_profiles
  add column if not exists hashtag_affinity jsonb not null default '{}'::jsonb;

alter table public.user_interest_profiles
  add column if not exists sound_affinity jsonb not null default '{}'::jsonb;

alter table public.user_interest_profiles
  add column if not exists behavioral_features jsonb not null default '{}'::jsonb;

alter table public.user_interest_profiles
  add column if not exists last_session_at timestamptz;

create index if not exists user_interest_profiles_last_session_idx
  on public.user_interest_profiles (last_session_at desc nulls last)
  where last_session_at is not null;

comment on column public.user_interest_profiles.cold_start_topics is
  'Topics choisis au premier accès /reels (modal cold start). Seed le profil avant volume d''events.';
comment on column public.user_interest_profiles.hashtag_affinity is
  'Map { tag: score } cumulé depuis events positifs. Mis à jour par profile-updater /5min.';
comment on column public.user_interest_profiles.sound_affinity is
  'Map { sound_id: score } pour signal Reels (sons utilisés/sauvés).';
comment on column public.user_interest_profiles.behavioral_features is
  'Profil comportemental : is_lurker, video_completion_rate, avg_session_duration_min, etc.';
