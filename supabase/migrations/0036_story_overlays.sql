-- =====================================================
-- DIVARC — Migration 0036 : Story overlays (caption + stickers)
--   - `caption_position` JSONB : { x: 0..1, y: 0..1, scale: number }
--     position du caption en pourcentage du conteneur (résolution-indé).
--     NULL = caption affiché en bas (comportement par défaut historique).
--   - `stickers` JSONB[] : tableau de { emoji, x, y, scale, rotation }
--     overlays emoji que l'auteur a tapés sur la photo. Persistés tels
--     quels et rendus côté StoryViewer.
-- =====================================================

alter table public.stories
  add column if not exists caption_position jsonb,
  add column if not exists stickers jsonb not null default '[]'::jsonb;

-- Schéma JSON attendu (validé côté server action via Zod, pas en SQL pour
-- garder la flexibilité de migration douce) :
--   caption_position: { x: number 0..1, y: number 0..1, scale: number }
--   stickers[]: { emoji: string, x: number 0..1, y: number 0..1, scale: number, rotation: number }

comment on column public.stories.caption_position is
  'Position relative du caption en pourcentage. NULL = bas standard.';
comment on column public.stories.stickers is
  'Array de stickers emoji avec position relative et transformations.';
