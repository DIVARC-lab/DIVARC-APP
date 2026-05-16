-- ============================================================================
-- 0167_live_stage_requests.sql — Demandes de prise de parole "Raise Hand"
--
-- Par défaut, les viewers ne peuvent pas publier (canPublish=false côté
-- token LiveKit). Ils doivent demander explicitement à "monter sur scène"
-- via cette table. Le host (ou un modérateur du cercle si live cercle)
-- approuve → LiveKit updateParticipant(canPublish=true).
--
-- Workflow :
--   1. Viewer clique "Demander la parole" → INSERT status='pending'
--   2. Host voit la demande dans son panneau modération
--   3. Host clique Approuver → status='approved', resolved_at=now()
--      + Server action appelle LiveKit grantPublishToLiveParticipant
--   4. Si Host clique Refuser → status='denied'
--   5. Si Host clique Retirer de la scène plus tard → status='revoked'
--      + LiveKit revokePublishFromLiveParticipant
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_stage_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'revoked', 'cancelled')),

  resolved_by UUID REFERENCES auth.users(id),
  resolved_at timestamptz,

  message text CHECK (message IS NULL OR char_length(message) <= 140),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_requests_session_status
  ON public.live_stage_requests (session_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_requests_requester
  ON public.live_stage_requests (requester_id, created_at DESC);

-- 1 seule demande pending par user et par session.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_requests_one_pending_per_user
  ON public.live_stage_requests (session_id, requester_id)
  WHERE status = 'pending';

ALTER TABLE public.live_stage_requests ENABLE ROW LEVEL SECURITY;

-- SELECT : requester voit ses demandes, host voit toutes les demandes
-- de sa session, modos cercle voient demandes du live cercle.
DROP POLICY IF EXISTS stage_requests_select ON public.live_stage_requests;
CREATE POLICY stage_requests_select
  ON public.live_stage_requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.circle_live_rooms r
      JOIN public.circle_members cm ON cm.circle_id = r.circle_id
      WHERE r.id = session_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'admin', 'moderator', 'mod')
    )
  );

-- INSERT : viewer authentifié, requester_id = self, le live doit être actif.
DROP POLICY IF EXISTS stage_requests_insert_self ON public.live_stage_requests;
CREATE POLICY stage_requests_insert_self
  ON public.live_stage_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id
        AND r.status = 'live'
        AND r.host_id <> (SELECT auth.uid())  -- pas le host lui-même
    )
  );

-- UPDATE : owner de la demande (cancel) OU host de la session OU mod cercle.
DROP POLICY IF EXISTS stage_requests_update ON public.live_stage_requests;
CREATE POLICY stage_requests_update
  ON public.live_stage_requests
  FOR UPDATE
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.circle_live_rooms r
      JOIN public.circle_members cm ON cm.circle_id = r.circle_id
      WHERE r.id = session_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'admin', 'moderator', 'mod')
    )
  )
  WITH CHECK (true);

-- ============================================================================
-- RPC : list_pending_stage_requests(session_id)
--
-- Retourne les demandes pending pour une session, avec profils des
-- requesters. SECURITY DEFINER pour éviter les jointures cross-RLS.
-- L'autorisation host est checked dans la query.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_pending_stage_requests(
  p_session_id uuid
)
RETURNS TABLE (
  id uuid,
  requester_id uuid,
  message text,
  created_at timestamptz,
  full_name text,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sr.id,
    sr.requester_id,
    sr.message,
    sr.created_at,
    p.full_name,
    p.username,
    p.avatar_url
  FROM public.live_stage_requests sr
  LEFT JOIN public.profiles p ON p.id = sr.requester_id
  WHERE sr.session_id = p_session_id
    AND sr.status = 'pending'
    AND (
      EXISTS (
        SELECT 1 FROM public.circle_live_rooms r
        WHERE r.id = p_session_id AND r.host_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.circle_live_rooms r
        JOIN public.circle_members cm ON cm.circle_id = r.circle_id
        WHERE r.id = p_session_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cm.role IN ('owner', 'admin', 'moderator', 'mod')
      )
    )
  ORDER BY sr.created_at ASC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.list_pending_stage_requests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_stage_requests(uuid) TO authenticated;

-- ============================================================================
-- RPC : get_my_stage_request_status(session_id)
--
-- Retourne le status de la dernière demande de l'user pour cette session.
-- Permet à l'UI viewer d'afficher : "Demander", "En attente", "Approuvée",
-- "Refusée". Pas SECURITY DEFINER nécessaire (RLS SELECT couvre).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_stage_request_status(
  p_session_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT status
    FROM public.live_stage_requests
    WHERE session_id = p_session_id
      AND requester_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_stage_request_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_stage_request_status(uuid) TO authenticated;

COMMENT ON TABLE public.live_stage_requests IS
  'Demandes de prise de parole (raise hand). Viewer demande, host/mod approuve → LiveKit upgrade canPublish.';
