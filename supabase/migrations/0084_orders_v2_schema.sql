-- Chantier 1 Étape 1.4 — Modèle Order (commande marketplace)
--
-- 4 tables :
--   1. orders : transaction principale (acheteur, vendeur, listing, statut,
--      montants, délais, escrow). Source de vérité.
--   2. order_status_changes : historique des changements de statut
--      (audit + debug + analytics).
--   3. order_shipping_details : détails livraison séparés (peut être nul
--      au début, populé quand le vendeur génère son étiquette).
--   4. order_tracking_events : événements tracking colis (push depuis
--      webhook Mondial Relay / Colissimo / Chronopost).
--
-- RLS stricte : seul buyer ou seller peuvent lire/update leur order.

-- =====================================================
-- 1. Table orders
-- =====================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),

  -- Order number lisible (généré par trigger : "DV-2025-A4F8B2")
  order_number text not null unique,

  -- Parties
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,

  -- Snapshot du listing au moment de la commande (preuve juridique
  -- du prix/état/description tels que vus par l'acheteur)
  listing_snapshot jsonb not null,

  -- Statut
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'payment_processing',
      'paid',
      'awaiting_shipment',
      'shipped',
      'in_transit',
      'delivered',
      'awaiting_confirmation',
      'completed',
      'cancelled',
      'disputed',
      'refunded',
      'partially_refunded'
    )),

  -- Montants (tous en centimes pour précision décimale via numeric)
  item_price numeric(12, 2) not null check (item_price >= 0),
  shipping_price numeric(12, 2) not null default 0 check (shipping_price >= 0),
  service_fee numeric(12, 2) not null default 0 check (service_fee >= 0),
  buyer_protection_fee numeric(12, 2) not null default 0
    check (buyer_protection_fee >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  seller_amount numeric(12, 2) not null check (seller_amount >= 0),
  divarc_commission numeric(12, 2) not null default 0
    check (divarc_commission >= 0),

  currency text not null default 'EUR'
    check (currency in ('EUR', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF')),

  -- Paiement (Stripe Connect)
  payment_intent_id text unique,
  payment_method_type text,
  paid_at timestamptz,

  -- Escrow (fonds bloqués chez Stripe jusqu'à confirmation)
  funds_held_in_escrow boolean not null default true,
  escrow_released_at timestamptz,

  -- Délais clés (calculés au moment de l'insert + update sur changement
  -- de statut). Tous nullable car certains sont contingents du flow.
  payment_deadline timestamptz,
  shipping_deadline timestamptz,
  delivery_deadline timestamptz,
  confirmation_deadline timestamptz,

  -- Documents
  invoice_url text,

  -- Évaluations cross-référencées (FK ajoutées après la table reviews
  -- en migration ultérieure du Chantier 6)
  buyer_review_id uuid,
  seller_review_id uuid,

  -- Litige (FK ajoutée après la table disputes en Chantier 6)
  dispute_id uuid,
  is_disputed boolean not null default false,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Indexes
create index if not exists orders_buyer_status_idx
  on public.orders (buyer_id, status, created_at desc);
create index if not exists orders_seller_status_idx
  on public.orders (seller_id, status, created_at desc);
create index if not exists orders_listing_idx on public.orders (listing_id);
create index if not exists orders_payment_intent_idx
  on public.orders (payment_intent_id) where payment_intent_id is not null;
create index if not exists orders_pending_deadlines_idx
  on public.orders (payment_deadline)
  where status = 'pending_payment';
create index if not exists orders_shipping_overdue_idx
  on public.orders (shipping_deadline)
  where status in ('paid', 'awaiting_shipment');
create index if not exists orders_disputed_idx
  on public.orders (created_at desc) where is_disputed = true;

-- updated_at trigger
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- =====================================================
-- 2. Fonction : génère un order_number unique au format DV-YYYY-XXXXXX
--    (XXXXXX = 6 chars hex aléatoire). Retry max 5x si collision.
-- =====================================================

create or replace function public.generate_order_number()
returns text
language plpgsql
volatile
as $$
declare
  attempt int := 0;
  candidate text;
  year_part text := to_char(now(), 'YYYY');
begin
  while attempt < 5 loop
    candidate := 'DV-' || year_part || '-' ||
      upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    if not exists (select 1 from public.orders where order_number = candidate) then
      return candidate;
    end if;
    attempt := attempt + 1;
  end loop;
  -- Fallback peu probable : fallback avec timestamp pour garantir unicité
  return 'DV-' || year_part || '-' ||
    upper(substring(extract(epoch from clock_timestamp())::text from 1 for 6));
end;
$$;

-- Trigger : set order_number = generate_order_number() si NULL à l'insert
create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.generate_order_number();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_number on public.orders;
create trigger orders_set_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- =====================================================
-- 3. RLS — orders
-- =====================================================

alter table public.orders enable row level security;

drop policy if exists "buyer and seller can read their orders" on public.orders;
create policy "buyer and seller can read their orders"
  on public.orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "buyer can create order" on public.orders;
create policy "buyer can create order"
  on public.orders for insert
  with check (buyer_id = auth.uid());

-- L'UPDATE est limité côté Server Action / RPC (transitions de statut
-- validées par fonction SECURITY DEFINER). Pour V1 on autorise buyer
-- et seller à update mais les fonctions RPC contrôleront les transitions
-- légales.
drop policy if exists "parties can update their orders" on public.orders;
create policy "parties can update their orders"
  on public.orders for update
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- =====================================================
-- 4. Table order_status_changes (historique)
-- =====================================================

create table if not exists public.order_status_changes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  -- Système (auto-cancel timeout) si NULL
  reason text,
  metadata jsonb
);

create index if not exists order_status_changes_order_idx
  on public.order_status_changes (order_id, changed_at desc);

-- Trigger : log automatiquement chaque changement de status sur orders
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (old.status is distinct from new.status) then
    insert into public.order_status_changes (
      order_id, from_status, to_status, changed_by, reason
    )
    values (
      new.id, old.status, new.status, auth.uid(), null
    );
  elsif tg_op = 'INSERT' then
    insert into public.order_status_changes (
      order_id, from_status, to_status, changed_by, reason
    )
    values (
      new.id, null, new.status, auth.uid(), 'order_created'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists orders_log_status_change on public.orders;
create trigger orders_log_status_change
  after insert or update of status on public.orders
  for each row execute function public.log_order_status_change();

-- RLS : lecture limitée aux parties de l'order
alter table public.order_status_changes enable row level security;

drop policy if exists "parties read order status history" on public.order_status_changes;
create policy "parties read order status history"
  on public.order_status_changes for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_status_changes.order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  ));

-- =====================================================
-- 5. Table order_shipping_details (livraison)
-- =====================================================

create table if not exists public.order_shipping_details (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,

  -- Méthode + transporteur
  method text not null
    check (method in (
      'pickup_in_person',
      'mondial_relay',
      'colissimo',
      'chronopost',
      'international_standard',
      'international_express',
      'custom'
    )),
  carrier text,

  -- Tracking
  tracking_number text,
  tracking_url text,

  -- Adresses (jsonb pour flexibilité — format AddressLine canonical)
  from_address jsonb,
  to_address jsonb,

  -- Point relais (si applicable)
  pickup_point jsonb,

  -- Étiquette d'expédition générée par le transporteur
  label_url text,
  label_purchased_at timestamptz,
  label_cost numeric(12, 2),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_shipping_tracking_idx
  on public.order_shipping_details (tracking_number)
  where tracking_number is not null;

drop trigger if exists order_shipping_set_updated_at on public.order_shipping_details;
create trigger order_shipping_set_updated_at
  before update on public.order_shipping_details
  for each row execute function public.set_updated_at();

alter table public.order_shipping_details enable row level security;

drop policy if exists "parties read shipping" on public.order_shipping_details;
create policy "parties read shipping"
  on public.order_shipping_details for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_shipping_details.order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  ));

