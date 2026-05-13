-- Chantier complémentaire — Module Mentorat par cercle.
--
-- Table `circle_mentor_offers` : profils des membres qui se déclarent
-- mentors dans un cercle. Les membres en recherche de mentorat peuvent
-- les contacter via la messagerie cercle (Chantier 5.x).
--
-- IDEMPOTENT.

create table if not exists public.circle_mentor_offers (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  mentor_user_id uuid not null references auth.users(id) on delete cascade,

  /* Pitch court visible sur la card mentor. */
  headline text not null check (char_length(headline) between 10 and 160),
  /* Description détaillée (markdown). */
  bio text check (bio is null or char_length(bio) <= 2000),
  /* Domaines d'expertise (tags). */
  expertise text[] not null default '{}'::text[],
  /* Disponibilité libre (ex: "1h/semaine", "Le weekend"). */
  availability text check (
    availability is null or char_length(availability) <= 80
  ),
  /* Capacité = nb de mentees actifs simultanés. NULL = illimité. */
  capacity integer check (capacity is null or capacity between 1 and 50),
  current_mentees integer not null default 0 check (current_mentees >= 0),

  is_open boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  /* Un mentor = une seule offer par cercle. */
  unique (circle_id, mentor_user_id)
);

create index if not exists circle_mentor_offers_circle_idx
  on public.circle_mentor_offers (circle_id, is_open, created_at desc);

create index if not exists circle_mentor_offers_mentor_idx
  on public.circle_mentor_offers (mentor_user_id);

create index if not exists circle_mentor_offers_expertise_gin_idx
  on public.circle_mentor_offers using gin (expertise);

alter table public.circle_mentor_offers enable row level security;

drop policy if exists "mentor_offers readable by members"
  on public.circle_mentor_offers;
create policy "mentor_offers readable by members"
  on public.circle_mentor_offers for select
  using (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_mentor_offers.circle_id
         and m.user_id = auth.uid()
         and m.status = 'active'
    )
  );

drop policy if exists "mentor_offers insert own by members"
  on public.circle_mentor_offers;
create policy "mentor_offers insert own by members"
  on public.circle_mentor_offers for insert
  with check (
    mentor_user_id = auth.uid()
    and exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_mentor_offers.circle_id
         and m.user_id = auth.uid()
         and m.status = 'active'
    )
  );

drop policy if exists "mentor_offers update own" on public.circle_mentor_offers;
create policy "mentor_offers update own"
  on public.circle_mentor_offers for update
  using (mentor_user_id = auth.uid());

drop policy if exists "mentor_offers delete own" on public.circle_mentor_offers;
create policy "mentor_offers delete own"
  on public.circle_mentor_offers for delete
  using (mentor_user_id = auth.uid());

drop trigger if exists circle_mentor_offers_set_updated_at
  on public.circle_mentor_offers;
create trigger circle_mentor_offers_set_updated_at
  before update on public.circle_mentor_offers
  for each row execute function public.set_updated_at();

comment on table public.circle_mentor_offers is
  'Offres de mentorat dans un cercle. Un membre peut se déclarer mentor avec headline + expertise + capacité.';
