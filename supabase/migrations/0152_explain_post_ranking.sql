-- Chantier Recsys DIVARC — Étape 18 : Explainability "Pourquoi ce post"
-- ========================================================================
--
-- DSA art. 27 + 38 exigent qu'une plateforme proposant des recommandations
-- algorithmiques explique aux utilisateurs POURQUOI un contenu leur est
-- recommandé. RPC qui retourne un JSON de raisons lisibles pour un (post,
-- user) donné.
--
-- Plutôt que d'exposer 80 features ML, on traduit les signaux principaux en
-- texte français court et compréhensible (Apple-style explainability).
--
-- IDEMPOTENT.

BEGIN;

CREATE OR REPLACE FUNCTION public.explain_post_ranking(
  p_post_id UUID,
  p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_post RECORD;
  v_author_username text;
  v_author_full_name text;
  v_circle_name text;
  v_circle_slug text;
  v_is_friend boolean := false;
  v_is_follow boolean := false;
  v_is_circle_member boolean := false;
  v_topic_matches text[];
  v_age_hours float;
  v_freshness_label text;
  v_engagement_velocity float;
  v_reasons jsonb := '[]'::jsonb;
  v_primary text;
BEGIN
  /* Vérifie que le post existe et est lisible (RLS s'applique). */
  SELECT
    p.id, p.author_id, p.circle_id, p.created_at,
    p.upvotes, p.downvotes, p.helpful_marks,
    (SELECT COUNT(*)::int FROM public.post_likes WHERE post_id = p.id) AS likes_count,
    (SELECT COUNT(*)::int FROM public.post_comments WHERE post_id = p.id AND deleted_at IS NULL) AS comments_count
    INTO v_post
   FROM public.posts p
  WHERE p.id = p_post_id
    AND p.deleted_at IS NULL;

  IF v_post IS NULL THEN
    RETURN jsonb_build_object(
      'reasons', '[]'::jsonb,
      'primary_reason', null,
      'error', 'post_not_found'
    );
  END IF;

  /* Auteur. */
  SELECT username, full_name
    INTO v_author_username, v_author_full_name
    FROM public.profiles
   WHERE id = v_post.author_id;

  /* Cercle si applicable. */
  IF v_post.circle_id IS NOT NULL THEN
    SELECT name, slug
      INTO v_circle_name, v_circle_slug
      FROM public.circles
     WHERE id = v_post.circle_id;
  END IF;

  /* ============================================================
   * RAISON 1 — Connexion sociale directe
   * ============================================================ */

  /* Ami ? */
  v_is_friend := EXISTS (
    SELECT 1 FROM public.friendships
     WHERE status = 'accepted'
       AND ((requester_id = p_user_id AND recipient_id = v_post.author_id)
         OR (recipient_id = p_user_id AND requester_id = v_post.author_id))
  );

  IF v_is_friend THEN
    v_reasons := v_reasons || jsonb_build_object(
      'kind', 'friend',
      'weight', 0.95,
      'text', 'Vous êtes amis sur DIVARC.',
      'icon', 'Users'
    );
    v_primary := COALESCE(v_primary, 'friend');
  END IF;

  /* Follow ? (asymétrique, migration 0067). */
  v_is_follow := EXISTS (
    SELECT 1 FROM public.user_follows
     WHERE follower_id = p_user_id AND followed_id = v_post.author_id
  );

  IF v_is_follow AND NOT v_is_friend THEN
    v_reasons := v_reasons || jsonb_build_object(
      'kind', 'follow',
      'weight', 0.85,
      'text', 'Tu suis ' ||
        CASE
          WHEN v_author_username IS NOT NULL THEN '@' || v_author_username
          ELSE COALESCE(v_author_full_name, 'cet utilisateur')
        END || '.',
      'icon', 'UserPlus'
    );
    v_primary := COALESCE(v_primary, 'follow');
  END IF;

  /* ============================================================
   * RAISON 2 — Cercle commun
   * ============================================================ */

  IF v_post.circle_id IS NOT NULL THEN
    v_is_circle_member := EXISTS (
      SELECT 1 FROM public.circle_members
       WHERE circle_id = v_post.circle_id
         AND user_id = p_user_id
         AND status = 'active'
    );
    IF v_is_circle_member THEN
      v_reasons := v_reasons || jsonb_build_object(
        'kind', 'circle',
        'weight', 0.8,
        'text', 'Publié dans le cercle « ' || COALESCE(v_circle_name, 'inconnu') || ' » dont tu es membre.',
        'icon', 'Users',
        'circle_slug', v_circle_slug
      );
      v_primary := COALESCE(v_primary, 'circle');
    END IF;
  END IF;

  /* ============================================================
   * RAISON 3 — Topic affinity / centres d'intérêt
   * ============================================================ */

  /* Posts ne sont pas (encore) taggés avec topics structurés, mais on
     check les hashtags présents dans le post + comparaison aux intérêts
     déclarés du user (table profile_interests si existe). V2 : utiliser
     content_embeddings.topics. */

  /* Pour V1 on regarde si l'auteur a des posts dans les mêmes hashtags
     que les hashtags du post. Plus simple : juste lister les hashtags. */
  WITH post_tags AS (
    SELECT DISTINCT h.tag
      FROM public.post_hashtags ph
      JOIN public.hashtags h ON h.id = ph.hashtag_id
     WHERE ph.post_id = p_post_id
     LIMIT 5
  )
  SELECT array_agg(tag) INTO v_topic_matches FROM post_tags;

  IF v_topic_matches IS NOT NULL AND array_length(v_topic_matches, 1) > 0 THEN
    v_reasons := v_reasons || jsonb_build_object(
      'kind', 'topic',
      'weight', 0.6,
      'text', 'Sujet proche de ce qui t''intéresse : #' || array_to_string(v_topic_matches, ' · #'),
      'icon', 'Hash'
    );
    v_primary := COALESCE(v_primary, 'topic');
  END IF;

  /* ============================================================
   * RAISON 4 — Tendance / engagement velocity
   * ============================================================ */

  v_engagement_velocity := (
    v_post.likes_count + v_post.comments_count * 3 + v_post.helpful_marks * 5
  ) / GREATEST(EXTRACT(EPOCH FROM (now() - v_post.created_at)) / 3600.0, 1);

  IF v_engagement_velocity > 5 THEN
    v_reasons := v_reasons || jsonb_build_object(
      'kind', 'trending',
      'weight', 0.7,
      'text', 'Tendance en ce moment (' || ROUND(v_engagement_velocity::numeric, 1)::text || ' interactions/heure).',
      'icon', 'TrendingUp'
    );
    v_primary := COALESCE(v_primary, 'trending');
  END IF;

  /* ============================================================
   * RAISON 5 — Fraîcheur
   * ============================================================ */

  v_age_hours := EXTRACT(EPOCH FROM (now() - v_post.created_at)) / 3600.0;

  IF v_age_hours < 24 THEN
    v_freshness_label := CASE
      WHEN v_age_hours < 1 THEN 'il y a moins d''une heure'
      WHEN v_age_hours < 6 THEN 'il y a ' || ROUND(v_age_hours)::text || 'h'
      ELSE 'aujourd''hui'
    END;
    v_reasons := v_reasons || jsonb_build_object(
      'kind', 'fresh',
      'weight', 0.4,
      'text', 'Publié ' || v_freshness_label || '.',
      'icon', 'Clock'
    );
    IF v_primary IS NULL THEN
      v_primary := 'fresh';
    END IF;
  END IF;

  /* ============================================================
   * Fallback
   * ============================================================ */

  IF v_primary IS NULL THEN
    v_reasons := v_reasons || jsonb_build_object(
      'kind', 'exploration',
      'weight', 0.3,
      'text', 'DIVARC te suggère ce contenu pour diversifier ton fil.',
      'icon', 'Compass'
    );
    v_primary := 'exploration';
  END IF;

  /* ============================================================
   * Retour final
   * ============================================================ */

  RETURN jsonb_build_object(
    'reasons', v_reasons,
    'primary_reason', v_primary,
    'author', jsonb_build_object(
      'username', v_author_username,
      'full_name', v_author_full_name
    ),
    'post_age_hours', ROUND(v_age_hours::numeric, 2),
    'engagement_velocity', ROUND(v_engagement_velocity::numeric, 2),
    'generated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.explain_post_ranking(UUID, UUID)
  TO authenticated;

COMMIT;
