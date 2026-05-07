-- =====================================================
-- DIVARC — Migration 0008 : Emploi (jobs + candidatures)
-- =====================================================

-- 1. jobs table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  company_name text check (company_name is null or char_length(company_name) between 1 and 120),
  description text not null check (char_length(description) between 10 and 8000),
  job_type text not null
    check (job_type in ('cdi', 'cdd', 'freelance', 'mission', 'alternance', 'stage', 'benevolat')),
  work_mode text not null default 'on_site'
    check (work_mode in ('on_site', 'remote', 'hybrid')),
  category text not null,
  experience_level text not null
    check (experience_level in ('debutant', 'junior', 'intermediaire', 'senior', 'expert')),
  salary_min numeric(12, 2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(12, 2) check (salary_max is null or salary_max >= 0),
  salary_currency text
    check (salary_currency is null or salary_currency in ('EUR', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF')),
  salary_period text
    check (salary_period is null or salary_period in ('hour', 'day', 'month', 'year', 'project')),
  location text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint salary_range_consistent check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  ),
  constraint salary_currency_required check (
    (salary_min is null and salary_max is null)
    or salary_currency is not null
  )
);

create index if not exists jobs_status_created_at_idx
  on public.jobs (status, created_at desc);
create index if not exists jobs_poster_id_idx on public.jobs (poster_id);
create index if not exists jobs_category_idx on public.jobs (category);

-- 2. job_applications
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  message text check (message is null or char_length(message) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (job_id, applicant_id)
);

create index if not exists job_applications_job_id_status_idx
  on public.job_applications (job_id, status);
create index if not exists job_applications_applicant_id_idx
  on public.job_applications (applicant_id);

-- 3. saved_jobs
create table if not exists public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- 4. updated_at trigger
drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- 5. RLS — jobs
alter table public.jobs enable row level security;

drop policy if exists "active jobs are public" on public.jobs;
create policy "active jobs are public"
  on public.jobs for select
  using (status = 'active' or poster_id = auth.uid());

drop policy if exists "owner can insert jobs" on public.jobs;
create policy "owner can insert jobs"
  on public.jobs for insert
  with check (poster_id = auth.uid());

drop policy if exists "owner can update jobs" on public.jobs;
create policy "owner can update jobs"
  on public.jobs for update
  using (poster_id = auth.uid());

drop policy if exists "owner can delete jobs" on public.jobs;
create policy "owner can delete jobs"
  on public.jobs for delete
  using (poster_id = auth.uid());

-- 6. RLS — job_applications
alter table public.job_applications enable row level security;

drop policy if exists "applicants and posters can view" on public.job_applications;
create policy "applicants and posters can view"
  on public.job_applications for select
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.jobs
       where id = job_id and poster_id = auth.uid()
    )
  );

drop policy if exists "users can apply" on public.job_applications;
create policy "users can apply"
  on public.job_applications for insert
  with check (
    applicant_id = auth.uid()
    and exists (
      select 1 from public.jobs
       where id = job_id and status = 'active' and poster_id <> auth.uid()
    )
  );

drop policy if exists "applicants can withdraw, posters can review" on public.job_applications;
create policy "applicants can withdraw, posters can review"
  on public.job_applications for update
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.jobs
       where id = job_id and poster_id = auth.uid()
    )
  );

-- 7. RLS — saved_jobs
alter table public.saved_jobs enable row level security;

drop policy if exists "users see own saved jobs" on public.saved_jobs;
create policy "users see own saved jobs"
  on public.saved_jobs for select
  using (user_id = auth.uid());

drop policy if exists "users save own jobs" on public.saved_jobs;
create policy "users save own jobs"
  on public.saved_jobs for insert
  with check (user_id = auth.uid());

drop policy if exists "users delete own saved jobs" on public.saved_jobs;
create policy "users delete own saved jobs"
  on public.saved_jobs for delete
  using (user_id = auth.uid());

-- 8. Triggers de notification

-- Nouvelle candidature
create or replace function public.notify_new_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record record;
  applicant_name text;
begin
  select id, title, poster_id into job_record
    from public.jobs
   where id = new.job_id;

  if job_record.poster_id is null
     or job_record.poster_id = new.applicant_id then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into applicant_name
    from public.profiles
   where id = new.applicant_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) values (
    job_record.poster_id,
    'system',
    applicant_name || ' a postulé',
    'Pour ton offre « ' || job_record.title || ' »',
    new.applicant_id,
    '/jobs/' || job_record.id::text || '/applicants'
  );

  return new;
end;
$$;

drop trigger if exists notify_new_application_trg on public.job_applications;
create trigger notify_new_application_trg
  after insert on public.job_applications
  for each row execute function public.notify_new_application();

-- Statut de candidature changé (côté candidat)
create or replace function public.notify_application_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record record;
  status_label text;
begin
  if new.status = old.status or new.applicant_id = auth.uid() then
    return new;
  end if;

  if new.status not in ('accepted', 'rejected', 'reviewed') then
    return new;
  end if;

  select id, title into job_record
    from public.jobs
   where id = new.job_id;

  status_label := case new.status
    when 'accepted' then 'Ta candidature a été acceptée 🎉'
    when 'rejected' then 'Réponse à ta candidature'
    when 'reviewed' then 'Ta candidature a été lue'
    else 'Mise à jour de ta candidature'
  end;

  insert into public.notifications (
    user_id, type, title, body, href
  ) values (
    new.applicant_id,
    'system',
    status_label,
    'Pour l''offre « ' || job_record.title || ' »',
    '/jobs/' || job_record.id::text
  );

  if new.responded_at is null then
    new.responded_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists notify_application_reviewed_trg on public.job_applications;
create trigger notify_application_reviewed_trg
  before update on public.job_applications
  for each row execute function public.notify_application_reviewed();

-- 9. Realtime (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'job_applications'
  ) then
    alter publication supabase_realtime add table public.job_applications;
  end if;
end $$;
