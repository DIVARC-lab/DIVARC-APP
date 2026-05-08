-- =====================================================
-- DIVARC — Migration 0021 : Cooptation / Referrals
--   Un membre peut référer un ami pour une offre. Le candidat reçoit
--   une notif personnalisée. Si le candidat postule, le recruteur voit
--   qui l'a recommandé (cooptation).
-- =====================================================

create table if not exists public.job_referrals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  message text check (message is null or char_length(message) between 1 and 1000),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  application_id uuid references public.job_applications(id) on delete set null,
  unique (job_id, referrer_id, referred_id),
  constraint no_self_referral check (referrer_id <> referred_id)
);

create index if not exists job_referrals_referred_idx
  on public.job_referrals (referred_id, created_at desc);
create index if not exists job_referrals_job_idx
  on public.job_referrals (job_id);

-- =========================================================
-- RLS
--   Lecture : referrer, referred, et le poster du job (pour voir les
--   cooptations sur ses offres).
--   Insertion : seulement le referrer, et seulement si les deux
--   utilisateurs sont amis.
--   Suppression : seulement par le referrer.
-- =========================================================

alter table public.job_referrals enable row level security;

drop policy if exists "referrer/referred/poster can read" on public.job_referrals;
create policy "referrer/referred/poster can read"
  on public.job_referrals for select
  using (
    referrer_id = auth.uid()
    or referred_id = auth.uid()
    or exists (
      select 1 from public.jobs j
       where j.id = job_id and j.poster_id = auth.uid()
    )
  );

drop policy if exists "friends can refer" on public.job_referrals;
create policy "friends can refer"
  on public.job_referrals for insert
  with check (
    referrer_id = auth.uid()
    and referrer_id <> referred_id
    and public.are_friends(referrer_id, referred_id)
    and exists (
      select 1 from public.jobs j
       where j.id = job_id and j.status = 'active'
    )
  );

drop policy if exists "referrer can delete" on public.job_referrals;
create policy "referrer can delete"
  on public.job_referrals for delete
  using (referrer_id = auth.uid());

drop policy if exists "referred or system can update" on public.job_referrals;
create policy "referred or system can update"
  on public.job_referrals for update
  using (referred_id = auth.uid() or referrer_id = auth.uid());

-- =========================================================
-- Trigger 1 : notification au candidat coopté
-- =========================================================

create or replace function public.notify_referred_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record record;
  referrer_name text;
  preview text;
begin
  select id, title, company_name into job_record
    from public.jobs where id = new.job_id;

  if job_record.id is null then return new; end if;

  select coalesce(full_name, username, 'Un ami')
    into referrer_name
    from public.profiles where id = new.referrer_id;

  preview := referrer_name
    || ' te recommande pour « ' || job_record.title || ' »'
    || coalesce(' chez ' || job_record.company_name, '');

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) values (
    new.referred_id,
    'system',
    'Cooptation reçue ✨',
    preview,
    new.referrer_id,
    '/jobs/' || job_record.id::text
  );

  return new;
end;
$$;

drop trigger if exists notify_referred_user_trg on public.job_referrals;
create trigger notify_referred_user_trg
  after insert on public.job_referrals
  for each row execute function public.notify_referred_user();

-- =========================================================
-- Trigger 2 : si le candidat coopté postule, on lie l'application
-- au referral et on notifie le referrer (« ton coopté a postulé »)
-- =========================================================

create or replace function public.link_application_to_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref record;
  applicant_name text;
  job_title text;
begin
  -- Cherche un referral existant pour ce couple (job, candidat)
  select r.id, r.referrer_id into ref
    from public.job_referrals r
   where r.job_id = new.job_id
     and r.referred_id = new.applicant_id
     and r.application_id is null
   order by r.created_at desc
   limit 1;

  if ref.id is null then return new; end if;

  update public.job_referrals
     set application_id = new.id,
         acknowledged_at = coalesce(acknowledged_at, now())
   where id = ref.id;

  select coalesce(full_name, username, 'Ton coopté')
    into applicant_name
    from public.profiles where id = new.applicant_id;

  select title into job_title
    from public.jobs where id = new.job_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) values (
    ref.referrer_id,
    'system',
    'Cooptation activée 🎯',
    applicant_name || ' a postulé pour « ' || job_title || ' » suite à ta recommandation.',
    new.applicant_id,
    '/jobs/' || new.job_id::text
  );

  return new;
end;
$$;

drop trigger if exists link_application_to_referral_trg on public.job_applications;
create trigger link_application_to_referral_trg
  after insert on public.job_applications
  for each row execute function public.link_application_to_referral();

-- =========================================================
-- Realtime
-- =========================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'job_referrals'
  ) then
    alter publication supabase_realtime add table public.job_referrals;
  end if;
end $$;
