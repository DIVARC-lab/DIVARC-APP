-- =====================================================
-- DIVARC — Migration 0071 : Demandes vérification identité (étape 11)
--
-- V1 : workflow stub admin manuel. L'user soumet une demande avec
-- documents (Storage), l'admin DIVARC review et toggle
-- profiles.identity_verified_at via cette table.
--
-- V2 : Stripe Identity / Veriff API automatisée.
-- =====================================================

create table if not exists public.identity_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /* État de la demande. */
  status text not null default 'pending'
    check (status in (
      'pending', 'reviewing', 'approved', 'rejected', 'expired'
    )),
  /* Type de vérification demandée. */
  verification_type text not null default 'identity'
    check (verification_type in (
      'identity', 'press', 'professional', 'business'
    )),
  /* URLs Supabase Storage des documents (ID + selfie). Bucket privé V2. */
  document_id_url text,
  document_selfie_url text,
  /* Notes par l'user (contexte). */
  applicant_notes text
    check (applicant_notes is null or char_length(applicant_notes) <= 1000),
  /* Notes admin (raison rejet, etc.). */
  reviewer_notes text
    check (reviewer_notes is null or char_length(reviewer_notes) <= 2000),
  reviewer_id uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  expires_at timestamptz,
  /* 1 demande pending à la fois par user. */
  unique (user_id, status) deferrable initially deferred
);

create index if not exists identity_verif_user_idx
  on public.identity_verification_requests (user_id, submitted_at desc);

create index if not exists identity_verif_status_idx
  on public.identity_verification_requests (status, submitted_at)
  where status in ('pending', 'reviewing');

-- =====================================================
-- Trigger : sync profiles.identity_verified_at quand status='approved'
-- =====================================================
create or replace function public.sync_identity_verified_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved'
    and (old.status is null or old.status <> 'approved')
    and new.verification_type = 'identity'
  then
    update public.profiles
       set identity_verified_at = coalesce(new.reviewed_at, now()),
           identity_verification_provider = 'manual_admin'
     where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists identity_verif_sync_profile on public.identity_verification_requests;
create trigger identity_verif_sync_profile
  after insert or update on public.identity_verification_requests
  for each row execute function public.sync_identity_verified_on_approval();

-- =====================================================
-- RLS
-- =====================================================
alter table public.identity_verification_requests enable row level security;

-- SELECT : owner only (admin a accès via service role)
drop policy if exists "user reads own verif requests" on public.identity_verification_requests;
create policy "user reads own verif requests"
  on public.identity_verification_requests for select
  using (auth.uid() = user_id);

-- INSERT : user crée sa propre demande (status='pending')
drop policy if exists "user submits own verif" on public.identity_verification_requests;
create policy "user submits own verif"
  on public.identity_verification_requests for insert
  with check (auth.uid() = user_id and status = 'pending');

-- UPDATE : pas autorisé par défaut. Admin via SECURITY DEFINER RPC.

-- =====================================================
-- RPC : admin approuve une demande
-- =====================================================
create or replace function public.admin_approve_verification(
  p_request_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  /* Vérifie admin via app_metadata.role = 'admin' (Supabase convention). */
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    into is_admin;
  if not is_admin then raise exception 'admin only'; end if;

  update public.identity_verification_requests
     set status = 'approved',
         reviewer_id = auth.uid(),
         reviewer_notes = p_notes,
         reviewed_at = now()
   where id = p_request_id
     and status in ('pending', 'reviewing');

  if not found then
    raise exception 'request not found or already processed';
  end if;
end;
$$;

grant execute on function public.admin_approve_verification(uuid, text)
  to authenticated;

create or replace function public.admin_reject_verification(
  p_request_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    into is_admin;
  if not is_admin then raise exception 'admin only'; end if;

  update public.identity_verification_requests
     set status = 'rejected',
         reviewer_id = auth.uid(),
         reviewer_notes = p_notes,
         reviewed_at = now()
   where id = p_request_id
     and status in ('pending', 'reviewing');
end;
$$;

grant execute on function public.admin_reject_verification(uuid, text)
  to authenticated;
