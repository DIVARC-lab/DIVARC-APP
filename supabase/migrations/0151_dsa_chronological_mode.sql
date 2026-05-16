-- Chantier Recsys DIVARC — Étape 17 : Mode chronologique strict (DSA art. 38)
-- =============================================================================
--
-- Le Digital Services Act EU (article 38) impose qu'une plateforme qui utilise
-- des recommandations algorithmiques propose AUSSI un mode 100 % chronologique
-- comme alternative.
--
-- DIVARC avait déjà 5 modes (fresh, conversations, rising_voices, inner_circle,
-- raw) mais aucun n'est strictement chrono — tous appliquent au minimum un
-- léger ranking. On ajoute donc un 6e mode `chronological` qui :
--   - Bypass complètement le ranker ML / heuristique
--   - Trie uniquement par created_at DESC
--   - Pas de diversification, pas d'exploration, pas de candidate gen v3
--   - Récupère directement les posts visibles (RLS gère l'audience)
--
-- IDEMPOTENT.

BEGIN;

ALTER TABLE public.user_algorithm_settings
  DROP CONSTRAINT IF EXISTS user_algo_default_mode_check;

ALTER TABLE public.user_algorithm_settings
  ADD CONSTRAINT user_algo_default_mode_check
  CHECK (default_feed_mode IN (
    'fresh',
    'conversations',
    'rising_voices',
    'inner_circle',
    'raw',
    'chronological'
  ));

COMMENT ON COLUMN public.user_algorithm_settings.default_feed_mode IS
  'Mode de tri par défaut du feed. "chronological" = pure ORDER BY created_at DESC, sans ranking ML (DSA art. 38).';

-- ============================================================
-- RPC list_chronological_feed
-- ============================================================
-- Bypass total du ranker. RLS posts gère l'audience (amis, public,
-- cercles dont je suis membre).

CREATE OR REPLACE FUNCTION public.list_chronological_feed(
  p_user_id UUID,
  p_limit integer DEFAULT 30,
  p_cursor TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
  post_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id AS post_id,
    p.created_at
  FROM public.posts p
  WHERE p.deleted_at IS NULL
    AND p.status = 'published'
    AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.list_chronological_feed(UUID, integer, TIMESTAMPTZ)
  TO authenticated;

COMMIT;
