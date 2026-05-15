-- Chantier Cercles v3 — Sous-cercles imbriqués + Cercles éphémères
-- ================================================================
--
-- 2 features signature qui distinguent DIVARC :
--
-- 1. **Sous-cercles imbriqués** (Tech FR → Tech FR Paris → Backend)
--    Hiérarchie parent/enfant qui permet aux grands cercles (10k+
--    membres) de scaler en restant intimes via squads de 50.
--    Limite : profondeur max 3 (parent → enfant → petit-enfant).
--
-- 2. **Cercles éphémères** (auto-archive après event/échéance)
--    Coupe du Monde, conférence, festival, cohorte bootcamp —
--    cercles avec date d'expiration qui passent en statut
--    "archived_ephemeral" automatiquement via cron.
--
-- Architecture :
--  - Colonnes ajoutées à `circles` (pas de tables séparées) car
--    sémantiquement chaque cercle peut être un sous-cercle, peut
--    être éphémère, indépendamment.
--  - Trigger pour calculer + valider depth (1-3) automatiquement.
--  - RPC mark_expired_circles() callable par cron Supabase.

BEGIN;

-- ============================================================
-- 1. Colonnes hiérarchie sur circles
-- ============================================================

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS parent_circle_id UUID REFERENCES public.circles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 1
    CHECK (depth BETWEEN 1 AND 3),
  /* Compteur dénormalisé : nombre de sous-cercles directs visibles. */
  ADD COLUMN IF NOT EXISTS sub_circles_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS circles_parent_idx
  ON public.circles (parent_circle_id)
  WHERE parent_circle_id IS NOT NULL;

-- ============================================================
-- 2. Colonnes cycle de vie (éphémère)
-- ============================================================

ALTER TABLE public.circles
  /* Type de cycle :
     - permanent          : standard, pas d'expiration
     - ephemeral          : expire à expires_at
     - archived_ephemeral : expiré, devenu lecture seule */
  ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'permanent'
    CHECK (lifecycle IN ('permanent', 'ephemeral', 'archived_ephemeral')),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  /* Référence optionnelle à un event qui motive l'éphémère. */
  ADD COLUMN IF NOT EXISTS event_anchor_id UUID REFERENCES public.circle_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS circles_lifecycle_expires_idx
  ON public.circles (lifecycle, expires_at)
  WHERE lifecycle = 'ephemeral';

-- ============================================================
-- 3. Trigger : calcul automatique de depth
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_calc_circle_depth()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_depth integer;
BEGIN
  IF NEW.parent_circle_id IS NULL THEN
    NEW.depth := 1;
    RETURN NEW;
  END IF;

  SELECT depth INTO parent_depth FROM public.circles
    WHERE id = NEW.parent_circle_id;

  IF parent_depth IS NULL THEN
    RAISE EXCEPTION 'parent circle not found';
  END IF;

  IF parent_depth >= 3 THEN
    RAISE EXCEPTION 'max depth (3) exceeded — cannot nest further';
  END IF;

  NEW.depth := parent_depth + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_calc_circle_depth_trg ON public.circles;
CREATE TRIGGER tg_calc_circle_depth_trg
  BEFORE INSERT OR UPDATE OF parent_circle_id ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.tg_calc_circle_depth();

-- ============================================================
-- 4. Trigger : sub_circles_count dénormalisé
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_sync_sub_circles_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_circle_id IS NOT NULL THEN
      UPDATE public.circles SET sub_circles_count = sub_circles_count + 1
        WHERE id = NEW.parent_circle_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_circle_id IS NOT NULL THEN
      UPDATE public.circles SET sub_circles_count = GREATEST(sub_circles_count - 1, 0)
        WHERE id = OLD.parent_circle_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    /* Le parent a changé ? */
    IF OLD.parent_circle_id IS DISTINCT FROM NEW.parent_circle_id THEN
      IF OLD.parent_circle_id IS NOT NULL THEN
        UPDATE public.circles SET sub_circles_count = GREATEST(sub_circles_count - 1, 0)
          WHERE id = OLD.parent_circle_id;
      END IF;
      IF NEW.parent_circle_id IS NOT NULL THEN
        UPDATE public.circles SET sub_circles_count = sub_circles_count + 1
          WHERE id = NEW.parent_circle_id;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_sync_sub_circles_count_trg ON public.circles;
CREATE TRIGGER tg_sync_sub_circles_count_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_sub_circles_count();

-- ============================================================
-- 5. RPC : list_sub_circles
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_sub_circles(p_parent_id UUID)
RETURNS TABLE (
  id UUID,
  slug text,
  name text,
  tagline text,
  emoji text,
  members_count int,
  vitality_score numeric,
  lifecycle text,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id, c.slug, c.name, c.tagline, c.emoji,
    c.members_count, c.vitality_score, c.lifecycle, c.expires_at,
    c.created_at
  FROM public.circles c
  WHERE c.parent_circle_id = p_parent_id
    AND c.archived_at IS NULL
  ORDER BY c.lifecycle ASC, c.members_count DESC, c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_sub_circles(UUID) TO authenticated;

-- ============================================================
-- 6. RPC : mark_expired_circles (cron daily)
-- ============================================================
-- Bascule en archived_ephemeral tous les cercles ephemeral dont
-- expires_at < now(). Lance une notif aux membres pour informer.

CREATE OR REPLACE FUNCTION public.mark_expired_circles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.circles
       SET lifecycle = 'archived_ephemeral',
           archived_at = now()
     WHERE lifecycle = 'ephemeral'
       AND expires_at IS NOT NULL
       AND expires_at < now()
    RETURNING id, name, slug
  )
  SELECT COUNT(*) INTO affected_count FROM expired;

  RETURN affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_expired_circles() TO authenticated;

-- ============================================================
-- 7. Création de sous-cercle : RLS check parent admin
-- ============================================================
-- La policy INSERT existante de circles autorise tous les users
-- authentifiés à créer des cercles. Pour créer un sous-cercle, on
-- ajoute une policy supplémentaire qui exige d'être owner/admin du
-- parent. Plus simple : check applicatif côté Server Action +
-- trigger BEFORE INSERT pour double-sécurité.

CREATE OR REPLACE FUNCTION public.tg_check_subcircle_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_circle_id IS NULL THEN RETURN NEW; END IF;

  /* Vérifie que le créateur est owner/admin du parent. */
  IF NOT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = NEW.parent_circle_id
      AND user_id = NEW.owner_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'cannot create sub-circle: owner/admin role required on parent';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_check_subcircle_creation_trg ON public.circles;
CREATE TRIGGER tg_check_subcircle_creation_trg
  BEFORE INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.tg_check_subcircle_creation();

COMMIT;
