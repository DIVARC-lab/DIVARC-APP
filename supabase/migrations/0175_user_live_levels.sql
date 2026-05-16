-- ============================================================================
-- 0175_user_live_levels.sql — Étapes 51-55/60 Badges + Niveaux user
--
-- Système de niveaux user basé sur :
--   - Total coins envoyés sur tous les lives confondus (gifts payés)
--   - Formule level = floor(log10(coins/100 + 1) * 10)
--     Soit :
--       0 coins      → level 0
--       1 €          → level 0
--       10 €         → level 10
--       100 €        → level 20
--       1000 €       → level 30
--       10000 €      → level 40
--
-- Materialized in user_live_levels (refresh on demand via RPC).
-- Badges déduits côté SQL.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_live_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_coins_sent integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 0,
  lifetime_gifts_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_live_levels_level
  ON public.user_live_levels (level DESC);

ALTER TABLE public.user_live_levels ENABLE ROW LEVEL SECURITY;

-- SELECT public auth (badges visibles à tous).
DROP POLICY IF EXISTS user_live_levels_select ON public.user_live_levels;
CREATE POLICY user_live_levels_select
  ON public.user_live_levels
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- RPC : compute_user_live_level(user_id) — recompute + upsert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_user_live_level(
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_count integer := 0;
  v_level integer := 0;
BEGIN
  SELECT
    COALESCE(SUM(amount_cents), 0)::integer,
    COUNT(*)::integer
  INTO v_total, v_count
  FROM public.live_gift_sends
  WHERE viewer_id = p_user_id
    AND status = 'paid';

  /* Formule : level = floor(log10(euros + 1) * 10). */
  IF v_total > 0 THEN
    v_level := FLOOR(LOG(10, (v_total / 100.0) + 1) * 10)::integer;
  ELSE
    v_level := 0;
  END IF;

  INSERT INTO public.user_live_levels (user_id, total_coins_sent, level, lifetime_gifts_count, updated_at)
    VALUES (p_user_id, v_total, v_level, v_count, now())
    ON CONFLICT (user_id) DO UPDATE
    SET total_coins_sent = EXCLUDED.total_coins_sent,
        level = EXCLUDED.level,
        lifetime_gifts_count = EXCLUDED.lifetime_gifts_count,
        updated_at = now();

  RETURN v_level;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_user_live_level(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_user_live_level(uuid) TO authenticated;

-- ============================================================================
-- RPC : get_user_live_level(user_id) — lecture rapide (pas de recompute)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_live_level(
  p_user_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(level, 0)
    FROM public.user_live_levels
    WHERE user_id = p_user_id
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_live_level(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_live_level(uuid) TO authenticated;

-- ============================================================================
-- Trigger : refresh level après chaque gift paid.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_user_level_on_gift_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
    PERFORM public.compute_user_live_level(NEW.viewer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_user_level ON public.live_gift_sends;
CREATE TRIGGER trg_refresh_user_level
  AFTER UPDATE ON public.live_gift_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_user_level_on_gift_paid();

COMMENT ON FUNCTION public.compute_user_live_level(uuid) IS
  'Étape 51/60 : Recompute level based on lifetime gift coins.';
