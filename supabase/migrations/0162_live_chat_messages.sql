-- ============================================================================
-- 0162_live_chat_messages.sql — Étape 18/25 Live Streaming
--
-- Chat textuel pendant les lives. Distinct du chat éphémère LiveKit :
-- celui-ci est persisté en DB (replay V2 + modération + historique).
--
-- Rate-limit : 1 message / 2 secondes par user (vérifié côté Server Action,
-- + redondance via RLS check pour éviter le spam).
--
-- Soft-delete : deleted_at non-null = message masqué (mais conservé pour
-- audit modération). Host peut supprimer n'importe quel message ; owner
-- peut supprimer le sien.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 400),
  is_pinned boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by UUID REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_chat_session_created
  ON public.live_chat_messages (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_user_session
  ON public.live_chat_messages (user_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_pinned
  ON public.live_chat_messages (session_id, is_pinned)
  WHERE is_pinned = true AND deleted_at IS NULL;

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les users authentifiés (visibilité publique).
-- Si le live a une visibility restrictive, l'user ne peut de toute façon
-- pas accéder à la page viewer (gate via /api/lives/[id]/token).
DROP POLICY IF EXISTS live_chat_select ON public.live_chat_messages;
CREATE POLICY live_chat_select
  ON public.live_chat_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : l'user envoie en son nom, et seulement si chat_enabled=true
-- sur la session ET status='live'.
DROP POLICY IF EXISTS live_chat_insert_self ON public.live_chat_messages;
CREATE POLICY live_chat_insert_self
  ON public.live_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id
        AND r.chat_enabled = true
        AND r.status = 'live'
    )
  );

-- UPDATE : owner peut éditer le contenu (V2) ; host peut pin/unpin et
-- soft-delete via update.
DROP POLICY IF EXISTS live_chat_update_owner_or_host ON public.live_chat_messages;
CREATE POLICY live_chat_update_owner_or_host
  ON public.live_chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- RPC : send_live_chat_message_with_rate_limit
--
-- Insert atomique avec check rate-limit (1 msg / 2s par user et par
-- session). Si dernier message < 2s → exception 'rate_limited'.
-- SECURITY DEFINER : on bypass RLS pour faire l'INSERT atomique
-- (rate-limit check + insert dans la même tx).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.send_live_chat_message_with_rate_limit(
  p_session_id uuid,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_room record;
  v_last record;
  v_new_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'empty_content';
  END IF;

  IF char_length(p_content) > 400 THEN
    RAISE EXCEPTION 'content_too_long';
  END IF;

  SELECT id, chat_enabled, status, host_id INTO v_room
    FROM public.circle_live_rooms
    WHERE id = p_session_id;

  IF v_room IS NULL THEN
    RAISE EXCEPTION 'live_not_found';
  END IF;
  IF NOT v_room.chat_enabled THEN
    RAISE EXCEPTION 'chat_disabled';
  END IF;
  IF v_room.status <> 'live' THEN
    RAISE EXCEPTION 'live_not_active';
  END IF;

  /* Rate-limit : dernier message < 2s ? */
  SELECT created_at INTO v_last
    FROM public.live_chat_messages
    WHERE user_id = v_user_id
      AND session_id = p_session_id
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_last IS NOT NULL AND v_last.created_at > now() - interval '2 seconds' THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  INSERT INTO public.live_chat_messages (session_id, user_id, content)
    VALUES (p_session_id, v_user_id, p_content)
    RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_live_chat_message_with_rate_limit(uuid, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_live_chat_message_with_rate_limit(uuid, text)
  TO authenticated;

-- ============================================================================
-- RPC : list_live_chat_messages
--
-- Retourne les messages récents (non supprimés) avec profile join.
-- Pagination simple : depuis since timestamp OU 50 derniers.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_live_chat_messages(
  p_session_id uuid,
  p_since timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  is_pinned boolean,
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
    m.id,
    m.user_id,
    m.content,
    m.is_pinned,
    m.created_at,
    p.full_name,
    p.username,
    p.avatar_url
  FROM public.live_chat_messages m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.session_id = p_session_id
    AND m.deleted_at IS NULL
    AND (p_since IS NULL OR m.created_at > p_since)
  ORDER BY m.created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

REVOKE ALL ON FUNCTION public.list_live_chat_messages(uuid, timestamptz, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_live_chat_messages(uuid, timestamptz, integer)
  TO authenticated;

COMMENT ON TABLE public.live_chat_messages IS
  'Étape 18 : Chat textuel persisté pendant les lives (rate-limit 1 msg/2s, soft-delete par host).';
