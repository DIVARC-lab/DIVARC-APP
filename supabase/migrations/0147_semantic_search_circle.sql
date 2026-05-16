-- Chantier Cercles v4 — Sprint G étape G.1 : Search sémantique cercle
-- =====================================================================
--
-- RPC search_posts_by_embedding(query_embedding, circle_id, limit)
-- qui retourne les posts du cercle (ou de tout DIVARC si circle_id=NULL)
-- les plus proches sémantiquement de l'embedding de query.
--
-- Réutilise content_embeddings (table déjà créée migration 0044) avec
-- index HNSW cosine. Append fenêtre temporelle 90j pour éviter les
-- résultats trop anciens.
--
-- Sécurité : SECURITY INVOKER — RLS posts s'applique automatiquement
-- (cercle privé non-membre = posts invisibles via JOIN).
--
-- IDEMPOTENT.

BEGIN;

CREATE OR REPLACE FUNCTION public.search_posts_by_embedding(
  p_query_embedding vector(1536),
  p_circle_id UUID DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_days_window integer DEFAULT 90
) RETURNS TABLE (
  post_id UUID,
  similarity_score float,
  body text,
  author_id UUID,
  circle_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(p_limit, 1), 100);
  v_days integer := LEAST(GREATEST(p_days_window, 1), 730);
BEGIN
  IF p_query_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ce.post_id,
    (1 - (ce.embedding <=> p_query_embedding))::float AS similarity_score,
    p.body,
    p.author_id,
    p.circle_id,
    p.created_at
  FROM public.content_embeddings ce
  INNER JOIN public.posts p ON p.id = ce.post_id
  WHERE p.deleted_at IS NULL
    AND p.status = 'published'
    AND p.created_at > now() - (v_days || ' days')::interval
    AND (p_circle_id IS NULL OR p.circle_id = p_circle_id)
  ORDER BY ce.embedding <=> p_query_embedding
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_posts_by_embedding(
  vector(1536), UUID, integer, integer
) TO authenticated;

COMMIT;
