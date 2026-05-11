-- =====================================================
-- DIVARC — Migration 0072 : Suppression compte avec grâce (étape 12)
--
-- Workflow soft-delete avec période de grâce 30 jours :
--   - User clique "Supprimer mon compte" → set
--     profiles.scheduled_deletion_at = now() + 30 days
--   - L'user peut réactiver pendant les 30 jours en se reconnectant
--   - Cron quotidien purge les comptes au-delà de la date
--
-- RGPD art. 17 (droit à l'effacement).
-- =====================================================

alter table public.profiles
  add column if not exists scheduled_deletion_at timestamptz,
  add column if not exists deletion_requested_at timestamptz;

create index if not exists profiles_scheduled_deletion_idx
  on public.profiles (scheduled_deletion_at)
  where scheduled_deletion_at is not null;

-- =====================================================
-- RPC : initier suppression (set scheduled_deletion_at + 30j)
-- =====================================================
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  deletion_date timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  deletion_date := now() + interval '30 days';

  update public.profiles
     set scheduled_deletion_at = deletion_date,
         deletion_requested_at = now()
   where id = uid;

  return deletion_date;
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

-- =====================================================
-- RPC : annuler la suppression (réactiver le compte)
-- =====================================================
create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.profiles
     set scheduled_deletion_at = null,
         deletion_requested_at = null
   where id = auth.uid();
end;
$$;

grant execute on function public.cancel_account_deletion() to authenticated;
