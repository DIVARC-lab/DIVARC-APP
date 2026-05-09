-- =====================================================
-- DIVARC — Migration 0041 : aspect_ratio sur les médias
--   - Stocker le ratio cible (1:1, 4:5, 16:9, 9:16, original) appliqué au
--     crop côté client AVANT upload. Permet au composant <MediaDisplay>
--     de set `style={{ aspectRatio }}` AVANT le chargement de l'image
--     pour CLS=0 (pas de layout shift).
--   - Format string libre type "4/5" ou "1.778" (ratio numérique).
--     NULL = legacy / pas encore set (fallback display côté client).
-- =====================================================

alter table public.post_photos
  add column if not exists aspect_ratio text,
  add column if not exists width integer,
  add column if not exists height integer;

alter table public.listing_photos
  add column if not exists aspect_ratio text,
  add column if not exists width integer,
  add column if not exists height integer;

alter table public.stories
  add column if not exists aspect_ratio text,
  add column if not exists width integer,
  add column if not exists height integer;

comment on column public.post_photos.aspect_ratio is
  'Ratio appliqué au crop client (ex "4/5", "1/1", "16/9"). NULL si legacy.';
comment on column public.listing_photos.aspect_ratio is
  'Ratio appliqué au crop client. NULL si legacy.';
comment on column public.stories.aspect_ratio is
  'Ratio appliqué (story photo : "9/16" forcé en pratique).';
