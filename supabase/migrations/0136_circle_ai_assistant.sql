-- Chantier Cercles v3 — AI Assistant du cercle
-- =============================================
--
-- Bot Q&A scoped au cercle : répond aux FAQ basées sur les règles +
-- la library + les posts archivés. V1 = scripted (search-based, sans
-- LLM externe), V2 = intègre un LLM (Anthropic/OpenAI/etc) via Edge
-- Function pour des réponses naturelles.
--
-- V1 architecture :
--  - Table circle_ai_qa : questions posées + réponses (cache)
--  - Recherche full-text dans posts + library_items + rules
--  - Confidence score basé sur ts_rank
--  - Pas de coût LLM en V1 — tout côté Postgres FTS

BEGIN;

-- ============================================================
-- 1. Table circle_ai_qa
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_ai_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 1000),
  answer text,
  /* Sources utilisées pour générer la réponse (post_ids, rule_ids,
     library_item_ids). JSONB array de { type, id, snippet }. */
  sources jsonb DEFAULT '[]'::jsonb,
  /* Score de confiance 0-100 basé sur la qualité du match FTS. */
  confidence integer DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  /* Feedback de l'user : useful / not_useful / null (pas voté). */
  user_feedback text CHECK (user_feedback IS NULL OR user_feedback IN ('useful', 'not_useful')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circle_ai_qa_circle_idx
  ON public.circle_ai_qa (circle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS circle_ai_qa_user_idx
  ON public.circle_ai_qa (user_id, created_at DESC);

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.circle_ai_qa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS circle_ai_qa_select_member ON public.circle_ai_qa;
CREATE POLICY circle_ai_qa_select_member
  ON public.circle_ai_qa FOR SELECT
  USING (public.is_circle_active_member(circle_id));

DROP POLICY IF EXISTS circle_ai_qa_insert_own ON public.circle_ai_qa;
CREATE POLICY circle_ai_qa_insert_own
  ON public.circle_ai_qa FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_circle_active_member(circle_id)
  );

DROP POLICY IF EXISTS circle_ai_qa_update_feedback ON public.circle_ai_qa;
CREATE POLICY circle_ai_qa_update_feedback
  ON public.circle_ai_qa FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. RPC : search_circle_knowledge — recherche FTS dans les sources
-- ============================================================
-- Retourne les meilleurs matches (rules, library items, top posts)
-- pour la question. Utilisé par le client pour synthétiser une
-- réponse V1 sans LLM.

CREATE OR REPLACE FUNCTION public.search_circle_knowledge(
  p_circle_id UUID,
  p_query text,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  source_type text,
  source_id UUID,
  title text,
  snippet text,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      plainto_tsquery('french', p_query) AS tsq,
      plainto_tsquery('french', p_query) AS plain
  ),
  rules_match AS (
    SELECT
      'rule' AS source_type,
      r.id AS source_id,
      r.title,
      LEFT(r.description, 240) AS snippet,
      ts_rank(
        to_tsvector('french', r.title || ' ' || COALESCE(r.description, '')),
        (SELECT tsq FROM q)
      ) AS rank
    FROM public.circle_rules r
    WHERE r.circle_id = p_circle_id
      AND to_tsvector('french', r.title || ' ' || COALESCE(r.description, ''))
          @@ (SELECT tsq FROM q)
  ),
  library_match AS (
    SELECT
      'library' AS source_type,
      li.id AS source_id,
      li.title,
      LEFT(COALESCE(li.description, ''), 240) AS snippet,
      ts_rank(
        to_tsvector('french', li.title || ' ' || COALESCE(li.description, '')),
        (SELECT tsq FROM q)
      ) AS rank
    FROM public.circle_library_items li
    WHERE li.circle_id = p_circle_id
      AND li.is_approved = true
      AND to_tsvector('french', li.title || ' ' || COALESCE(li.description, ''))
          @@ (SELECT tsq FROM q)
  ),
  posts_match AS (
    SELECT
      'post' AS source_type,
      p.id AS source_id,
      LEFT(COALESCE(p.body, ''), 60) AS title,
      LEFT(COALESCE(p.body, ''), 240) AS snippet,
      ts_rank(
        to_tsvector('french', COALESCE(p.body, '')),
        (SELECT tsq FROM q)
      ) AS rank
    FROM public.posts p
    WHERE p.circle_id = p_circle_id
      AND p.deleted_at IS NULL
      AND p.body IS NOT NULL
      AND to_tsvector('french', p.body) @@ (SELECT tsq FROM q)
  )
  SELECT * FROM (
    SELECT * FROM rules_match
    UNION ALL
    SELECT * FROM library_match
    UNION ALL
    SELECT * FROM posts_match
  ) u
  ORDER BY rank DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_circle_knowledge(UUID, text, int) TO authenticated;

-- ============================================================
-- 4. Activer module 'ai_assistant' sur tous les cercles existants
-- ============================================================

UPDATE public.circles
SET modules = COALESCE(modules, '{}'::jsonb) || '{"ai_assistant": true}'::jsonb
WHERE NOT (modules ? 'ai_assistant');

COMMIT;
