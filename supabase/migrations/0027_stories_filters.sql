-- =====================================================
-- DIVARC — Migration 0027 : Stories filters
--   - Colonne `filter` pour persister le filtre CSS choisi
--     (Original / Doré / Crème / Nuit / Pellicule / Argent)
--   - Le filtre est appliqué côté client via `style.filter`
--     dans le viewer. NULL = aucun filtre.
-- =====================================================

alter table public.stories
  add column if not exists filter text check (
    filter is null
    or filter in ('original', 'dore', 'creme', 'nuit', 'pellicule', 'argent')
  );

comment on column public.stories.filter is
  'Preset visuel appliqué côté client. NULL = original. Voir lib/stories/filters.ts';
