-- =====================================================
-- DIVARC — Migration 0033 : Géolocalisation des événements
--   - lat / lng optionnels (DOUBLE PRECISION) sur circle_events
--   - Validation : si l'un est non-NULL, l'autre doit l'être aussi
--   - Index simple (lat, lng) pour la /map page
-- =====================================================

alter table public.circle_events
  add column if not exists lat double precision
    check (lat is null or (lat between -90 and 90)),
  add column if not exists lng double precision
    check (lng is null or (lng between -180 and 180));

alter table public.circle_events
  drop constraint if exists circle_events_geo_paired;
alter table public.circle_events
  add constraint circle_events_geo_paired check (
    (lat is null and lng is null)
    or (lat is not null and lng is not null)
  );

create index if not exists circle_events_geo_idx
  on public.circle_events (lat, lng)
  where lat is not null and lng is not null;
