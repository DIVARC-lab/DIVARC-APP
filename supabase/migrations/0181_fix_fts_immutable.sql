-- ============================================================================
-- 0181_fix_fts_immutable.sql — Fix FTS body_search colonne générée
--
-- ERROR 42P17 : 'generation expression is not immutable' parce que
-- unaccent(text) n'est pas marqué IMMUTABLE par défaut (il dépend du
-- dictionnaire 'unaccent' qui peut être modifié).
--
-- Fix : wrapper immutable_unaccent qui passe le dictionnaire en regdictionary
-- (forme immutable de unaccent).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

/* Wrapper IMMUTABLE pour permettre l'usage dans une colonne générée. */
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$;

/* Si la colonne body_search existe avec une mauvaise définition, on la
   drop avant de la recréer. */
ALTER TABLE public.messages
  DROP COLUMN IF EXISTS body_search;

ALTER TABLE public.messages
  ADD COLUMN body_search tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'french'::regconfig,
      coalesce(public.immutable_unaccent(body), '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_messages_body_search
  ON public.messages USING GIN (body_search);

-- ============================================================================
-- Mise à jour de la RPC search_my_messages pour utiliser le wrapper.
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
    ts_rank(m.body_search, websearch_to_tsquery('french'::regconfig, public.immutable_unaccent(p_query))) AS rank
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  JOIN public.conversation_members cm
    ON cm.conversation_id = m.conversation_id AND cm.user_id = auth.uid()
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE m.deleted_at IS NULL
    AND m.body_search @@ websearch_to_tsquery('french'::regconfig, public.immutable_unaccent(p_query))
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;
