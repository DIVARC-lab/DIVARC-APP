-- ============================================================================
-- 0161_live_goals.sql — Étape 17/25 Live Streaming
--
-- Objectifs chiffrés du host pour son live (revenu, viewers, cadeaux).
-- Affichés en overlay barre de progression côté viewer ET host.
--
-- Types :
--   revenue        : montant cumulé en cents (tips + gifts + super-chats)
--   viewers        : nombre de spectateurs simultanés peak
--   gifts          : nombre de cadeaux paid envoyés
--
-- current_value est calculé à la volée côté route API (pas stocké) pour
-- éviter triggers + désynchros. Le host crée 1 goal actif à la fois ;
-- les anciens passent en status='ended'.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  goal_type text NOT NULL CHECK (goal_type IN ('revenue', 'viewers', 'gifts')),
  target_value integer NOT NULL CHECK (target_value > 0),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),

  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'achieved', 'ended')),

  achieved_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1 seul goal actif par session.
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_goals_one_active_per_session
  ON public.live_goals (session_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_live_goals_session
  ON public.live_goals (session_id, created_at DESC);

ALTER TABLE public.live_goals ENABLE ROW LEVEL SECURITY;

-- SELECT : tout user authentifié (visibilité publique côté viewers du live).
DROP POLICY IF EXISTS live_goals_select ON public.live_goals;
CREATE POLICY live_goals_select
  ON public.live_goals
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : seul le host de la session peut créer un goal.
DROP POLICY IF EXISTS live_goals_insert_host ON public.live_goals;
CREATE POLICY live_goals_insert_host
  ON public.live_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
  );

-- UPDATE : seul le host (clôture / achievement).
DROP POLICY IF EXISTS live_goals_update_host ON public.live_goals;
CREATE POLICY live_goals_update_host
  ON public.live_goals
  FOR UPDATE
  TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

-- ============================================================================
-- RPC : get_active_goal_with_progress(session_id)
--
-- Retourne le goal actif + current_value calculé à la volée selon goal_type.
-- SECURITY DEFINER pour bypass RLS sur live_gift_sends (viewer ne voit
-- normalement que ses tips/gifts personnels).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_goal_with_progress(
  p_session_id uuid
)
RETURNS TABLE (
  id uuid,
  goal_type text,
  target_value integer,
  current_value integer,
  label text,
  status text,
  achieved_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal record;
  v_current integer := 0;
BEGIN
  SELECT g.id, g.goal_type, g.target_value, g.label, g.status, g.achieved_at, g.host_id
    INTO v_goal
    FROM public.live_goals g
    WHERE g.session_id = p_session_id
      AND g.status IN ('active', 'achieved')
    ORDER BY g.created_at DESC
    LIMIT 1;

  IF v_goal IS NULL THEN
    RETURN;
  END IF;

  IF v_goal.goal_type = 'revenue' THEN
    SELECT COALESCE(r.revenue_total_cents, 0) INTO v_current
      FROM public.circle_live_rooms r
      WHERE r.id = p_session_id;
  ELSIF v_goal.goal_type = 'viewers' THEN
    SELECT GREATEST(
      COALESCE(r.peak_participants, 0),
      COALESCE(r.participants_count, 0)
    ) INTO v_current
      FROM public.circle_live_rooms r
      WHERE r.id = p_session_id;
  ELSIF v_goal.goal_type = 'gifts' THEN
    SELECT COUNT(*)::integer INTO v_current
      FROM public.live_gift_sends s
      WHERE s.session_id = p_session_id
        AND s.status = 'paid';
  END IF;

  RETURN QUERY SELECT
    v_goal.id,
    v_goal.goal_type,
    v_goal.target_value,
    v_current,
    v_goal.label,
    v_goal.status,
    v_goal.achieved_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_goal_with_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_goal_with_progress(uuid) TO authenticated;

COMMENT ON TABLE public.live_goals IS
  'Étape 17 : Objectifs chiffrés du host (revenue/viewers/gifts) affichés en overlay.';
