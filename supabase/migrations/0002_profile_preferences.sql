-- =====================================================
-- DIVARC — Migration 0002 : Préférences utilisateur
-- =====================================================

-- Add preference columns to profiles
alter table public.profiles
  add column if not exists locale text default 'fr-FR' not null,
  add column if not exists currency text default 'EUR' not null,
  add column if not exists theme text default 'system' not null,
  add column if not exists email_notifications boolean default true not null,
  add column if not exists push_notifications boolean default true not null,
  add column if not exists discoverable boolean default true not null,
  add column if not exists show_email boolean default false not null,
  add column if not exists show_location boolean default true not null,
  add column if not exists founder_rank integer;

alter table public.profiles
  drop constraint if exists locale_supported,
  add constraint locale_supported check (
    locale in ('fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-MA', 'fr-SN', 'fr-CI', 'fr-CM', 'fr-DZ', 'fr-TN')
  );

alter table public.profiles
  drop constraint if exists currency_supported,
  add constraint currency_supported check (
    currency in ('EUR', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF')
  );

alter table public.profiles
  drop constraint if exists theme_supported,
  add constraint theme_supported check (theme in ('light', 'dark', 'system'));

-- Backfill founder_rank for existing rows (preserves order of signup)
do $$
declare
  rec record;
  next_rank integer := 1;
begin
  for rec in
    select id from public.profiles
    where founder_rank is null
    order by created_at asc, id asc
  loop
    update public.profiles
       set founder_rank = next_rank
     where id = rec.id;
    next_rank := next_rank + 1;
  end loop;
end $$;

-- Auto-assign founder_rank on new signups
create or replace function public.assign_founder_rank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_rank integer;
begin
  if new.founder_rank is null then
    select coalesce(max(founder_rank), 0) + 1
      into next_rank
      from public.profiles;
    new.founder_rank := next_rank;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_founder_rank on public.profiles;
create trigger profiles_assign_founder_rank
  before insert on public.profiles
  for each row execute function public.assign_founder_rank();
