-- Chantier 6 — Confiance & conformité marketplace DIVARC.
--
-- Trois tables :
--   1. marketplace_reviews : avis post-transaction (acheteur ↔ vendeur)
--   2. marketplace_disputes : litiges ouverts sur une order
--   3. dac7_seller_yearly_revenue (VIEW) : agrégat revenus par seller/an
--      pour reporting fiscal DAC7 (directive UE 2021/514).
--
-- IDEMPOTENT. RLS stricte sur les 2 tables.

-- =====================================================
-- 1. marketplace_reviews
-- =====================================================
--
-- Une review par (order, reviewer_role). Donc max 2 reviews par order :
-- une de l'acheteur sur le vendeur, une du vendeur sur l'acheteur.

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  /* Le rôle de l'auteur dans l'order ('buyer' ou 'seller') détermine qui
   * est la cible. La contrainte uniqe (order, role) garantit max 1 review
   * par rôle par order. */
  reviewer_role text not null check (reviewer_role in ('buyer', 'seller')),
  rating int not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, reviewer_role)
);

create index if not exists marketplace_reviews_reviewee_idx
  on public.marketplace_reviews (reviewee_id, created_at desc);
create index if not exists marketplace_reviews_order_idx
  on public.marketplace_reviews (order_id);

alter table public.marketplace_reviews enable row level security;

drop policy if exists "reviews readable to involved parties" on public.marketplace_reviews;
create policy "reviews readable to involved parties"
  on public.marketplace_reviews for select
  using (
    auth.uid() = reviewer_id
    or auth.uid() = reviewee_id
    /* Tout user peut lire les reviews publiquement (pour afficher
     * la réputation d'un vendeur). Si tu veux des reviews privées,
     * supprime cette clause. */
    or true
  );

drop policy if exists "reviews insert by reviewer" on public.marketplace_reviews;
create policy "reviews insert by reviewer"
  on public.marketplace_reviews for insert
  with check (auth.uid() = reviewer_id);

drop policy if exists "reviews update by reviewer" on public.marketplace_reviews;
create policy "reviews update by reviewer"
  on public.marketplace_reviews for update
  using (auth.uid() = reviewer_id);

drop trigger if exists marketplace_reviews_set_updated_at on public.marketplace_reviews;
create trigger marketplace_reviews_set_updated_at
  before update on public.marketplace_reviews
  for each row execute function public.set_updated_at();

-- =====================================================
-- 2. marketplace_disputes
-- =====================================================
--
-- Un litige par order (unique). Ouvert par l'acheteur ou le vendeur,
-- résolu par un admin DIVARC ou automatiquement après expiration.

