-- Chantier Live Streaming DIVARC — Étape 13 : Tips (pourboires Stripe)
-- ======================================================================
--
-- Viewer envoie un montant rapide (1/2/5/10€ ou custom) au host via
-- Stripe Connect direct charge. DIVARC retient 10% (cohérent avec
-- l'app fee subscription Sprint C). Le reste va au compte connecté du
-- host.
--
-- Flow paiement :
--   1. Viewer clique sur un montant → createLiveTipCheckout server action
--   2. Stripe Checkout Session créée (mode=payment) sur compte connecté
--   3. INSERT live_tips status='pending'
--   4. Viewer redirigé vers Stripe Checkout → paie
--   5. Webhook checkout.session.completed → status='paid' + increment
--      circle_live_rooms.revenue_total_cents
--
-- IDEMPOTENT.

BEGIN;

CREATE TABLE IF NOT EXISTS public.live_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  /* viewer = sender. */
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  /* host = recipient (dénormalisé pour query rapide). */
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Montant en cents (min 100 = 1€, max 50000 = 500€). */
  amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 100 AND 50000),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  /* Stripe Checkout session ID + payment intent ID (post-success). */
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  /* Répartition 90/10 % stockée pour audit. */
  host_amount_cents integer NOT NULL,
  platform_amount_cents integer NOT NULL,
  /* Message optionnel court (max 200 chars). */
  message text CHECK (message IS NULL OR char_length(message) <= 200),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_tips_session_idx
  ON public.live_tips (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS live_tips_host_idx
  ON public.live_tips (host_id, created_at DESC);
CREATE INDEX IF NOT EXISTS live_tips_viewer_idx
  ON public.live_tips (viewer_id, created_at DESC);

ALTER TABLE public.live_tips ENABLE ROW LEVEL SECURITY;

/* SELECT : viewer (sender) voit ses propres tips, host voit ceux reçus,
   personne d'autre. */
DROP POLICY IF EXISTS live_tips_select ON public.live_tips;
CREATE POLICY live_tips_select
  ON public.live_tips FOR SELECT
  USING (
    auth.uid() = viewer_id OR auth.uid() = host_id
  );

/* INSERT/UPDATE : aucune policy publique. Géré uniquement par Server
   Actions (auth viewer_id = uid) ou webhook service role. */

COMMIT;
