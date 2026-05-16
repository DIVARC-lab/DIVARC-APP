-- Chantier Recsys DIVARC — Étapes 9-10 : Geo candidates
-- ========================================================
--
-- DIVARC est un "réseau de quartier" — la dimension géographique est
-- différenciante vs Facebook/TikTok. On ajoute une source de candidats
-- geo qui suggère des posts publiés près de la zone domicile de l'user.
--
-- Architecture :
--   - profiles.home_lat / home_lng / home_radius_km : zone domicile
--     (renseignée pendant l'onboarding, optionnelle).
--   - haversine_km(lat1, lng1, lat2, lng2) : helper SQL pur (pas besoin
--     d'extension earthdistance ni PostGIS pour le V1).
--   - nearby_posts_for_user(user_id, limit, days) : RPC qui retourne
--     les posts géolocalisés dans le rayon, triés par fraîcheur ×
--     proximité.
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. Zone domicile sur profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_lat numeric(9, 6)
    CHECK (home_lat IS NULL OR (home_lat BETWEEN -90 AND 90));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_lng numeric(9, 6)
    CHECK (home_lng IS NULL OR (home_lng BETWEEN -180 AND 180));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_radius_km numeric(5, 1)
    DEFAULT 5.0
    CHECK (home_radius_km BETWEEN 0.5 AND 100);

CREATE INDEX IF NOT EXISTS profiles_home_geo_idx
  ON public.profiles (home_lat, home_lng)
  WHERE home_lat IS NOT NULL AND home_lng IS NOT NULL;

-- ============================================================
-- 2. Helper haversine (km) — pas besoin de PostGIS
-- ============================================================
-- Formule grand-cercle. Approximation Terre sphérique R=6371 km.
-- Suffisant pour des distances < 1000 km (erreur < 0.5%).

CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
) RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  R constant numeric := 6371; -- rayon Terre (km)
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2)
     + cos(radians(lat1)) * cos(radians(lat2))
     * sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN R * c;
END;
$$;

-- ============================================================
-- 3. RPC nearby_posts_for_user
-- ============================================================
-- Retourne les posts géolocalisés dans le rayon home + freshness.
-- Fallback : si home_lat/lng nulls sur profiles → on essaie le centre
-- d'un cercle local rejoint (premier disponible).

CREATE OR REPLACE FUNCTION public.nearby_posts_for_user(
  p_user_id UUID,
  p_limit integer DEFAULT 50,
  p_days integer DEFAULT 14
) RETURNS TABLE (
  post_id UUID,
  distance_km numeric,
  freshness_score numeric,
  combined_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lat numeric;
  v_lng numeric;
  v_radius numeric;
BEGIN
  /* 1. Lit home location depuis profiles. */
  SELECT home_lat, home_lng, COALESCE(home_radius_km, 5.0)
    INTO v_lat, v_lng, v_radius
    FROM public.profiles
   WHERE id = p_user_id;

  /* 2. Fallback : si pas de home_lat, prend le 1er cercle local rejoint. */
  IF v_lat IS NULL OR v_lng IS NULL THEN
    SELECT c.location_lat, c.location_lng, COALESCE(c.location_radius_km, 5.0)
      INTO v_lat, v_lng, v_radius
      FROM public.circle_members cm
      JOIN public.circles c ON c.id = cm.circle_id
     WHERE cm.user_id = p_user_id
       AND cm.status = 'active'
       AND c.is_local = true
       AND c.location_lat IS NOT NULL
       AND c.location_lng IS NOT NULL
     ORDER BY cm.joined_at DESC
     LIMIT 1;
  END IF;

  /* 3. Toujours null → pas de geo candidates pour cet user. */
  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN;
  END IF;

  /* 4. Query posts dans le rayon. */
  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id AS post_id,
      public.haversine_km(v_lat, v_lng, p.location_lat, p.location_lng) AS dist_km,
      p.created_at,
      p.author_id
    FROM public.posts p
    WHERE p.deleted_at IS NULL
      AND p.status = 'published'
      AND p.location_lat IS NOT NULL
      AND p.location_lng IS NOT NULL
      AND p.author_id <> p_user_id  -- skip posts of self
      AND p.created_at > now() - (p_days || ' days')::interval
      /* Pré-filtre grossier sur lat/lng box pour réduire scan
         (≈ 1° latitude = 111 km). Pas exact mais accélère grandement. */
      AND p.location_lat BETWEEN (v_lat - (v_radius / 111.0))
                             AND (v_lat + (v_radius / 111.0))
      AND p.location_lng BETWEEN (v_lng - (v_radius / (111.0 * cos(radians(v_lat)))))
                             AND (v_lng + (v_radius / (111.0 * cos(radians(v_lat)))))
  )
  SELECT
    c.post_id,
    c.dist_km::numeric AS distance_km,
    /* freshness_score : exp decay sur 7j demi-vie. */
    GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (now() - c.created_at)) / (86400.0 * 7))::numeric AS freshness_score,
    /* combined : 60% distance_decay + 40% freshness. */
    (
      0.6 * (1.0 / (1.0 + c.dist_km / v_radius))::numeric
      + 0.4 * GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (now() - c.created_at)) / (86400.0 * 7))::numeric
    )::numeric AS combined_score
  FROM candidates c
  WHERE c.dist_km <= v_radius
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_posts_for_user(UUID, integer, integer)
  TO authenticated;

COMMIT;
