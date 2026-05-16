-- ============================================================================
-- 0160_virtual_gifts.sql — Étape 16/25 Live Streaming
--
-- Cadeaux virtuels payants envoyés pendant les lives (pattern TikTok/Bigo).
--
-- 2 tables :
--   virtual_gifts      : catalogue figé (rose, cœur, fleur, lion, fusée…)
--   live_gift_sends    : log des envois (qui, quoi, quand, paid)
--
-- Stripe Connect direct charge sur le compte du host, app fee 10%
-- (cohérent avec tips/super-chats). Rendu UI : icône lucide + couleur +
-- animation CSS de montée + fade-out.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.virtual_gifts (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  icon_name text NOT NULL,
  color text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 49 AND 50000),
  rank integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_gifts ENABLE ROW LEVEL SECURITY;

-- SELECT : public (auth.users + anon en lecture pour pricing pages).
DROP POLICY IF EXISTS virtual_gifts_select ON public.virtual_gifts;
CREATE POLICY virtual_gifts_select
  ON public.virtual_gifts
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Seed catalogue V1 (7 cadeaux).
INSERT INTO public.virtual_gifts (id, label, description, icon_name, color, amount_cents, rank)
VALUES
  ('rose',    'Rose',    'Un petit signe d''affection.',     'Flower',     '#f43f5e',  49,  1),
  ('heart',   'Cœur',    'Le classique qui fait toujours plaisir.', 'Heart',     '#ec4899',  99,  2),
  ('star',    'Étoile',  'Pour briller dans la nuit.',       'Star',       '#fbbf24', 199,  3),
  ('flame',   'Flamme',  'Le live est en feu !',             'Flame',      '#f97316', 499,  4),
  ('crown',   'Couronne','Pour le roi/la reine du live.',    'Crown',      '#a855f7', 999,  5),
  ('rocket',  'Fusée',   'Boost ultime — on décolle !',      'Rocket',     '#06b6d4', 1999, 6),
  ('castle',  'Château', 'Le cadeau légendaire.',            'Castle',     '#f59e0b', 4999, 7)
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    color = EXCLUDED.color,
    amount_cents = EXCLUDED.amount_cents,
    rank = EXCLUDED.rank;

-- ============================================================================
-- live_gift_sends : log des envois
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_gift_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id text NOT NULL REFERENCES public.virtual_gifts(id),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  host_amount_cents integer NOT NULL,
  platform_amount_cents integer NOT NULL,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_gift_sends_session
  ON public.live_gift_sends (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_gift_sends_paid
  ON public.live_gift_sends (session_id, paid_at DESC)
  WHERE status = 'paid';
CREATE INDEX IF NOT EXISTS idx_live_gift_sends_viewer
  ON public.live_gift_sends (viewer_id, created_at DESC);

ALTER TABLE public.live_gift_sends ENABLE ROW LEVEL SECURITY;

-- SELECT : viewer OU host.
DROP POLICY IF EXISTS live_gift_sends_select ON public.live_gift_sends;
CREATE POLICY live_gift_sends_select
  ON public.live_gift_sends
  FOR SELECT
  TO authenticated
  USING (
    viewer_id = (SELECT auth.uid()) OR host_id = (SELECT auth.uid())
  );

-- INSERT : viewer crée ses propres lignes (Server Action authentifiée).
-- WITH CHECK gère l'intégrité ; pas d'UPDATE policy = updates bloqués
-- côté client. Le webhook utilise service role (bypass RLS).
DROP POLICY IF EXISTS live_gift_sends_insert_self ON public.live_gift_sends;
CREATE POLICY live_gift_sends_insert_self
  ON public.live_gift_sends
  FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = (SELECT auth.uid()));

-- ============================================================================
-- RPC : list_recent_gifts(session_id, since_seconds)
--
-- Retourne les cadeaux payés récents pour un live (animation overlay
-- côté viewer + host). SECURITY DEFINER : bypass RLS pour permettre à
-- tous les viewers de voir le flux global.
--
-- Limite 30 derniers, max 60 secondes en arrière (filtre côté caller).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_recent_gifts(
  p_session_id uuid,
  p_since_seconds integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  gift_id text,
  gift_label text,
  gift_icon_name text,
  gift_color text,
  amount_cents integer,
  paid_at timestamptz,
  viewer_id uuid,
  viewer_full_name text,
  viewer_username text,
  viewer_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.gift_id,
    g.label AS gift_label,
    g.icon_name AS gift_icon_name,
    g.color AS gift_color,
    s.amount_cents,
    s.paid_at,
    s.viewer_id,
    p.full_name AS viewer_full_name,
    p.username AS viewer_username,
    p.avatar_url AS viewer_avatar_url
  FROM public.live_gift_sends s
  JOIN public.virtual_gifts g ON g.id = s.gift_id
  LEFT JOIN public.profiles p ON p.id = s.viewer_id
  WHERE s.session_id = p_session_id
    AND s.status = 'paid'
    AND s.paid_at IS NOT NULL
    AND s.paid_at > now() - make_interval(secs => GREATEST(p_since_seconds, 5))
  ORDER BY s.paid_at DESC
  LIMIT 30;
$$;

REVOKE ALL ON FUNCTION public.list_recent_gifts(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_recent_gifts(uuid, integer) TO authenticated;

COMMENT ON TABLE public.virtual_gifts IS
  'Étape 16 : catalogue cadeaux virtuels figés (rose, cœur, étoile, flamme, couronne, fusée, château).';
COMMENT ON TABLE public.live_gift_sends IS
  'Étape 16 : log des cadeaux envoyés pendant les lives (Stripe Connect direct charge).';

-- ============================================================================
-- Fix RLS rétroactif : ajoute les policies INSERT manquantes pour
-- live_tips (étape 13/0157) et creator_subscriptions (étape 15/0159).
-- Sans ça, les Server Actions échouent silencieusement quand le client
-- user (non admin) tente d'INSERT.
-- ============================================================================

DROP POLICY IF EXISTS live_tips_insert_self ON public.live_tips;
CREATE POLICY live_tips_insert_self
  ON public.live_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = (SELECT auth.uid()));

/* creator_subscriptions : INSERT via createCreatorSubscriptionCheckout
   utilise admin client. Mais on garde une policy permissive minimale
   permettant subscriber_id = auth.uid() pour les fallbacks et tests
   end-to-end sans service role key. */
DROP POLICY IF EXISTS creator_subs_no_insert ON public.creator_subscriptions;
DROP POLICY IF EXISTS creator_subs_insert_self ON public.creator_subscriptions;
CREATE POLICY creator_subs_insert_self
  ON public.creator_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (subscriber_id = (SELECT auth.uid()));
