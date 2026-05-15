-- Chantier Cercles v4 — Sprint B étape B.3 : Channel type "announcement"
-- =======================================================================
--
-- Quand un post est créé dans un channel de type 'announcement', on push
-- une notification in-app à TOUS les membres actifs du cercle (sauf
-- l'auteur lui-même). Pattern aligné sur 0129_story_notifications
-- (utilise type='system' pour ne pas avoir à éditer la contrainte
-- notifications_type_check qui est fragile entre migrations).
--
-- L'autorisation "seul admin/owner/moderator peut poster dans un
-- channel announcement" est gérée côté Server Action DIVARC (Zod +
-- check role) — RLS posts gère déjà la partie "membre du cercle".
-- Une politique RLS plus stricte est faisable en V2 si besoin de
-- défense en profondeur.
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. Fonction tg_notify_announcement_post
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_notify_announcement_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_type text;
  v_channel_name text;
  v_circle_name text;
  v_circle_slug text;
  v_author_name text;
BEGIN
  /* Skip si pas de channel_id (post libre) ou si soft-delete. */
  IF NEW.channel_id IS NULL OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  /* Skip si pas un channel announcement. */
  SELECT channel_type, name INTO v_channel_type, v_channel_name
    FROM public.circle_channels
   WHERE id = NEW.channel_id;
  IF v_channel_type IS DISTINCT FROM 'announcement' THEN
    RETURN NEW;
  END IF;

  /* Skip si le post n'est pas publié (draft, scheduled…). */
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  /* Récupère contexte cercle + auteur pour le contenu de la notif. */
  SELECT name, slug INTO v_circle_name, v_circle_slug
    FROM public.circles
   WHERE id = NEW.circle_id;

  SELECT COALESCE(full_name, username, 'Un admin') INTO v_author_name
    FROM public.profiles
   WHERE id = NEW.author_id;

  /* INSERT une notif par membre actif du cercle (sauf l'auteur).
     SELECT INTO INSERT évite la latence de N inserts JS. */
  INSERT INTO public.notifications (user_id, type, title, body, related_user_id, href)
  SELECT
    cm.user_id,
    'system',
    '📢 ' || v_author_name || ' dans #' || COALESCE(v_channel_name, 'annonces'),
    LEFT(COALESCE(NEW.body, ''), 180),
    NEW.author_id,
    '/circles/' || COALESCE(v_circle_slug, '') || '/posts/' || NEW.id::text
  FROM public.circle_members cm
  WHERE cm.circle_id = NEW.circle_id
    AND cm.user_id <> NEW.author_id
    AND cm.status = 'active'
    AND cm.is_banned = false;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Trigger AFTER INSERT
-- ============================================================

DROP TRIGGER IF EXISTS tg_notify_announcement_post_trg ON public.posts;
CREATE TRIGGER tg_notify_announcement_post_trg
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_announcement_post();

COMMIT;