drop policy if exists "seller manages shipping" on public.order_shipping_details;
create policy "seller manages shipping"
  on public.order_shipping_details for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_shipping_details.order_id
      and o.seller_id = auth.uid()
  ));

drop policy if exists "seller updates shipping" on public.order_shipping_details;
create policy "seller updates shipping"
  on public.order_shipping_details for update
  using (exists (
    select 1 from public.orders o
    where o.id = order_shipping_details.order_id
      and o.seller_id = auth.uid()
  ));

-- =====================================================
-- 6. Table order_tracking_events (push depuis webhooks transporteurs)
-- =====================================================

create table if not exists public.order_tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
    -- ex: 'label_created', 'pickup', 'in_transit', 'out_for_delivery',
    --     'delivered', 'returned', 'lost', 'damaged'
  event_at timestamptz not null,
  location text,
  description text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_tracking_events_order_idx
  on public.order_tracking_events (order_id, event_at desc);

alter table public.order_tracking_events enable row level security;

drop policy if exists "parties read tracking events" on public.order_tracking_events;
create policy "parties read tracking events"
  on public.order_tracking_events for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_tracking_events.order_id
      and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  ));

-- =====================================================
-- 7. Realtime (idempotent)
-- =====================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'order_status_changes'
    ) then
      alter publication supabase_realtime add table public.order_status_changes;
    end if;
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'order_tracking_events'
    ) then
      alter publication supabase_realtime add table public.order_tracking_events;
    end if;
  end if;
end $$;
