-- =====================================================
-- 0035 — Stories vidéo
-- Étend stories pour supporter type='video' avec
-- video_url + thumbnail_url + duration_ms.
-- =====================================================

-- 1. Drop l'ancien CHECK qui interdisait 'video' puis recrée-le
alter table public.stories
  drop constraint if exists stories_type_check;

alter table public.stories
  add constraint stories_type_check
  check (type in ('photo', 'text', 'video'));

-- 2. Nouvelles colonnes
alter table public.stories
  add column if not exists video_url text,
  add column if not exists video_thumbnail_url text,
  add column if not exists video_duration_ms integer
    check (video_duration_ms is null or video_duration_ms <= 30000);

-- 3. Update les CHECK constraints pour gérer le mode video.
--    photo_requires_url et text_requires_content existent déjà
--    et tolèrent video=non-photo / non-text. On ajoute juste
--    une contrainte spécifique vidéo.
alter table public.stories
  drop constraint if exists video_requires_url;

alter table public.stories
  add constraint video_requires_url
  check (
    type <> 'video'
    or (video_url is not null and length(video_url) > 0)
  );

comment on column public.stories.video_url is
  'URL publique du fichier vidéo dans Supabase Storage (bucket story-videos).';
comment on column public.stories.video_thumbnail_url is
  'URL publique du poster (frame initiale) extrait côté client.';
comment on column public.stories.video_duration_ms is
  'Durée de la vidéo en ms. Cap soft à 30s côté CHECK.';
