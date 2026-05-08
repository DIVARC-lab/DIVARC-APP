-- =====================================================
-- DIVARC — Migration 0030 : Événements de cercle (V3)
--   - Un membre crée un événement (date, lieu, capacité option.)
--   - Les autres membres répondent : going / interested
--   - Visibilité : suit la visibilité du cercle (RLS via membership)
-- =====================================================

-- 1. circle_events
create table if not exists public.circle_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null
    check (char_length(title) between 2 and 120),
  description text
    check (description is null or char_length(description) <= 2000),
  location text
    check (location is null or char_length(location) <= 200),
  /* category : 'community' | 'social' | 'cultural' (handoff) */
  category text not null default 'community'
    check (category in ('community', 'social', 'cultural')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer
    check (capacity is null or capacity between 1 and 5000),
  attendance_count integer not null default 0,
  created_at timestamptz not null default now(),
  /* ends_at must be after starts_at when set */
  constraint event_dates_consistent check (
    ends_at is null or ends_at > starts_at
  )
);

create index if not exists circle_events_circle_id_starts_at_idx
  on public.circle_events (circle_id, starts_at);

create index if not exists circle_events_starts_at_idx
  on public.circle_events (starts_at)
  where starts_at >= now();

-- 2. circle_event_attendance
create table if not exists public.circle_event_attendance (
  event_id uuid not null references public.circle_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'going'
    check (status in ('going', 'interested')),
  responded_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists circle_event_attendance_user_idx
  on public.circle_event_attendance (user_id);

-- 3. Trigger : maintenir attendance_count (compte les 'going')
create or replace function public.bump_event_attendance_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'going' then
      update public.circle_events
         set attendance_count = attendance_count + 1
       where id = new.event_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.status = 'going' then
      update public.circle_events
         set attendance_count = greatest(attendance_count - 1, 0)
       where id = old.event_id;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      if new.status = 'going' and old.status <> 'going' then
        update public.circle_events
           set attendance_count = attendance_count + 1
         where id = new.event_id;
      elsif old.status = 'going' and new.status <> 'going' then
        update public.circle_events
           set attendance_count = greatest(attendance_count - 1, 0)
         where id = old.event_id;
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists circle_event_attendance_count_trigger
  on public.circle_event_attendance;
create trigger circle_event_attendance_count_trigger
  after insert or update or delete on public.circle_event_attendance
  for each row execute function public.bump_event_attendance_count();

-- 4. RLS — circle_events
alter table public.circle_events enable row level security;

drop policy if exists "events visible to circle visibility" on public.circle_events;
create policy "events visible to circle visibility"
  on public.circle_events for select
  using (
    exists (
      select 1 from public.circles c
       where c.id = circle_id
         and (
           not c.is_private
           or c.owner_id = auth.uid()
           or public.is_circle_member(c.id, auth.uid())
         )
    )
  );

drop policy if exists "members create events" on public.circle_events;
create policy "members create events"
  on public.circle_events for insert
  with check (
    author_id = auth.uid()
    and public.is_circle_member(circle_id, auth.uid())
  );

drop policy if exists "author updates own event" on public.circle_events;
create policy "author updates own event"
  on public.circle_events for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "author deletes own event" on public.circle_events;
create policy "author deletes own event"
  on public.circle_events for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.circles c
       where c.id = circle_id and c.owner_id = auth.uid()
    )
  );

-- 5. RLS — circle_event_attendance
alter table public.circle_event_attendance enable row level security;

drop policy if exists "attendance visible to circle members" on public.circle_event_attendance;
create policy "attendance visible to circle members"
  on public.circle_event_attendance for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.circle_events e
       join public.circles c on c.id = e.circle_id
       where e.id = event_id
         and (
           not c.is_private
           or c.owner_id = auth.uid()
           or public.is_circle_member(c.id, auth.uid())
         )
    )
  );

drop policy if exists "members rsvp own attendance" on public.circle_event_attendance;
create policy "members rsvp own attendance"
  on public.circle_event_attendance for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.circle_events e
       where e.id = event_id
         and public.is_circle_member(e.circle_id, auth.uid())
    )
  );

drop policy if exists "users update own attendance" on public.circle_event_attendance;
create policy "users update own attendance"
  on public.circle_event_attendance for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users cancel own attendance" on public.circle_event_attendance;
create policy "users cancel own attendance"
  on public.circle_event_attendance for delete
  using (user_id = auth.uid());
