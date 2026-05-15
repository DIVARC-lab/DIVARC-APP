-- Chantier Cercles v3 — Méta-cercles (Hubs) + Réputation portable
-- =================================================================
--
-- 2 features liées :
--
-- 1. **Hubs** : agrégateurs horizontaux de cercles. Ex : Hub
--    "FrenchTech" rassemble les cercles Devs FR, Designers FR,
--    Founders FR, PM FR. Cross-pollination, feed agrégé, top
--    contributors cross-cercles.
--
--    Différence vs sous-cercles (migration 0134) :
--      - Sous-cercles = HIÉRARCHIE verticale (parent → enfant),
--        gouvernance descendante, 1 owner unique.
--      - Hubs = AGRÉGATION horizontale, cercles indépendants
--        gardent leur gouvernance, peuvent rejoindre/quitter le
--        hub, 1 owner par cercle + 1 owner par hub.
--
-- 2. **Reputation portable** : agrégation du karma d'un user à
--    travers TOUS les cercles → score global affichable sur le
--    profil public DIVARC. Multiplie l'engagement cross-cercle.

BEGIN;

-- ============================================================
-- 1. circle_hubs — agrégateurs horizontaux
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  tagline text CHECK (tagline IS NULL OR char_length(tagline) <= 140),
  description text CHECK (description IS NULL OR char_length(description) <= 4000),
  emoji text CHECK (emoji IS NULL OR char_length(emoji) <= 8),
  cover_url text,
  color_accent text NOT NULL DEFAULT '#C9A961'
    CHECK (color_accent ~ '^#[0-9a-fA-F]{6}$'),
  /* Hub owner = user qui anime / gère. */
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Catégorie thématique (Tech, Sport, Culture, etc.). */
  primary_category text,
  tags text[] DEFAULT '{}',
  /* Visibility : public découvrable / unlisted = sur lien direct. */
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'unlisted')),
  /* Policy d'admission de cercles : open = auto, approval = owner valide. */
  join_policy text NOT NULL DEFAULT 'approval'
    CHECK (join_policy IN ('open', 'approval')),
  circles_count integer NOT NULL DEFAULT 0,
  members_aggregate integer NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circle_hubs_slug_idx ON public.circle_hubs (slug);
CREATE INDEX IF NOT EXISTS circle_hubs_owner_idx ON public.circle_hubs (owner_id);
CREATE INDEX IF NOT EXISTS circle_hubs_category_idx
  ON public.circle_hubs (primary_category, members_aggregate DESC)
  WHERE archived_at IS NULL AND visibility = 'public';

-- ============================================================
-- 2. circle_hub_circles — table jonction (cercles d'un hub)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_hub_circles (
  hub_id UUID NOT NULL REFERENCES public.circle_hubs(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'left')),
  /* Qui a proposé l'adhésion : l'owner du cercle généralement. */
  proposed_by UUID NOT NULL REFERENCES auth.users(id),
  /* Qui a validé (owner du hub ou auto si join_policy=open). */
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hub_id, circle_id)
);

CREATE INDEX IF NOT EXISTS circle_hub_circles_hub_idx
  ON public.circle_hub_circles (hub_id, status, joined_at DESC);
CREATE INDEX IF NOT EXISTS circle_hub_circles_circle_idx
  ON public.circle_hub_circles (circle_id, status);

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.circle_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_hub_circles ENABLE ROW LEVEL SECURITY;

