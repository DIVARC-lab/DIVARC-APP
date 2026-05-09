-- =====================================================
-- DIVARC — Migration 0040 : Event reminders tracking
--   - Colonnes pour tracker quels rappels ont déjà été envoyés sur
--     chaque event de cercle, pour éviter les doublons :
--     reminded_24h_at : J-1 (push envoyé 22-26h avant l'event)
--     reminded_1h_at  : H-1 (push envoyé 45-75min avant l'event)
--   - Le cron Vercel /api/cron/event-reminders s'exécute toutes les
--     heures et lit les events dans la fenêtre, déclenche les pushs,
--     met à jour ces colonnes.
-- =====================================================

alter table public.circle_events
  add column if not exists reminded_24h_at timestamptz,
  add column if not exists reminded_1h_at timestamptz;

/* Index sur starts_at pour les events futurs non-rappelés. Postgres
   refuse les prédicats non-IMMUTABLE (now() est STABLE), donc on garde
   un index plein et le planner filtrera. */
create index if not exists circle_events_pending_24h_idx
  on public.circle_events (starts_at)
  where reminded_24h_at is null;

create index if not exists circle_events_pending_1h_idx
  on public.circle_events (starts_at)
  where reminded_1h_at is null;

comment on column public.circle_events.reminded_24h_at is
  'Timestamp d''envoi du rappel J-1, NULL si pas encore envoyé.';
comment on column public.circle_events.reminded_1h_at is
  'Timestamp d''envoi du rappel H-1, NULL si pas encore envoyé.';
