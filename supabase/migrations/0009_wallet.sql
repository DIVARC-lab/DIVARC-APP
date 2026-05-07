-- =====================================================
-- DIVARC — Migration 0009 : Wallet & transferts P2P
-- =====================================================

-- 1. wallets table (multi-currency per user)
create table if not exists public.wallets (
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null
    check (currency in ('EUR', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF')),
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, currency)
);

-- 2. transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('transfer', 'topup', 'refund', 'fee', 'welcome_credit')),
  sender_id uuid references auth.users(id) on delete set null,
  recipient_id uuid references auth.users(id) on delete set null,
  currency text not null
    check (currency in ('EUR', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF')),
  amount numeric(14, 2) not null check (amount > 0),
  description text check (description is null or char_length(description) <= 280),
  status text not null default 'completed'
    check (status in ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists transactions_sender_id_created_at_idx
  on public.transactions (sender_id, created_at desc);
create index if not exists transactions_recipient_id_created_at_idx
  on public.transactions (recipient_id, created_at desc);

-- 3. RLS — wallets
alter table public.wallets enable row level security;

drop policy if exists "users see own wallets" on public.wallets;
create policy "users see own wallets"
  on public.wallets for select
  using (user_id = auth.uid());

-- INSERT/UPDATE only via SECURITY DEFINER functions

-- 4. RLS — transactions
alter table public.transactions enable row level security;

drop policy if exists "users see own transactions" on public.transactions;
create policy "users see own transactions"
  on public.transactions for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- 5. Trigger : crédit de bienvenue à la création du profil (beta)
create or replace function public.grant_welcome_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 50 EUR de bienvenue
  insert into public.wallets (user_id, currency, balance)
    values (new.id, 'EUR', 50.00)
    on conflict (user_id, currency) do nothing;

  insert into public.transactions (
    type, recipient_id, currency, amount, description, status
  ) values (
    'welcome_credit', new.id, 'EUR', 50.00,
    'Crédit de bienvenue beta DIVARC', 'completed'
  );

  -- 30 000 XAF de bienvenue (~46 EUR)
  insert into public.wallets (user_id, currency, balance)
    values (new.id, 'XAF', 30000.00)
    on conflict (user_id, currency) do nothing;

  insert into public.transactions (
    type, recipient_id, currency, amount, description, status
  ) values (
    'welcome_credit', new.id, 'XAF', 30000.00,
    'Crédit de bienvenue beta DIVARC', 'completed'
  );

  return new;
end;
$$;

drop trigger if exists profiles_grant_welcome_credit on public.profiles;
create trigger profiles_grant_welcome_credit
  after insert on public.profiles
  for each row execute function public.grant_welcome_credit();

-- 6. RPC : transfer_money (atomique, vérifie solde + amitié)
create or replace function public.transfer_money(
  recipient_user_id uuid,
  transfer_amount numeric,
  transfer_currency text,
  transfer_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  transaction_id uuid;
  sender_balance numeric;
begin
  current_uid := auth.uid();

  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  if current_uid = recipient_user_id then
    raise exception 'cannot transfer to yourself';
  end if;

  if transfer_amount is null or transfer_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if not public.are_friends(current_uid, recipient_user_id) then
    raise exception 'recipient must be a friend';
  end if;

  -- Check & update sender balance atomically
  select balance into sender_balance
    from public.wallets
   where user_id = current_uid
     and currency = transfer_currency
   for update;

  if sender_balance is null or sender_balance < transfer_amount then
    raise exception 'insufficient balance';
  end if;

  update public.wallets
     set balance = balance - transfer_amount,
         updated_at = now()
   where user_id = current_uid
     and currency = transfer_currency;

  -- Credit recipient (create wallet if needed)
  insert into public.wallets (user_id, currency, balance)
    values (recipient_user_id, transfer_currency, transfer_amount)
    on conflict (user_id, currency)
    do update set
      balance = public.wallets.balance + excluded.balance,
      updated_at = now();

  -- Log transaction
  insert into public.transactions (
    type, sender_id, recipient_id, currency, amount, description, status
  ) values (
    'transfer', current_uid, recipient_user_id,
    transfer_currency, transfer_amount, transfer_description, 'completed'
  )
  returning id into transaction_id;

  return transaction_id;
end;
$$;

grant execute on function public.transfer_money(uuid, numeric, text, text)
  to authenticated;

-- 7. Trigger : notification au destinataire quand il reçoit un transfert
create or replace function public.notify_money_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  if new.type <> 'transfer' or new.recipient_id is null then
    return new;
  end if;

  if new.sender_id is null then return new; end if;

  select coalesce(full_name, username, 'Quelqu''un')
    into sender_name
    from public.profiles
   where id = new.sender_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) values (
    new.recipient_id,
    'system',
    sender_name || ' t''a envoyé de l''argent 💸',
    coalesce(new.description, 'Voir le détail dans ton wallet.'),
    new.sender_id,
    '/wallet'
  );

  return new;
end;
$$;

drop trigger if exists notify_money_received_trg on public.transactions;
create trigger notify_money_received_trg
  after insert on public.transactions
  for each row execute function public.notify_money_received();

-- 8. Realtime (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'wallets'
  ) then
    alter publication supabase_realtime add table public.wallets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;

-- 9. Backfill : donner le crédit aux profils existants qui n'ont pas de wallet
do $$
declare
  rec record;
begin
  for rec in select id from public.profiles
            where id not in (select user_id from public.wallets where currency = 'EUR')
  loop
    insert into public.wallets (user_id, currency, balance)
      values (rec.id, 'EUR', 50.00),
             (rec.id, 'XAF', 30000.00)
      on conflict (user_id, currency) do nothing;

    insert into public.transactions (type, recipient_id, currency, amount, description, status)
      values
        ('welcome_credit', rec.id, 'EUR', 50.00, 'Crédit de bienvenue beta DIVARC', 'completed'),
        ('welcome_credit', rec.id, 'XAF', 30000.00, 'Crédit de bienvenue beta DIVARC', 'completed');
  end loop;
end $$;
