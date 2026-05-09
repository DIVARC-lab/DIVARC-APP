-- =====================================================
-- DIVARC — Migration 0037 : Marketplace negotiation (offers)
--   - Un acheteur peut envoyer une offre prix sur un listing actif.
--   - Le vendeur peut accepter, refuser, ou contre-offrir.
--   - Une « négociation » est représentée par une chaîne d'offres
--     entre acheteur + vendeur sur le même listing (parent_offer_id
--     pour reconstituer le thread).
--   - Quand une offre est `accepted`, le listing passe en `sold` et
--     l'offre `accepted_at` est figée.
-- =====================================================

create type public.listing_offer_status as enum (
  'pending',
  'accepted',
  'declined',
  'countered',
  'expired',
  'withdrawn'
);

create table if not exists public.listing_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  /* `from_user` est l'envoyeur de cette offre (peut être l'acheteur OU le
     vendeur quand il contre-offre). On peut donc reconstituer "qui parle"
     en comparant à `listings.seller_id`. */
  from_user uuid not null references public.profiles(id) on delete cascade,
  /* `to_user` est explicite pour simplifier les queries RLS et pour le
     thread "mes offres reçues / envoyées". */
  to_user uuid not null references public.profiles(id) on delete cascade,
  /* `parent_offer_id` chaîne les contre-offres pour reconstituer un thread.
     NULL = première offre du buyer. */
  parent_offer_id uuid references public.listing_offers(id) on delete set null,
  amount integer not null check (amount > 0),
  currency text not null check (length(currency) = 3),
  message text check (message is null or length(message) <= 500),
  status public.listing_offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  /* Expiration auto au bout de 48h pour éviter les zombies en pending. */
  expires_at timestamptz not null default (now() + interval '48 hours')
);

create index if not exists listing_offers_listing_idx
  on public.listing_offers (listing_id, created_at desc);
create index if not exists listing_offers_from_user_idx
  on public.listing_offers (from_user, created_at desc);
create index if not exists listing_offers_to_user_idx
  on public.listing_offers (to_user, created_at desc);

alter table public.listing_offers enable row level security;

/* Lecture : seuls le from_user et le to_user voient l'offre. */
create policy "listing_offers_select_participants"
  on public.listing_offers for select
  using (
    auth.uid() = from_user or auth.uid() = to_user
  );

/* Insertion : le from_user doit être l'utilisateur authentifié. La logique
   métier (vérifier qu'on n'envoie pas une offre à soi-même, que le listing
   est actif, etc.) est portée par les server actions. */
create policy "listing_offers_insert_self"
  on public.listing_offers for insert
  with check (auth.uid() = from_user);

/* Update : le to_user (recipient) peut accepter / décliner / contre-offrir.
   Le from_user peut withdraw. La transition d'états est gérée côté action. */
create policy "listing_offers_update_recipient_or_sender"
  on public.listing_offers for update
  using (auth.uid() = from_user or auth.uid() = to_user)
  with check (auth.uid() = from_user or auth.uid() = to_user);

comment on table public.listing_offers is
  'Offres / contre-offres sur les listings marketplace. Chaîne via parent_offer_id.';
comment on column public.listing_offers.parent_offer_id is
  'NULL pour la première offre du buyer, sinon FK vers l''offre précédente du thread.';
comment on column public.listing_offers.expires_at is
  'Expiration auto à +48h (offres pending uniquement, ignoré si accepted/declined/etc).';

-- =====================================================
-- RPC : accept_listing_offer
--   Atomique : marque l'offre `accepted` ET le listing `sold`.
--   Marque aussi toutes les autres offres pending sur ce listing en
--   `declined` (le bien n'est plus disponible).
--   Sécurité : SECURITY DEFINER pour bypasser RLS sur listings (le
--   destinataire de l'offre est le seller et a le droit légitime).
--   Vérifie auth.uid() = listing.seller_id avant tout.
-- =====================================================
create or replace function public.accept_listing_offer(offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.listing_offers%rowtype;
  v_listing public.listings%rowtype;
begin
  select * into v_offer from public.listing_offers where id = offer_id;
  if not found then
    raise exception 'Offer not found';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'Offer is not pending';
  end if;

  select * into v_listing from public.listings where id = v_offer.listing_id;
  if not found then
    raise exception 'Listing not found';
  end if;
  if auth.uid() <> v_listing.seller_id then
    raise exception 'Not authorized: only the seller can accept';
  end if;
  if v_listing.status <> 'active' then
    raise exception 'Listing is not active';
  end if;

  -- Accept the offer
  update public.listing_offers
    set status = 'accepted', responded_at = now()
    where id = v_offer.id;

  -- Decline all other pending offers on the same listing (the item is sold)
  update public.listing_offers
    set status = 'declined', responded_at = now()
    where listing_id = v_offer.listing_id
      and status = 'pending'
      and id <> v_offer.id;

  -- Mark listing as sold
  update public.listings
    set status = 'sold', sold_at = now()
    where id = v_offer.listing_id;
end;
$$;

revoke all on function public.accept_listing_offer(uuid) from public;
grant execute on function public.accept_listing_offer(uuid) to authenticated;
