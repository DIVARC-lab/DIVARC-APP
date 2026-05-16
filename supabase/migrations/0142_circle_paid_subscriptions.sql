-- Chantier Cercles v4 — Sprint C étape C.1 : Cercles payants (subscriptions)
-- ===========================================================================
--
-- Ajoute la monétisation par abonnement mensuel pour les cercles. Le owner
-- active le paid mode + définit un prix → Stripe Subscription (récurrent
-- mensuel) + redirection paywall pour les non-abonnés.
--
-- Architecture :
--   circles : 6 nouveaux champs paid mode (is_paid, price_cents, currency,
--             billing_period, stripe_product_id, stripe_price_id, trial_days)
--   circle_subscriptions : 1 ligne par souscription Stripe (status, cycle,
--                          cancel_at_period_end). Source de vérité depuis
--                          les webhooks.
--   circle_members.subscription_status : reste source d'autorité côté DIVARC
--             pour gating l'accès — synchronisé via trigger depuis
--             circle_subscriptions.
--
-- Sécurité accès : un membre payant n'est "actif" pour le contenu qu'avec
-- subscription_status = 'active' ET le cercle considère le membership.
-- Pour V1 : la fonction is_circle_active_member existante reste valable
-- côté texte (un membre listé est listé) et on ajoute un helper
-- is_circle_paying_or_free pour le gating de contenu paid-only.
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. Champs paid sur circles
-- ============================================================

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS price_cents integer
    CHECK (price_cents IS NULL OR price_cents BETWEEN 100 AND 100000);

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR'
    CHECK (currency IN ('EUR'));

/* V1 : monthly uniquement. Garde le champ pour évoluer (annual/lifetime). */
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly'));

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS stripe_product_id text;

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

/* Trial gratuit (jours) — 0 = pas de trial. Sera passé à Stripe via
   subscription_data.trial_period_days lors du checkout. */
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0
    CHECK (trial_days BETWEEN 0 AND 30);

-- Cohérence : si is_paid=true → price_cents + stripe_price_id obligatoires.
ALTER TABLE public.circles
  DROP CONSTRAINT IF EXISTS circles_paid_requires_price;
ALTER TABLE public.circles
  ADD CONSTRAINT circles_paid_requires_price CHECK (
    is_paid = false OR (price_cents IS NOT NULL AND stripe_price_id IS NOT NULL)
  );

-- ============================================================
-- 2. Table circle_subscriptions
-- ============================================================
--
-- 1 ligne = 1 souscription Stripe (= 1 user × 1 cercle).
-- Un user peut avoir une seule subscription ACTIVE par cercle (unique
-- partial index plus bas). En cas de cancel + nouveau plan, on garde
-- l'historique en plusieurs lignes.

CREATE TABLE IF NOT EXISTS public.circle_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  /* Stripe references. */
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  stripe_price_id text NOT NULL,

  /* Status miroir de stripe Subscription.status :
     incomplete, incomplete_expired, trialing, active, past_due,
     canceled, unpaid, paused. */
  status text NOT NULL
    CHECK (status IN (
      'incomplete', 'incomplete_expired',
      'trialing', 'active', 'past_due',
      'canceled', 'unpaid', 'paused'
    )),

  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circle_subs_circle_user_idx
  ON public.circle_subscriptions (circle_id, user_id);

CREATE INDEX IF NOT EXISTS circle_subs_user_idx
  ON public.circle_subscriptions (user_id);

/* Une seule subscription "ouverte" (trialing/active/past_due) par
   user × cercle. Les terminées (canceled/unpaid/expired) peuvent
   coexister en historique. */
CREATE UNIQUE INDEX IF NOT EXISTS circle_subs_one_open_per_member_idx
  ON public.circle_subscriptions (circle_id, user_id)
  WHERE status IN ('trialing', 'active', 'past_due');

-- ============================================================
-- 3. RLS circle_subscriptions
-- ============================================================

ALTER TABLE public.circle_subscriptions ENABLE ROW LEVEL SECURITY;

