-- Chantier 5 — Stripe Connect Express (onboarding marchand).
--
-- Stocke l'identifiant et le statut du compte Stripe Connect Express du
-- vendeur sur sa ligne `profiles`. Le PaymentIntent associé à chaque order
-- existe déjà dans orders.payment_intent_id (cf. migration 0084).
--
-- Status v1 :
--   - not_started   : pas d'onboarding lancé
--   - onboarding    : compte créé, lien généré mais non finalisé
--   - restricted    : Stripe a accepté mais demande des infos additionnelles
--   - enabled       : peut recevoir des paiements (charges_enabled + payouts_enabled)
--   - disabled      : Stripe a désactivé (KYC échoué, fraude, etc.)
--
-- Les flags `charges_enabled`, `payouts_enabled`, `details_submitted` sont
-- maintenus par le webhook `account.updated` (cf. lib/stripe + API route).

alter table public.profiles
  add column if not exists stripe_connect_account_id text unique;

alter table public.profiles
  add column if not exists stripe_connect_status text not null default 'not_started';

alter table public.profiles
  drop constraint if exists profiles_stripe_connect_status_check;
alter table public.profiles
  add constraint profiles_stripe_connect_status_check
  check (stripe_connect_status in (
    'not_started',
    'onboarding',
    'restricted',
    'enabled',
    'disabled'
  ));

alter table public.profiles
  add column if not exists stripe_charges_enabled boolean not null default false;

alter table public.profiles
  add column if not exists stripe_payouts_enabled boolean not null default false;

alter table public.profiles
  add column if not exists stripe_details_submitted boolean not null default false;

alter table public.profiles
  add column if not exists stripe_connect_updated_at timestamptz;

create index if not exists profiles_stripe_connect_idx
  on public.profiles (stripe_connect_account_id)
  where stripe_connect_account_id is not null;
