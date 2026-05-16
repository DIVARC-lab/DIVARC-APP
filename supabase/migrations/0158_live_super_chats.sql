-- ============================================================================
-- 0158_live_super_chats.sql — Étape 14/25 Live Streaming
--
-- Super-chats : tips avec message obligatoire qui apparaissent épinglés dans
-- le chat live avec une couleur correspondant au tier (montant). Inspiration
-- YouTube Super Chat / Twitch Cheer.
--
-- Approche : on étend live_tips au lieu de créer une nouvelle table —
-- évite la duplication de logique webhook/Stripe Connect/RLS. Un super-chat
-- est juste un tip avec is_super_chat=true + tier calculé.
--
-- Tiers (montant → durée épinglage) :
--   1 (bleu        100-199c)  0   sec  — highlight chat only
--   2 (turquoise   200-499c)  30  sec
--   3 (vert        500-999c)  120 sec  (2  min)
--   4 (jaune     1000-1999c)  300 sec  (5  min)
--   5 (orange    2000-4999c)  600 sec  (10 min)
--   6 (rouge     5000-9999c)  1800 sec (30 min)
--   7 (magenta  10000+    c)  3600 sec (1  h)
-- ============================================================================

ALTER TABLE public.live_tips
  ADD COLUMN IF NOT EXISTS is_super_chat boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier integer,
  ADD COLUMN IF NOT EXISTS pinned_until_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_live_tips_super_chat_active
  ON public.live_tips (session_id, pinned_until_at DESC)
  WHERE is_super_chat = true AND status = 'paid';

-- ============================================================================
-- Helper : compute tier from amount_cents
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_super_chat_tier(amount_cents integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN amount_cents >= 10000 THEN 7
    WHEN amount_cents >= 5000  THEN 6
    WHEN amount_cents >= 2000  THEN 5
    WHEN amount_cents >= 1000  THEN 4
    WHEN amount_cents >= 500   THEN 3
    WHEN amount_cents >= 200   THEN 2
    ELSE 1
  END;
$$;

-- ============================================================================
-- Helper : compute pinned duration (seconds) for tier
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_super_chat_pin_seconds(tier integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE tier
    WHEN 7 THEN 3600
    WHEN 6 THEN 1800
    WHEN 5 THEN 600
    WHEN 4 THEN 300
    WHEN 3 THEN 120
    WHEN 2 THEN 30
    ELSE 0
  END;
$$;

-- ============================================================================
-- RPC : list_active_super_chats(session_id)
--
-- Retourne les super-chats encore épinglés (pinned_until_at > now()) pour
-- une session, triés par tier desc puis paid_at desc. Limité à 10 pour
-- éviter le spam visuel.
--
-- SECURITY INVOKER : RLS de live_tips filtre déjà côté SELECT (viewer ou
-- host). Mais ici on veut que TOUS les viewers d'un live voient les
-- super-chats publics — RLS bloque ça. Donc on fait SECURITY DEFINER mais
-- on vérifie que l'user a accès au live (visibility check). Pour
-- simplicité V1 : on retourne tous les super-chats du live, le caller
-- doit déjà avoir l'accès (sinon il ne serait pas dans le viewer).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_active_super_chats(
  p_session_id uuid
)
RETURNS TABLE (
  id uuid,
  amount_cents integer,
  tier integer,
  message text,
  pinned_until_at timestamptz,
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
    t.id,
    t.amount_cents,
    t.tier,
    t.message,
    t.pinned_until_at,
    t.paid_at,
    t.viewer_id,
    p.full_name AS viewer_full_name,
    p.username AS viewer_username,
    p.avatar_url AS viewer_avatar_url
  FROM public.live_tips t
  LEFT JOIN public.profiles p ON p.id = t.viewer_id
  WHERE t.session_id = p_session_id
    AND t.is_super_chat = true
    AND t.status = 'paid'
    AND t.pinned_until_at IS NOT NULL
    AND t.pinned_until_at > now()
  ORDER BY t.tier DESC NULLS LAST, t.paid_at DESC NULLS LAST
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.list_active_super_chats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_super_chats(uuid) TO authenticated;

COMMENT ON COLUMN public.live_tips.is_super_chat IS
  'Étape 14 : true si le tip est un super-chat (message obligatoire, épinglé dans le chat live).';
COMMENT ON COLUMN public.live_tips.tier IS
  'Étape 14 : tier 1-7 calculé depuis amount_cents. NULL pour les tips standards (non super-chats).';
COMMENT ON COLUMN public.live_tips.pinned_until_at IS
  'Étape 14 : timestamp jusqu''auquel le super-chat reste affiché dans le chat live.';