/* Hubs : SELECT public si visibility=public, sinon owner uniquement. */
DROP POLICY IF EXISTS circle_hubs_select_public ON public.circle_hubs;
CREATE POLICY circle_hubs_select_public
  ON public.circle_hubs FOR SELECT
  USING (
    archived_at IS NULL
    AND (
      visibility = 'public'
      OR visibility = 'unlisted'
      OR owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_hubs_insert_auth ON public.circle_hubs;
CREATE POLICY circle_hubs_insert_auth
  ON public.circle_hubs FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS circle_hubs_update_owner ON public.circle_hubs;
CREATE POLICY circle_hubs_update_owner
  ON public.circle_hubs FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

/* Hub circles : SELECT public (les cercles d'un hub sont visibles
   à tous), INSERT par owner du circle (propose), UPDATE par owner
   du hub (approve/reject) ou owner du circle (leave). */
DROP POLICY IF EXISTS circle_hub_circles_select ON public.circle_hub_circles;
CREATE POLICY circle_hub_circles_select
  ON public.circle_hub_circles FOR SELECT
  USING (true); -- public

DROP POLICY IF EXISTS circle_hub_circles_insert_circle_owner ON public.circle_hub_circles;
CREATE POLICY circle_hub_circles_insert_circle_owner
  ON public.circle_hub_circles FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_hub_circles.circle_id
        AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_hub_circles_update ON public.circle_hub_circles;
CREATE POLICY circle_hub_circles_update
  ON public.circle_hub_circles FOR UPDATE
  USING (
    /* Owner du hub peut approve/reject */
    EXISTS (
      SELECT 1 FROM public.circle_hubs h
      WHERE h.id = circle_hub_circles.hub_id
        AND h.owner_id = auth.uid()
    )
    OR
    /* Owner du cercle peut leave */
    EXISTS (
      SELECT 1 FROM public.circles c
      WHERE c.id = circle_hub_circles.circle_id
        AND c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Triggers : maintenance circles_count + members_aggregate
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_sync_hub_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_hub UUID;
  new_circles_count int;
  new_members_aggregate int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    affected_hub := NEW.hub_id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_hub := OLD.hub_id;
  ELSIF TG_OP = 'UPDATE' THEN
    affected_hub := NEW.hub_id;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'approved'),
    COALESCE(SUM(c.members_count) FILTER (WHERE hc.status = 'approved'), 0)
    INTO new_circles_count, new_members_aggregate
  FROM public.circle_hub_circles hc
  LEFT JOIN public.circles c ON c.id = hc.circle_id
  WHERE hc.hub_id = affected_hub;

  UPDATE public.circle_hubs
     SET circles_count = new_circles_count,
         members_aggregate = new_members_aggregate,
         updated_at = now()
   WHERE id = affected_hub;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_sync_hub_counts_trg ON public.circle_hub_circles;
CREATE TRIGGER tg_sync_hub_counts_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.circle_hub_circles
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_hub_counts();

-- ============================================================
-- 5. RPC : list_hub_circles — liste cercles approuvés d'un hub
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_hub_circles(p_hub_id UUID)
RETURNS TABLE (
  id UUID,
  slug text,
  name text,
  tagline text,
  emoji text,
  members_count int,
  vitality_score numeric,
  primary_category text,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id, c.slug, c.name, c.tagline, c.emoji,
    c.members_count, c.vitality_score, c.primary_category,
    hc.joined_at
  FROM public.circle_hub_circles hc
  JOIN public.circles c ON c.id = hc.circle_id
  WHERE hc.hub_id = p_hub_id
    AND hc.status = 'approved'
    AND c.archived_at IS NULL
  ORDER BY c.members_count DESC, c.vitality_score DESC, hc.joined_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_hub_circles(UUID) TO authenticated;

-- ============================================================
-- 6. RPC : aggregate_hub_feed — posts cross-cercles d'un hub
-- ============================================================

CREATE OR REPLACE FUNCTION public.aggregate_hub_feed(
  p_hub_id UUID,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  post_id UUID,
  circle_id UUID,
  circle_slug text,
  circle_name text,
  circle_emoji text,
  author_id UUID,
  body text,
  likes_count int,
  comments_count int,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id AS post_id,
    p.circle_id,
    c.slug AS circle_slug,
    c.name AS circle_name,
    c.emoji AS circle_emoji,
    p.author_id,
    LEFT(COALESCE(p.body, ''), 280) AS body,
    p.likes_count,
    p.comments_count,
    p.created_at
  FROM public.circle_hub_circles hc
  JOIN public.circles c ON c.id = hc.circle_id
  JOIN public.posts p ON p.circle_id = hc.circle_id
  WHERE hc.hub_id = p_hub_id
    AND hc.status = 'approved'
    AND c.archived_at IS NULL
    AND p.deleted_at IS NULL
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.aggregate_hub_feed(UUID, int) TO authenticated;

-- ============================================================
-- 7. RPC : get_user_global_reputation — réputation portable
-- ============================================================
-- Agrège le karma d'un user à travers TOUS les cercles dont il est
-- membre actif. Retourne :
--   - total_karma   : somme des points
--   - circles_count : nombre de cercles où il est membre
--   - top_circles   : top 3 cercles avec son karma le plus haut
--   - badges        : liste des rôles (owner/admin/ambassador) gagnés

CREATE OR REPLACE FUNCTION public.get_user_global_reputation(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_karma int;
  circles_count int;
  top_circles jsonb;
  badges jsonb;
BEGIN
  SELECT COALESCE(SUM(points), 0)::int, COUNT(DISTINCT circle_id)::int
    INTO total_karma, circles_count
    FROM public.circle_member_karma
   WHERE user_id = p_user_id;

  /* Top 3 cercles par karma. */
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'circle_id', mk.circle_id,
    'circle_slug', c.slug,
    'circle_name', c.name,
    'circle_emoji', c.emoji,
    'points', mk.points
  ) ORDER BY mk.points DESC), '[]'::jsonb)
    INTO top_circles
  FROM (
    SELECT circle_id, points
      FROM public.circle_member_karma
     WHERE user_id = p_user_id
     ORDER BY points DESC
     LIMIT 3
  ) mk
  JOIN public.circles c ON c.id = mk.circle_id
  WHERE c.archived_at IS NULL;

  /* Badges : rôles owner/admin/moderator/ambassador dans tous les
     cercles confondus. */
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'circle_id', m.circle_id,
    'circle_slug', c.slug,
    'circle_name', c.name,
    'role', m.role
  )), '[]'::jsonb)
    INTO badges
  FROM public.circle_members m
  JOIN public.circles c ON c.id = m.circle_id
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND m.role IN ('owner', 'admin', 'moderator', 'mod', 'ambassador')
    AND c.archived_at IS NULL;

  result := jsonb_build_object(
    'total_karma', total_karma,
    'circles_count', circles_count,
    'top_circles', top_circles,
    'badges', badges
  );
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_global_reputation(UUID) TO authenticated;

-- ============================================================
-- 8. RPC : list_discoverable_hubs — pour la page /circles/hubs
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_discoverable_hubs(
  p_category text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  slug text,
  name text,
  tagline text,
  emoji text,
  color_accent text,
  primary_category text,
  circles_count int,
  members_aggregate int,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    h.id, h.slug, h.name, h.tagline, h.emoji, h.color_accent,
    h.primary_category, h.circles_count, h.members_aggregate,
    h.created_at
  FROM public.circle_hubs h
  WHERE h.archived_at IS NULL
    AND h.visibility = 'public'
    AND (p_category IS NULL OR h.primary_category = p_category)
  ORDER BY h.members_aggregate DESC, h.circles_count DESC, h.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.list_discoverable_hubs(text, int) TO authenticated;

COMMIT;