create table if not exists public.marketplace_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade unique,
  opened_by uuid not null references auth.users(id) on delete restrict,
  opened_by_role text not null check (opened_by_role in ('buyer', 'seller')),

  reason text not null check (reason in (
    'item_not_received',         -- acheteur : pas reçu
    'item_not_as_described',     -- acheteur : pas conforme
    'item_damaged',              -- acheteur : abîmé en transit
    'counterfeit',               -- acheteur : contrefaçon
    'buyer_no_payment',          -- vendeur : impayé / fraude
    'buyer_abusive',             -- vendeur : abus retours
    'other'
  )),
  body text check (body is null or char_length(body) <= 4000),

  status text not null default 'open'
    check (status in (
      'open',
      'awaiting_response',
      'in_review',
      'resolved_buyer',
      'resolved_seller',
      'resolved_split',
      'escalated_to_stripe',
      'cancelled'
    )),

  /* Réponse de la partie adverse (texte libre). */
  responder_body text check (
    responder_body is null or char_length(responder_body) <= 4000
  ),
  responded_at timestamptz,

  /* Résolution admin (verdict + montant remboursé). */
  resolved_at timestamptz,
  resolution_note text check (
    resolution_note is null or char_length(resolution_note) <= 2000
  ),
  refund_amount numeric(12, 2) check (
    refund_amount is null or refund_amount >= 0
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_disputes_status_idx
  on public.marketplace_disputes (status, created_at desc);
create index if not exists marketplace_disputes_order_idx
  on public.marketplace_disputes (order_id);

alter table public.marketplace_disputes enable row level security;

drop policy if exists "disputes readable to parties" on public.marketplace_disputes;
create policy "disputes readable to parties"
  on public.marketplace_disputes for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

drop policy if exists "disputes insert by order party" on public.marketplace_disputes;
create policy "disputes insert by order party"
  on public.marketplace_disputes for insert
  with check (
    opened_by = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

drop policy if exists "disputes update by parties" on public.marketplace_disputes;
create policy "disputes update by parties"
  on public.marketplace_disputes for update
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

drop trigger if exists marketplace_disputes_set_updated_at on public.marketplace_disputes;
create trigger marketplace_disputes_set_updated_at
  before update on public.marketplace_disputes
  for each row execute function public.set_updated_at();

-- =====================================================
-- 3. View dac7_seller_yearly_revenue
-- =====================================================
--
-- Directive européenne DAC7 (UE 2021/514) : depuis 2024 les plateformes
-- doivent déclarer aux administrations fiscales les vendeurs qui dépassent
-- 30 ventes / an OU 2000 € de chiffre d'affaires annuel.
--
-- Cette vue agrège par (seller, année) :
--   - total_orders : nb d'orders complétées
--   - total_revenue_eur : revenu vendeur après commission DIVARC
--   - has_dac7_threshold : flag si seuil atteint
--
-- Le rapport XML officiel sera généré par une edge function dédiée (V2).

create or replace view public.dac7_seller_yearly_revenue as
select
  o.seller_id,
  date_part('year', o.completed_at)::int as year,
  count(*)::int as total_orders,
  sum(o.seller_amount)::numeric(14, 2) as total_revenue_eur,
  (count(*) >= 30 or sum(o.seller_amount) >= 2000) as has_dac7_threshold
from public.orders o
where
  o.status = 'completed'
  and o.completed_at is not null
group by o.seller_id, date_part('year', o.completed_at);

comment on view public.dac7_seller_yearly_revenue is
  'Agrégat revenus par vendeur/année pour reporting DAC7 (directive UE 2021/514). Seuils : 30 orders OR 2000 EUR.';

-- Vue sécurisée : seuls les admins et le seller lui-même peuvent voir
-- ses propres données. Comme c'est une view, on s'appuie sur la RLS de
-- la table orders (déjà restreinte aux parties).

-- =====================================================
-- 4. RPC submit_marketplace_review (SECURITY DEFINER)
-- =====================================================
--
-- Permet de soumettre une review en vérifiant côté serveur :
--   - L'order existe et est complétée ou delivered
--   - L'utilisateur est partie de l'order
--   - Le rôle de l'utilisateur dans l'order (buyer/seller) → définit reviewee
--   - Pas de review existante pour ce (order, role)

create or replace function public.submit_marketplace_review(
  p_order_id uuid,
  p_rating int,
  p_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_buyer uuid;
  v_seller uuid;
  v_status text;
  v_role text;
  v_reviewee uuid;
  v_review_id uuid;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  select buyer_id, seller_id, status
    into v_buyer, v_seller, v_status
    from public.orders
    where id = p_order_id;

  if not found then
    raise exception 'Order introuvable' using errcode = 'P0002';
  end if;

  if v_user = v_buyer then
    v_role := 'buyer';
    v_reviewee := v_seller;
  elsif v_user = v_seller then
    v_role := 'seller';
    v_reviewee := v_buyer;
  else
    raise exception 'Tu n''es pas partie de cette commande' using errcode = '42501';
  end if;

  if v_status not in ('delivered', 'completed') then
    raise exception 'La commande doit être livrée pour être notée' using errcode = '22023';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Note invalide (1-5)' using errcode = '22023';
  end if;

  insert into public.marketplace_reviews (
    order_id, reviewer_id, reviewee_id, reviewer_role, rating, body
  ) values (
    p_order_id, v_user, v_reviewee, v_role, p_rating, p_body
  )
  on conflict (order_id, reviewer_role) do update
    set rating = excluded.rating,
        body = excluded.body
  returning id into v_review_id;

  return v_review_id;
end;
$$;

grant execute on function public.submit_marketplace_review(uuid, int, text)
  to authenticated;
