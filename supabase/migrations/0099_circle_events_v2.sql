-- Chantier 3.6 — circle_events v2.
--
-- Extension additive de circle_events + circle_event_attendance pour
-- supporter :
--   - événements in_person / online / hybrid (avec URL Zoom/Meet/etc.)
--   - timezone explicite
--   - cover_image_url
--   - status lifecycle (scheduled/live/ended/cancelled)
--   - require_approval pour rsvp
--   - is_paid + price_amount (V2 paiements via Stripe Connect plus tard)
--   - co-hosts
--
-- RSVP étendu : going / interested (legacy) / maybe / not_going.
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Étendre circle_events
-- =====================================================

alter table public.circle_events
  add column if not exists event_type text not null default 'in_person';
alter table public.circle_events
  drop constraint if exists circle_events_event_type_check;
alter table public.circle_events
  add constraint circle_events_event_type_check
  check (event_type in ('in_person', 'online', 'hybrid'));

alter table public.circle_events
  add column if not exists online_url text
    check (online_url is null or online_url ~* '^https?://');

alter table public.circle_events
  add column if not exists online_platform text
    check (online_platform is null or char_length(online_platform) <= 40);

alter table public.circle_events
  add column if not exists timezone text not null default 'Europe/Paris';

alter table public.circle_events
  add column if not exists cover_image_url text
    check (cover_image_url is null or cover_image_url ~* '^https?://');

alter table public.circle_events
  add column if not exists status text not null default 'scheduled';
alter table public.circle_events
  drop constraint if exists circle_events_status_check;
alter table public.circle_events
  add constraint circle_events_status_check
  check (status in ('scheduled', 'live', 'ended', 'cancelled'));

alter table public.circle_events
  add column if not exists require_approval boolean not null default false;

/* Monétisation V2 (paiement géré plus tard via Stripe Connect). */
alter table public.circle_events
  add column if not exists is_paid boolean not null default false;
alter table public.circle_events
  add column if not exists price_amount numeric(12, 2)
    check (price_amount is null or price_amount >= 0);
alter table public.circle_events
  add column if not exists price_currency text default 'EUR'
    check (price_currency is null or char_length(price_currency) = 3);

/* Co-hosts (user_ids), V1 stocké en jsonb pour simplicité. */
alter table public.circle_events
  add column if not exists co_host_user_ids uuid[] not null default '{}'::uuid[];

create index if not exists circle_events_status_starts_at_idx
  on public.circle_events (status, starts_at)
  where status = 'scheduled';

-- =====================================================
-- 2. Étendre circle_event_attendance status enum
-- =====================================================

alter table public.circle_event_attendance
  drop constraint if exists circle_event_attendance_status_check;
alter table public.circle_event_attendance
  add constraint circle_event_attendance_status_check
  check (status in ('going', 'interested', 'maybe', 'not_going'));

/* Le trigger existant ne compte QUE les 'going' → cohérent avec
 * l'extension de l'enum. */

comment on column public.circle_events.event_type is
  'Type d''événement : in_person / online / hybrid (Chantier 3.6).';
comment on column public.circle_events.status is
  'Lifecycle event : scheduled (default) → live → ended, ou cancelled.';
comment on column public.circle_event_attendance.status is
  'RSVP : going (compte dans attendance_count), interested (legacy), maybe, not_going.';
