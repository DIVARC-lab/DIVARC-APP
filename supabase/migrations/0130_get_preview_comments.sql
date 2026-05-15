-- Chantier Feed FB-style — Preview commentaires inline
-- =====================================================
--
-- Pour afficher les 2 derniers commentaires top-level sous chaque
-- post du feed (comme Facebook), on a besoin d'une RPC qui retourne
-- top-N comments PAR post en un seul roundtrip. Sans cette RPC, soit
-- on fait N+1 queries (lent), soit on fetch un blob global et on
-- prend les 2 par post côté JS (incorrect quand 1 post a 50 comments
-- récents et les autres 0 → ils ne reçoivent rien).
--
-- ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY created_at DESC)
-- donne le rang chronologique par post. WHERE rn <= p_limit garde
-- les N derniers.
--
-- SECURITY INVOKER : on hérite des RLS du caller. La policy SELECT
-- sur post_comments doit autoriser le user (RLS publique des posts
-- du feed = posts visibles → leurs comments aussi). Si un post est
-- privé/bloqué, le user ne verra pas ses comments dans la preview.

CREATE OR REPLACE FUNCTION public.get_preview_comments(
  p_post_ids uuid[],
  p_limit int DEFAULT 2
)
RETURNS TABLE (
  id uuid,
  post_id uuid,
  body text,
  created_at timestamptz,
  author_id uuid,
  author_full_name text,
  author_username text,
  author_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      c.id,
      c.post_id,
      c.body,
      c.created_at,
      c.author_id,
      ROW_NUMBER() OVER (
        PARTITION BY c.post_id
        ORDER BY c.created_at DESC
      ) AS rn
    FROM public.post_comments c
    WHERE c.post_id = ANY(p_post_ids)
      AND c.deleted_at IS NULL
      AND c.parent_comment_id IS NULL
  )
  SELECT
    r.id,
    r.post_id,
    r.body,
    r.created_at,
    r.author_id,
    p.full_name AS author_full_name,
    p.username AS author_username,
    p.avatar_url AS author_avatar_url
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.author_id
  WHERE r.rn <= p_limit
  ORDER BY r.post_id, r.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_preview_comments(uuid[], int)
  TO authenticated;
