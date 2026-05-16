-- ============================================================================
-- 0172_top_gifters_rpc.sql — Étape 7/60
--
-- RPC get_live_top_gifters(session_id, limit) : top N gifters d'un live.
-- Aggregate live_gift_sends.amount_cents GROUP BY viewer_id.
-- SECURITY DEFINER pour permettre à tout viewer de voir le podium.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_live_top_gifters(
  p_session_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  total_coins integer,
  gifts_count integer,
  rank integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT
      s.viewer_id AS user_id,
      SUM(s.amount_cents)::integer AS total_coins,
      COUNT(*)::integer AS gifts_count
    FROM public.live_gift_sends s
    WHERE s.session_id = p_session_id
      AND s.status = 'paid'
    GROUP BY s.viewer_id
  )
  SELECT
    a.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    a.total_coins,
    a.gifts_count,
    (ROW_NUMBER() OVER (ORDER BY a.total_coins DESC))::integer AS rank
  FROM agg a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY a.total_coins DESC
  LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;

REVOKE ALL ON FUNCTION public.get_live_top_gifters(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_top_gifters(uuid, integer)
  TO authenticated;

COMMENT ON FUNCTION public.get_live_top_gifters(uuid, integer) IS
  'Étape 7/60 : Top gifters du live (aggregate amount_cents). Rang inclus.';