/* SELECT : le user voit ses propres subscriptions + l'owner du cercle
   voit toutes les subscriptions de son cercle. */
DROP POLICY IF EXISTS circle_subs_select ON public.circle_subscriptions;
CREATE POLICY circle_subs_select
  ON public.circle_subscriptions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_subscriptions.circle_id
        AND c.owner_id = auth.uid()
    )
  );

/* INSERT/UPDATE/DELETE : aucun direct via API. Seuls les SECURITY DEFINER
   functions (webhook handler côté Server Action) écrivent. */

-- ============================================================
-- 4. Trigger sync circle_members.subscription_status
-- ============================================================
--
-- Quand circle_subscriptions change, on met à jour le miroir sur
-- circle_members.subscription_status pour back-compat avec le code
-- existant + les RLS qui regardent ce champ.

CREATE OR REPLACE FUNCTION public.tg_sync_member_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_status text;
  v_circle_id UUID;
  v_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_circle_id := OLD.circle_id;
    v_user_id := OLD.user_id;
  ELSE
    v_circle_id := NEW.circle_id;
    v_user_id := NEW.user_id;
  END IF;

  /* Mapping Stripe status → DIVARC subscription_status. */
  SELECT CASE
    WHEN status IN ('trialing', 'active') THEN 'active'
    WHEN status IN ('canceled', 'unpaid', 'incomplete_expired') THEN 'cancelled'
    WHEN status = 'past_due' THEN 'active'
    ELSE NULL
  END
    INTO v_member_status
    FROM public.circle_subscriptions
   WHERE circle_id = v_circle_id
     AND user_id = v_user_id
     AND status IN ('trialing', 'active', 'past_due')
   ORDER BY updated_at DESC
   LIMIT 1;

  /* Si aucune subscription "ouverte" trouvée, le member est cancelled. */
  IF v_member_status IS NULL THEN
    v_member_status := 'cancelled';
  END IF;

  UPDATE public.circle_members
     SET subscription_status = v_member_status,
         subscription_started_at = CASE
           WHEN v_member_status = 'active' AND subscription_started_at IS NULL
             THEN now()
           ELSE subscription_started_at
         END,
         subscription_renews_at = (
           SELECT current_period_end FROM public.circle_subscriptions
            WHERE circle_id = v_circle_id AND user_id = v_user_id
              AND status IN ('trialing', 'active', 'past_due')
            ORDER BY updated_at DESC LIMIT 1
         )
   WHERE circle_id = v_circle_id AND user_id = v_user_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_sync_member_subscription_status_trg ON public.circle_subscriptions;
CREATE TRIGGER tg_sync_member_subscription_status_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.circle_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_member_subscription_status();

-- ============================================================
-- 5. Helper RPC has_paid_access(circle_id, user_id)
-- ============================================================
--
-- True si :
--   - le cercle est gratuit (is_paid = false), OU
--   - l'user est owner du cercle, OU
--   - l'user a une subscription ouverte (trialing/active/past_due).

CREATE OR REPLACE FUNCTION public.has_paid_access(
  p_circle_id UUID,
  p_user_id UUID
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_user_id IS NULL THEN false
      WHEN NOT EXISTS (
        SELECT 1 FROM public.circles WHERE id = p_circle_id AND is_paid = true
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.circles
         WHERE id = p_circle_id AND owner_id = p_user_id
      ) THEN true
      ELSE EXISTS (
        SELECT 1 FROM public.circle_subscriptions
         WHERE circle_id = p_circle_id
           AND user_id = p_user_id
           AND status IN ('trialing', 'active', 'past_due')
      )
    END;
$$;

GRANT EXECUTE ON FUNCTION public.has_paid_access(UUID, UUID) TO authenticated;

-- ============================================================
-- 6. updated_at trigger sur circle_subscriptions
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_circle_subs_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_circle_subs_touch_updated_at_trg ON public.circle_subscriptions;
CREATE TRIGGER tg_circle_subs_touch_updated_at_trg
  BEFORE UPDATE ON public.circle_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_circle_subs_touch_updated_at();

COMMIT;
