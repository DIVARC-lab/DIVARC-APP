-- ============================================================================
-- 0169_live_moderators.sql — Modérateurs custom + pin commentaires
--
-- Pouvoirs admin TikTok-like pour le host :
--   - Désigner des modérateurs custom (autres users avec droits modo
--     sur CE live spécifiquement, indépendamment des cercles)
--   - Pin/unpin un message dans le chat (déjà la colonne is_pinned)
--   - Kick / mute via helpers LiveKit (déjà existants admin.ts)
--
-- Table live_moderators : assignations host → mod pour une session.
-- Distinct de circle_members (mods cercle pour les lives cercle).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_moderators_unique UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_mods_session
  ON public.live_moderators (session_id);
CREATE INDEX IF NOT EXISTS idx_live_mods_user
  ON public.live_moderators (user_id);

ALTER TABLE public.live_moderators ENABLE ROW LEVEL SECURITY;

-- SELECT : host de la session, le modérateur lui-même, ou n'importe quel
-- mod déjà présent (pour qu'ils voient leurs collègues).
DROP POLICY IF EXISTS live_mods_select ON public.live_moderators;
CREATE POLICY live_mods_select
  ON public.live_moderators
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
  );

-- INSERT : seul le host de la session peut désigner un modérateur.
DROP POLICY IF EXISTS live_mods_insert_host ON public.live_moderators;
CREATE POLICY live_mods_insert_host
  ON public.live_moderators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
  );

-- DELETE : host de la session, ou le modérateur lui-même (se retirer).
DROP POLICY IF EXISTS live_mods_delete ON public.live_moderators;
CREATE POLICY live_mods_delete
  ON public.live_moderators
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- RPC : is_live_moderator(session_id, user_id)
--
-- Helper pour les autres policies : un user est-il "modérateur" de la
-- session ? = host OU dans live_moderators OU mod du cercle si live cercle.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_live_moderator(
  p_session_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_live_rooms r
    WHERE r.id = p_session_id
      AND r.host_id = COALESCE(p_user_id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.live_moderators m
    WHERE m.session_id = p_session_id
      AND m.user_id = COALESCE(p_user_id, auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.circle_live_rooms r
    JOIN public.circle_members cm ON cm.circle_id = r.circle_id
    WHERE r.id = p_session_id
      AND cm.user_id = COALESCE(p_user_id, auth.uid())
      AND cm.status = 'active'
      AND cm.role IN ('owner', 'admin', 'moderator', 'mod')
  );
$$;

REVOKE ALL ON FUNCTION public.is_live_moderator(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_live_moderator(uuid, uuid) TO authenticated;

-- ============================================================================
-- Update policy chat update pour autoriser aussi les live_moderators à
-- pin/unpin et delete des messages (pas seulement host + cercle mods).
-- ============================================================================
DROP POLICY IF EXISTS live_chat_update_owner_or_host ON public.live_chat_messages;
CREATE POLICY live_chat_update_owner_or_mod
  ON public.live_chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_live_moderator(session_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR is_live_moderator(session_id)
  );

COMMENT ON TABLE public.live_moderators IS
  'Modérateurs custom assignés par le host pour une session live spécifique.';
