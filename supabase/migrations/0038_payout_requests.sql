-- =====================================================
-- DIVARC — Migration 0038 : Wallet payout requests
--   - Une demande de payout (encaissement vers IBAN) est créée par
--     l'utilisateur, puis traitée manuellement par l'équipe (en attendant
--     l'intégration Stripe Connect réelle).
--   - States : pending → processing → completed | rejected | cancelled
--   - L'IBAN est stocké chiffré côté Supabase (RLS : seul l'auteur voit
--     ses propres demandes ; admin voit tout via service role).
--   - On bloque la création si solde insuffisant ou autre payout pending.
-- =====================================================

create type public.payout_request_status as enum (
  'pending',
  'processing',
  'completed',
  'rejected',
  'cancelled'
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  currency text not null check (length(currency) = 3),
  /* IBAN normalisé sans espaces ni tirets. Validation côté action via
     regex stricte (FR seulement pour MVP, élargir plus tard). */
  iban text not null check (length(iban) between 14 and 34),
  /* BIC / SWIFT facultatif (auto-déduit de l'IBAN dans la plupart des
     cas en SEPA). */
  bic text check (bic is null or length(bic) between 8 and 11),
  account_holder text not null check (length(account_holder) between 2 and 100),
  status public.payout_request_status not null default 'pending',
  /* Note interne admin (raison de rejet, référence virement, etc.). */
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  /* `processed_by` = id admin qui a traité (NULL si auto / non traité). */
  processed_by uuid references public.profiles(id) on delete set null
);

create index if not exists payout_requests_user_idx
  on public.payout_requests (user_id, created_at desc);
create index if not exists payout_requests_status_idx
  on public.payout_requests (status, created_at desc);

alter table public.payout_requests enable row level security;

/* L'utilisateur ne voit que ses propres demandes. Les admins (service
   role) bypassent RLS pour le back-office. */
create policy "payout_requests_select_owner"
  on public.payout_requests for select
  using (auth.uid() = user_id);

create policy "payout_requests_insert_self"
  on public.payout_requests for insert
  with check (auth.uid() = user_id);

/* Cancel uniquement par l'auteur, et seulement quand pending. Les autres
   transitions (processing/completed/rejected) sont admin-only via service
   role, donc pas de policy update grand public. */
create policy "payout_requests_cancel_own_pending"
  on public.payout_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('pending', 'cancelled'));

comment on table public.payout_requests is
  'Demandes d''encaissement vers IBAN. Traitées manuellement avant intégration Stripe Connect.';
comment on column public.payout_requests.iban is
  'IBAN sans espaces, validé côté action server (Zod regex SEPA).';
comment on column public.payout_requests.bic is
  'BIC/SWIFT facultatif (auto-déduit pour SEPA).';

-- =====================================================
-- RPC : create_payout_request
--   Vérifie atomiquement que le user a assez de solde dans le wallet
--   correspondant à la devise demandée + qu'aucune autre demande pending
--   n'existe. Décrémente le solde wallet et insère la demande.
-- =====================================================
create or replace function public.create_payout_request(
  amount_cents integer,
  currency_code text,
  iban_value text,
  bic_value text,
  holder text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_pending_count int;
  v_request_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if amount_cents <= 0 then
    raise exception 'Amount must be positive';
  end if;

  -- Anti-double-payout : refuse si une demande pending existe déjà
  select count(*) into v_pending_count
    from public.payout_requests
    where user_id = v_user and status in ('pending', 'processing');
  if v_pending_count > 0 then
    raise exception 'A payout request is already in progress';
  end if;

  -- Solde suffisant
  select * into v_wallet
    from public.wallets
    where user_id = v_user and currency = currency_code
    for update;
  if not found then
    raise exception 'Wallet not found for currency %', currency_code;
  end if;
  if v_wallet.balance < amount_cents then
    raise exception 'Insufficient balance';
  end if;

  -- Décrément solde + insert demande
  update public.wallets
    set balance = balance - amount_cents
    where id = v_wallet.id;

  insert into public.payout_requests (
    user_id, amount, currency, iban, bic, account_holder
  )
  values (
    v_user, amount_cents, currency_code, iban_value, bic_value, holder
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_payout_request(integer, text, text, text, text) from public;
grant execute on function public.create_payout_request(integer, text, text, text, text) to authenticated;

-- =====================================================
-- RPC : cancel_payout_request
--   Atomique : marque la demande cancelled + re-crédite le wallet.
--   Auth : seul l'auteur peut cancel sa propre demande pending.
-- =====================================================
create or replace function public.cancel_payout_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_req public.payout_requests%rowtype;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_req from public.payout_requests where id = request_id;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_req.user_id <> v_user then
    raise exception 'Not authorized';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'Cannot cancel a non-pending request';
  end if;

  update public.payout_requests
    set status = 'cancelled', processed_at = now()
    where id = v_req.id;

  update public.wallets
    set balance = balance + v_req.amount
    where user_id = v_user and currency = v_req.currency;
end;
$$;

revoke all on function public.cancel_payout_request(uuid) from public;
grant execute on function public.cancel_payout_request(uuid) to authenticated;
