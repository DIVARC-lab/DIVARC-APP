-- ============================================================================
-- 0178_messages_fts_star.sql — Full-text search + star messages
--
-- 1. Index FTS Postgres sur messages.body (français + unaccent)
-- 2. RPC search_my_messages : recherche globale dans toutes les convs
--    où l'user est membre
-- 3. Table starred_messages déjà existante ? Sinon création
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

/* Colonne générée tsvector pour FTS rapide. */
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS body_search tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', coalesce(unaccent(body), ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_messages_body_search
  ON public.messages USING GIN (body_search);

-- ============================================================================
-- RPC : search_my_messages
-- Recherche dans toutes les convs où l'user courant est membre.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_my_messages(
  p_query text,
  p_limit integer DEFAULT 50,
  p_conversation_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  body text,
  type text,
  created_at timestamptz,
  conv_name text,
  conv_type text,
  conv_avatar_url text,
  sender_username text,
  sender_full_name text,
  sender_avatar_url text,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.body,
    m.type,
    m.created_at,
    c.name AS conv_name,
    c.type AS conv_type,
    c.avatar_url AS conv_avatar_url,
    p.username AS sender_username,
    p.full_name AS sender_full_name,
    p.avatar_url AS sender_avatar_url,
    ts_rank(m.body_search, websearch_to_tsquery('french', unaccent(p_query))) AS rank
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  JOIN public.conversation_members cm
    ON cm.conversation_id = m.conversation_id AND cm.user_id = auth.uid()
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE m.deleted_at IS NULL
    AND m.body_search @@ websearch_to_tsquery('french', unaccent(p_query))
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

REVOKE ALL ON FUNCTION public.search_my_messages(text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_my_messages(text, integer, uuid)
  TO authenticated;

-- ============================================================================
-- STARRED MESSAGES (favoris)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.starred_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  starred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT starred_messages_unique UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_user
  ON public.starred_messages (user_id, starred_at DESC);

ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS starred_messages_select_self ON public.starred_messages;
CREATE POLICY starred_messages_select_self
  ON public.starred_messages FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS starred_messages_insert_self ON public.starred_messages;
CREATE POLICY starred_messages_insert_self
  ON public.starred_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS starred_messages_delete_self ON public.starred_messages;
CREATE POLICY starred_messages_delete_self
  ON public.starred_messages FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- RPC : toggle_star_message + list_starred_messages
-- ============================================================================
CREATE OR REPLACE FUNCTION public.toggle_star_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id INTO v_existing
    FROM public.starred_messages
    WHERE user_id = v_user_id AND message_id = p_message_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM public.starred_messages WHERE id = v_existing;
    RETURN false;
  END IF;

  INSERT INTO public.starred_messages (user_id, message_id)
    VALUES (v_user_id, p_message_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_star_message(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_star_message(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_starred_messages(p_limit integer DEFAULT 100)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  body text,
  type text,
  created_at timestamptz,
  starred_at timestamptz,
  conv_name text,
  sender_username text,
  sender_avatar_url text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id AS message_id,
    m.conversation_id,
    m.sender_id,
    m.body,
    m.type,
    m.created_at,
    sm.starred_at,
    c.name AS conv_name,
    p.username AS sender_username,
    p.avatar_url AS sender_avatar_url
  FROM public.starred_messages sm
  JOIN public.messages m ON m.id = sm.message_id
  JOIN public.conversations c ON c.id = m.conversation_id
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE sm.user_id = auth.uid()
    AND m.deleted_at IS NULL
  ORDER BY sm.starred_at DESC
  LIMIT GREATEST(LEAST(p_limit, 500), 1);
$$;

REVOKE ALL ON FUNCTION public.list_starred_messages(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_starred_messages(integer)
  TO authenticated;

COMMENT ON FUNCTION public.search_my_messages(text, integer, uuid) IS
  'Recherche full-text dans les messages des conversations dont l''user est membre.';
