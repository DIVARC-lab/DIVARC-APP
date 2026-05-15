-- Chantier Cercles v3 — Analytics admin
-- =======================================
--
-- 2 RPC qui agrègent les stats d'un cercle :
--  - get_circle_analytics(circle_id) : KPIs synthétiques
--  - get_circle_daily_activity(circle_id, days) : timeseries
--
-- Accès : SECURITY DEFINER + check rôle (owner/admin uniquement)
-- pour éviter qu'un membre lambda voie les analytics.

BEGIN;

-- ============================================================
-- Helper : check si user est admin du cercle
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_circle_admin(p_circle_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = p_circle_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$;

-- ============================================================
-- RPC 1 : get_circle_analytics — KPIs agrégés
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_circle_analytics(p_circle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  members_total int;
  members_active_7d int;
  members_active_30d int;
  members_new_7d int;
  members_new_30d int;
  posts_total int;
  posts_7d int;
  posts_30d int;
  comments_7d int;
  reactions_7d int;
  vitality numeric;
  retention_rate numeric;
BEGIN
  IF NOT public.is_circle_admin(p_circle_id) THEN
    RAISE EXCEPTION 'access denied: admin required';
  END IF;

  -- Membres
  SELECT COUNT(*) INTO members_total
    FROM public.circle_members
   WHERE circle_id = p_circle_id AND status = 'active';

  SELECT COUNT(DISTINCT m.user_id) INTO members_active_7d
    FROM public.circle_members m
    JOIN public.posts p ON p.author_id = m.user_id
   WHERE m.circle_id = p_circle_id
     AND m.status = 'active'
     AND p.circle_id = p_circle_id
     AND p.created_at >= now() - interval '7 days';

  SELECT COUNT(DISTINCT m.user_id) INTO members_active_30d
    FROM public.circle_members m
    JOIN public.posts p ON p.author_id = m.user_id
   WHERE m.circle_id = p_circle_id
     AND m.status = 'active'
     AND p.circle_id = p_circle_id
     AND p.created_at >= now() - interval '30 days';

  SELECT COUNT(*) INTO members_new_7d
    FROM public.circle_members
   WHERE circle_id = p_circle_id
     AND joined_at >= now() - interval '7 days';

  SELECT COUNT(*) INTO members_new_30d
    FROM public.circle_members
   WHERE circle_id = p_circle_id
     AND joined_at >= now() - interval '30 days';

  -- Posts
  SELECT COUNT(*) INTO posts_total
    FROM public.posts
   WHERE circle_id = p_circle_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO posts_7d
    FROM public.posts
   WHERE circle_id = p_circle_id
     AND deleted_at IS NULL
     AND created_at >= now() - interval '7 days';

  SELECT COUNT(*) INTO posts_30d
    FROM public.posts
   WHERE circle_id = p_circle_id
     AND deleted_at IS NULL
     AND created_at >= now() - interval '30 days';

  -- Engagement (7d)
  SELECT COUNT(*) INTO comments_7d
    FROM public.post_comments c
    JOIN public.posts p ON p.id = c.post_id
   WHERE p.circle_id = p_circle_id
     AND c.deleted_at IS NULL
     AND c.created_at >= now() - interval '7 days';

  SELECT COUNT(*) INTO reactions_7d
    FROM public.post_reactions r
    JOIN public.posts p ON p.id = r.post_id
   WHERE p.circle_id = p_circle_id
     AND r.created_at >= now() - interval '7 days';

  -- Vitality (depuis la colonne dénormalisée)
  SELECT vitality_score INTO vitality
    FROM public.circles WHERE id = p_circle_id;

  -- Rétention : % des membres acquis il y a 30+j qui sont encore
  -- "actifs" sur les 30 derniers jours (= ont posté/commenté/réagi)
  WITH old_members AS (
    SELECT user_id FROM public.circle_members
     WHERE circle_id = p_circle_id
       AND joined_at < now() - interval '30 days'
       AND status = 'active'
  ),
  active_recently AS (
    SELECT DISTINCT user_id FROM (
      SELECT p.author_id AS user_id FROM public.posts p
       WHERE p.circle_id = p_circle_id
         AND p.created_at >= now() - interval '30 days'
       UNION
      SELECT c.author_id FROM public.post_comments c
        JOIN public.posts p ON p.id = c.post_id
       WHERE p.circle_id = p_circle_id
         AND c.created_at >= now() - interval '30 days'
      UNION
      SELECT r.user_id FROM public.post_reactions r
        JOIN public.posts p ON p.id = r.post_id
       WHERE p.circle_id = p_circle_id
         AND r.created_at >= now() - interval '30 days'
    ) u
  )
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM old_members) = 0 THEN 0
    ELSE ROUND(
      (SELECT COUNT(*) FROM active_recently a JOIN old_members o ON o.user_id = a.user_id)::numeric
      / (SELECT COUNT(*) FROM old_members)::numeric * 100, 1)
  END INTO retention_rate;

  result := jsonb_build_object(
    'members_total', members_total,
    'members_active_7d', members_active_7d,
    'members_active_30d', members_active_30d,
    'members_new_7d', members_new_7d,
    'members_new_30d', members_new_30d,
    'posts_total', posts_total,
    'posts_7d', posts_7d,
    'posts_30d', posts_30d,
    'comments_7d', comments_7d,
    'reactions_7d', reactions_7d,
    'engagement_per_post_7d', CASE
      WHEN posts_7d = 0 THEN 0
      ELSE ROUND((comments_7d + reactions_7d)::numeric / posts_7d::numeric, 2)
    END,
    'vitality_score', COALESCE(vitality, 0),
    'retention_rate_30d', COALESCE(retention_rate, 0)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_analytics(UUID) TO authenticated;

-- ============================================================
-- RPC 2 : get_circle_daily_activity — timeseries N derniers jours
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_circle_daily_activity(
  p_circle_id UUID,
  p_days int DEFAULT 30
)
RETURNS TABLE (
  day date,
  posts int,
  comments int,
  reactions int,
  new_members int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      (current_date - (p_days - 1))::date,
      current_date,
      '1 day'::interval
    )::date AS day
  ),
  daily_posts AS (
    SELECT date_trunc('day', created_at)::date AS d, COUNT(*) AS cnt
      FROM public.posts
     WHERE circle_id = p_circle_id
       AND deleted_at IS NULL
       AND created_at >= current_date - (p_days - 1)
     GROUP BY 1
  ),
  daily_comments AS (
    SELECT date_trunc('day', c.created_at)::date AS d, COUNT(*) AS cnt
      FROM public.post_comments c
      JOIN public.posts p ON p.id = c.post_id
     WHERE p.circle_id = p_circle_id
       AND c.deleted_at IS NULL
       AND c.created_at >= current_date - (p_days - 1)
     GROUP BY 1
  ),
  daily_reactions AS (
    SELECT date_trunc('day', r.created_at)::date AS d, COUNT(*) AS cnt
      FROM public.post_reactions r
      JOIN public.posts p ON p.id = r.post_id
     WHERE p.circle_id = p_circle_id
       AND r.created_at >= current_date - (p_days - 1)
     GROUP BY 1
  ),
  daily_joins AS (
    SELECT date_trunc('day', joined_at)::date AS d, COUNT(*) AS cnt
      FROM public.circle_members
     WHERE circle_id = p_circle_id
       AND joined_at >= current_date - (p_days - 1)
     GROUP BY 1
  )
  SELECT
    days.day,
    COALESCE(dp.cnt, 0)::int AS posts,
    COALESCE(dc.cnt, 0)::int AS comments,
    COALESCE(dr.cnt, 0)::int AS reactions,
    COALESCE(dj.cnt, 0)::int AS new_members
  FROM days
  LEFT JOIN daily_posts dp ON dp.d = days.day
  LEFT JOIN daily_comments dc ON dc.d = days.day
  LEFT JOIN daily_reactions dr ON dr.d = days.day
  LEFT JOIN daily_joins dj ON dj.d = days.day
  ORDER BY days.day;
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_daily_activity(UUID, int) TO authenticated;

-- ============================================================
-- RPC 3 : get_circle_top_contributors — leaderboard
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_circle_top_contributors(
  p_circle_id UUID,
  p_period_days int DEFAULT 30,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  full_name text,
  username text,
  avatar_url text,
  role text,
  posts_count int,
  comments_count int,
  reactions_received int,
  score int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH posts_by_user AS (
    SELECT author_id, COUNT(*) AS cnt
      FROM public.posts
     WHERE circle_id = p_circle_id
       AND deleted_at IS NULL
       AND created_at >= now() - (p_period_days || ' days')::interval
     GROUP BY author_id
  ),
  comments_by_user AS (
    SELECT c.author_id, COUNT(*) AS cnt
      FROM public.post_comments c
      JOIN public.posts p ON p.id = c.post_id
     WHERE p.circle_id = p_circle_id
       AND c.deleted_at IS NULL
       AND c.created_at >= now() - (p_period_days || ' days')::interval
     GROUP BY c.author_id
  ),
  reactions_received AS (
    SELECT p.author_id AS user_id, COUNT(*) AS cnt
      FROM public.post_reactions r
      JOIN public.posts p ON p.id = r.post_id
     WHERE p.circle_id = p_circle_id
       AND r.created_at >= now() - (p_period_days || ' days')::interval
     GROUP BY p.author_id
  ),
  contributors AS (
    SELECT user_id FROM posts_by_user
    UNION
    SELECT author_id FROM comments_by_user
    UNION
    SELECT user_id FROM reactions_received
  )
  SELECT
    c.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    m.role::text,
    COALESCE(pb.cnt, 0)::int AS posts_count,
    COALESCE(cb.cnt, 0)::int AS comments_count,
    COALESCE(rr.cnt, 0)::int AS reactions_received,
    /* Scoring : post = 10pts, comment = 3pts, reaction reçue = 1pt */
    (COALESCE(pb.cnt, 0) * 10 + COALESCE(cb.cnt, 0) * 3 + COALESCE(rr.cnt, 0))::int AS score
  FROM contributors c
  JOIN public.circle_members m ON m.user_id = c.user_id AND m.circle_id = p_circle_id
  JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN posts_by_user pb ON pb.author_id = c.user_id
  LEFT JOIN comments_by_user cb ON cb.author_id = c.user_id
  LEFT JOIN reactions_received rr ON rr.user_id = c.user_id
  WHERE m.status = 'active'
  ORDER BY score DESC, posts_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_circle_top_contributors(UUID, int, int) TO authenticated;

COMMIT;
