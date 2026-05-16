-- Chantier Cercles v4 — Sprint H : Analytics Premium owner
-- ==========================================================
--
-- 2 RPC qui étendent les analytics existants (migration 0132) :
--
--  H.1 get_circle_retention_cohorts(circle_id, months)
--      Pour chaque mois de cohort (membres ayant joined ce mois-là),
--      retourne le % encore "actif" (= last_active_at dans le mois)
--      à M+0, M+1, M+2, ... jusqu'à `months`.
--      Format : table (cohort_month, cohort_size, retention_m0..m11).
--
--  H.2 get_circle_funnel_and_churn(circle_id)
--      Funnel acquisition + churn :
--        - joined_30d : nb new members 30j
--        - first_post_30d : sous-set qui a posté au moins 1 fois
--        - active_30d : last_active_at dans les 30j
--        - contributors_30d : posts >= 1 OR comments >= 1 dans 30j
--        - churn_30d_count : members "left" ou inactifs > 60j sur 30j
--        - churn_rate_30d : %
--
-- Sécurité : SECURITY DEFINER + is_circle_admin() guard (throw access
-- denied sinon, comme migration 0132).
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. get_circle_retention_cohorts
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_circle_retention_cohorts(
  p_circle_id UUID,
  p_months integer DEFAULT 6
) RETURNS TABLE (
  cohort_month date,
  cohort_size integer,
  retention_pct numeric[]   -- index 0 = M+0, 1 = M+1, ...
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_months integer := GREATEST(LEAST(p_months, 12), 1);
BEGIN
  IF NOT public.is_circle_admin(p_circle_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  WITH cohorts AS (
    SELECT
      date_trunc('month', joined_at)::date AS cohort_month,
      user_id,
      joined_at,
      last_active_at
    FROM public.circle_members
    WHERE circle_id = p_circle_id
      AND joined_at > now() - (v_months || ' months')::interval
  ),
  cohort_sizes AS (
    SELECT cohort_month, COUNT(*)::integer AS size
      FROM cohorts
     GROUP BY cohort_month
  ),
  /* Calcule pour chaque (cohort_month, offset_month) le nb actifs.
     offset 0 = mois du join, offset N = N mois après. */
  retention_grid AS (
    SELECT
      c.cohort_month,
      m AS offset_month,
      COUNT(*) FILTER (
        WHERE c.last_active_at >= c.cohort_month + (m || ' months')::interval
          AND c.last_active_at <  c.cohort_month + ((m + 1) || ' months')::interval
      )::integer AS active_count
    FROM cohorts c
    CROSS JOIN generate_series(0, v_months) AS m
    WHERE c.cohort_month + (m || ' months')::interval <= now()
    GROUP BY c.cohort_month, m
    ORDER BY c.cohort_month DESC, m
  )
  SELECT
    cs.cohort_month,
    cs.size AS cohort_size,
    /* array_agg ordered by offset_month asc, %-age. */
    (
      SELECT array_agg(
        CASE WHEN cs.size = 0 THEN 0
             ELSE ROUND(100.0 * r.active_count / cs.size, 1)
        END
        ORDER BY r.offset_month
      )
      FROM retention_grid r
      WHERE r.cohort_month = cs.cohort_month
    ) AS retention_pct
  FROM cohort_sizes cs
  ORDER BY cs.cohort_month DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_retention_cohorts(UUID, integer)
  TO authenticated;

-- ============================================================
-- 2. get_circle_funnel_and_churn
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_circle_funnel_and_churn(
  p_circle_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_joined_30d int;
  v_first_post_30d int;
  v_active_30d int;
  v_contributors_30d int;
  v_total_members int;
  v_churned_30d int;
  v_churn_rate numeric;
BEGIN
  IF NOT public.is_circle_admin(p_circle_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  /* Total members actifs aujourd'hui (dénominateur churn). */
  SELECT COUNT(*) INTO v_total_members
    FROM public.circle_members
   WHERE circle_id = p_circle_id
     AND status = 'active'
     AND is_banned = false;

  /* Joined dans les 30j (entrée du funnel). */
  SELECT COUNT(*) INTO v_joined_30d
    FROM public.circle_members
   WHERE circle_id = p_circle_id
     AND joined_at > now() - interval '30 days';

  /* Parmi les joined_30d : a posté au moins 1 fois. */
  SELECT COUNT(DISTINCT cm.user_id) INTO v_first_post_30d
    FROM public.circle_members cm
   WHERE cm.circle_id = p_circle_id
     AND cm.joined_at > now() - interval '30 days'
     AND EXISTS (
       SELECT 1 FROM public.posts p
        WHERE p.circle_id = p_circle_id
          AND p.author_id = cm.user_id
          AND p.status = 'published'
          AND p.deleted_at IS NULL
     );

  /* Actifs 30j (last_active_at). */
  SELECT COUNT(*) INTO v_active_30d
    FROM public.circle_members
   WHERE circle_id = p_circle_id
     AND status = 'active'
     AND last_active_at > now() - interval '30 days';

  /* Contributors 30j : posts >= 1 OR comments >= 1. */
  WITH active_posters AS (
    SELECT DISTINCT author_id AS user_id
      FROM public.posts
     WHERE circle_id = p_circle_id
       AND status = 'published'
       AND deleted_at IS NULL
       AND created_at > now() - interval '30 days'
  ), active_commenters AS (
    SELECT DISTINCT c.author_id AS user_id
      FROM public.post_comments c
      JOIN public.posts p ON p.id = c.post_id
     WHERE p.circle_id = p_circle_id
       AND c.deleted_at IS NULL
       AND c.created_at > now() - interval '30 days'
  )
  SELECT COUNT(*) INTO v_contributors_30d
  FROM (
    SELECT user_id FROM active_posters
    UNION
    SELECT user_id FROM active_commenters
  ) u;

  /* Churn 30j : members qui sont passés à status='left' OU
     last_active_at < 60j (= ont arrêté de revenir). */
  SELECT COUNT(*) INTO v_churned_30d
    FROM public.circle_members
   WHERE circle_id = p_circle_id
     AND (
       (status = 'left' AND joined_at > now() - interval '180 days')
       OR (
         status = 'active'
         AND last_active_at IS NOT NULL
         AND last_active_at < now() - interval '60 days'
       )
     );

  v_churn_rate := CASE
    WHEN v_total_members = 0 THEN 0
    ELSE ROUND(100.0 * v_churned_30d / v_total_members, 1)
  END;

  RETURN jsonb_build_object(
    'joined_30d', v_joined_30d,
    'first_post_30d', v_first_post_30d,
    'active_30d', v_active_30d,
    'contributors_30d', v_contributors_30d,
    'total_members', v_total_members,
    'churned_30d', v_churned_30d,
    'churn_rate_30d', v_churn_rate,
    /* Conversion rates pour l'UI. */
    'conv_join_to_post_pct', CASE
      WHEN v_joined_30d = 0 THEN 0
      ELSE ROUND(100.0 * v_first_post_30d / v_joined_30d, 1)
    END,
    'conv_active_to_contributor_pct', CASE
      WHEN v_active_30d = 0 THEN 0
      ELSE ROUND(100.0 * v_contributors_30d / v_active_30d, 1)
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_funnel_and_churn(UUID)
  TO authenticated;

COMMIT;
