-- ============================================================================
-- 0159_creator_subscriptions.sql — Étape 15/25 Live Streaming
--
-- Abonnements mensuels récurrents user → user (subscriber → creator).
-- Distinct des circle_subscriptions (Sprint C) qui sont user → cercle.
--
-- 3 tiers de soutien :
--   Tier 1  4.99 €/mois  — Soutien
--   Tier 2  9.99 €/mois  — Fan
--   Tier 3 24.99 €/mois  — Super-fan (badge spécial, futur perks)
--
-- Stripe Connect : abonnements créés sur le compte connecté du creator,
-- application_fee_percent = 10 %. Direct charge — règle 90/10 cohérente
-- avec tips/super-chats.
--
-- Sert aussi de gate pour les lives visibility='subscribers_only'.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  tier integer NOT NULL CHECK (tier IN (1, 2, 3)),

  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  stripe_price_id text,

  status text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN (
      'incomplete', 'incomplete_expired',
      'trialing', 'active', 'past_due',
      'canceled', 'unpaid', 'paused'
    )),

  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,

  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  /* Un user ne peut avoir qu'UN abonnement actif vers un creator donné.
     Si change de tier → on update la subscription existante côté Stripe. */
  CONSTRAINT creator_subscriptions_unique_pair
    UNIQUE (subscriber_id, creator_id),
  CONSTRAINT creator_subscriptions_no_self
    CHECK (subscriber_id <> creator_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_subs_creator
  ON public.creator_subscriptions (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_subs_subscriber
  ON public.creator_subscriptions (subscriber_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_subs_stripe
  ON public.creator_subscriptions (stripe_subscription_id);

ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT : subscriber OU creator
DROP POLICY IF EXISTS creator_subs_select ON public.creator_subscriptions;
CREATE POLICY creator_subs_select
  ON public.creator_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    subscriber_id = (SELECT auth.uid()) OR creator_id = (SELECT auth.uid())
  );

-- INSERT/UPDATE : interdits côté client. Tout passe par Server Actions
-- + webhook avec service role.
DROP POLICY IF EXISTS creator_subs_no_insert ON public.creator_subscriptions;
CREATE POLICY creator_subs_no_insert
  ON public.creator_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS creator_subs_no_update ON public.creator_subscriptions;
CREATE POLICY creator_subs_no_update
  ON public.creator_subscriptions
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.creator_subs_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_subs_updated_at
  ON public.creator_subscriptions;
CREATE TRIGGER trg_creator_subs_updated_at
  BEFORE UPDATE ON public.creator_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.creator_subs_set_updated_at();

-- ============================================================================
-- Helper RPC : has_active_creator_subscription(creator_id)
--
-- Retourne true si auth.uid() a un abonnement actif (active|trialing) vers
-- le creator. Utilisé pour gate les lives subscribers_only sans avoir à
-- exposer la table aux viewers du live.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_active_creator_subscription(
  p_creator_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creator_subscriptions
    WHERE subscriber_id = auth.uid()
      AND creator_id = p_creator_id
      AND status IN ('active', 'trialing')
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_creator_subscription(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_creator_subscription(uuid) TO authenticated;

COMMENT ON TABLE public.creator_subscriptions IS
  'Étape 15 : Abonnements mensuels récurrents user → user (subscriber → creator). 3 tiers via Stripe Connect direct charge.';
