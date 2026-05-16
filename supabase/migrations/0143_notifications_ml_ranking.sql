-- Chantier Cercles v4 — Sprint D étape D.1 : ML Ranking notifications
-- =====================================================================
--
-- Remplace le SELECT chronologique simple par un score de pertinence
-- calculé en SQL au moment du SELECT. Pas de modèle ML externe : le
-- score combine 4 features pondérées (type, recency, actor affinity,
-- unread bonus). Architecture extensible : ajouter des features =
-- éditer la CTE sans changer le call site.
--
-- Features :
--   - type_weight       : importance intrinsèque (mention=10, ...)
--   - recency_score     : exp decay sur l'âge (full score à 0h, ~0
--                         après 7 jours)
--   - actor_affinity    : bonus si actor est ami direct ou si user a
--                         interagi récemment avec lui (last 30j)
--   - unread_bonus      : +5 si !read_at
--
-- Total score normalisé sur ~100. Tri DESC.
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. RPC rank_user_notifications
-- ============================================================

CREATE OR REPLACE FUNCTION public.rank_user_notifications(
  p_user_id UUID,
  p_limit integer DEFAULT 50
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  type text,
  title text,
  body text,
  related_user_id UUID,
  related_conversation_id UUID,
  related_friendship_id UUID,
  href text,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  relevance_score numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH friend_ids AS (
    /* Amis acceptés (les 2 sens) — boost actor affinity. */
    SELECT requester_id AS friend_id FROM public.friendships
      WHERE recipient_id = p_user_id AND status = 'accepted'
    UNION
    SELECT recipient_id FROM public.friendships
      WHERE requester_id = p_user_id AND status = 'accepted'
  ),
  recent_interactions AS (
    /* Actors avec lesquels j'ai posté/commenté/liké dans les 30j. */
    SELECT DISTINCT related_user_id AS actor_id
      FROM public.notifications
     WHERE user_id = p_user_id
       AND related_user_id IS NOT NULL
       AND created_at > now() - interval '30 days'
  ),
  scored AS (
    SELECT
      n.id,
      n.user_id,
      n.type,
      n.title,
      n.body,
      n.related_user_id,
      n.related_conversation_id,
      n.related_friendship_id,
      n.href,
      n.read_at,
      n.created_at,
      /* --- Feature 1 : type_weight (0-10) --- */
      CASE
        WHEN n.type IN ('mention', 'post_mention', 'reel_mention') THEN 10
        WHEN n.type = 'new_message' THEN 9
        WHEN n.type IN ('friend_request_received', 'friend_request_accepted') THEN 8
        WHEN n.type IN ('post_commented', 'reel_commented', 'reel_comment_replied') THEN 7
        WHEN n.type LIKE 'marketplace_%' THEN 6
        WHEN n.type IN ('post_liked', 'reel_liked', 'reel_comment_liked') THEN 3
        WHEN n.type LIKE 'moderation_%' THEN 9
        WHEN n.type = 'circle_weekly_digest' THEN 4
        ELSE 5
      END AS type_weight,
      /* --- Feature 2 : recency_score (0-15) ---
         Décroissance exponentielle (demi-vie ~24h, ~0 après 7j). */
      LEAST(15.0,
        15.0 * EXP(-EXTRACT(EPOCH FROM (now() - n.created_at)) / 86400.0)
      ) AS recency_score,
      /* --- Feature 3 : actor_affinity (0-8) --- */
      CASE
        WHEN n.related_user_id IS NULL THEN 0
        WHEN n.related_user_id IN (SELECT friend_id FROM friend_ids) THEN 8
        WHEN n.related_user_id IN (SELECT actor_id FROM recent_interactions) THEN 4
        ELSE 0
      END AS actor_affinity,
      /* --- Feature 4 : unread_bonus (0 or 5) --- */
      CASE WHEN n.read_at IS NULL THEN 5 ELSE 0 END AS unread_bonus
    FROM public.notifications n
    WHERE n.user_id = p_user_id
      /* Ne garde que les notifs des 60 derniers jours (le reste = bruit). */
      AND n.created_at > now() - interval '60 days'
  )
  SELECT
    id, user_id, type, title, body, related_user_id,
    related_conversation_id, related_friendship_id, href, read_at, created_at,
    (type_weight + recency_score + actor_affinity + unread_bonus)::numeric AS relevance_score
  FROM scored
  ORDER BY (type_weight + recency_score + actor_affinity + unread_bonus) DESC,
           created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.rank_user_notifications(UUID, integer)
  TO authenticated;

COMMIT;
