-- Migration 0124 — Augmentation des limites stories vidéo à 50 Mo / 60s.
--
-- L'user a demandé un cap plus généreux pour les stories vidéo.
-- Cap retenu : 50 Mo (max free tier Supabase) et 60 secondes (aligné TikTok).
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Bucket story-videos : 31 Mo → 50 Mo
-- =====================================================

update storage.buckets
   set file_size_limit = 52428800  -- 50 * 1024 * 1024
 where id = 'story-videos';

-- =====================================================
-- 2. Check constraint stories.video_duration_ms : 30s → 60s
-- =====================================================

alter table public.stories
  drop constraint if exists stories_video_duration_ms_check;

alter table public.stories
  add constraint stories_video_duration_ms_check
  check (video_duration_ms is null or video_duration_ms <= 60000);

comment on column public.stories.video_duration_ms is
  'Durée de la vidéo en ms. Cap soft à 60s côté CHECK (migration 0124).';
