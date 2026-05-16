-- Chantier Cercles v4 — Sprint D étape D.2 : Préférences notif par cercle
-- =========================================================================
--
-- Permet à chaque membre de configurer un mode de notification spécifique
-- par cercle (par-dessus les préférences globales `user_notification_preferences`).
--
-- 3 modes :
--   all            : reçoit tout (défaut implicite si aucune ligne)
--   mentions_only  : reçoit uniquement les @mentions explicites
--   muted          : aucune notif de ce cercle (le user voit toujours
--                    le contenu en visite, mais zéro notif générée)
--
-- Intégration avec le trigger announcement (B.3) et avec le hook push
-- (D.3) : on lit `should_notify_member_in_circle(user_id, circle_id, kind)`
-- AVANT chaque INSERT notifications + AVANT chaque sendPushToUsers côté
-- Server Action.
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. Table circle_notification_preferences
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_notification_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'all'
    CHECK (mode IN ('all', 'mentions_only', 'muted')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, circle_id)
);

CREATE INDEX IF NOT EXISTS circle_notif_prefs_circle_idx
  ON public.circle_notification_preferences (circle_id)
  WHERE mode != 'all';

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.circle_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS circle_notif_prefs_select ON public.circle_notification_preferences;
CREATE POLICY circle_notif_prefs_select
  ON public.circle_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS circle_notif_prefs_insert ON public.circle_notification_preferences;
CREATE POLICY circle_notif_prefs_insert
  ON public.circle_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS circle_notif_prefs_update ON public.circle_notification_preferences;
CREATE POLICY circle_notif_prefs_update
  ON public.circle_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS circle_notif_prefs_delete ON public.circle_notification_preferences;
CREATE POLICY circle_notif_prefs_delete
  ON public.circle_notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. Helper should_notify_member_in_circle
-- ============================================================
--
-- True si l'user accepte ce kind de notif pour ce cercle.
-- kind ∈ ('all', 'mention') :
--   - 'mention' bypass le mode 'mentions_only' (passe quand même)
--   - 'all' (default) respecte tous les modes : skip si muted ou mentions_only
-- 'muted' = toujours false.

CREATE OR REPLACE FUNCTION public.should_notify_member_in_circle(
  p_user_id UUID,
  p_circle_id UUID,
  p_kind text DEFAULT 'all'
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE
      /* Aucune ligne = défaut 'all'. */
      WHEN NOT EXISTS (
        SELECT 1 FROM public.circle_notification_preferences
         WHERE user_id = p_user_id AND circle_id = p_circle_id
      ) THEN true
      ELSE (
        SELECT
          CASE
            WHEN mode = 'muted' THEN false
            WHEN mode = 'mentions_only' AND p_kind != 'mention' THEN false
            ELSE true
          END
        FROM public.circle_notification_preferences
        WHERE user_id = p_user_id AND circle_id = p_circle_id
      )
    END;
$$;

GRANT EXECUTE ON FUNCTION public.should_notify_member_in_circle(UUID, UUID, text)
  TO authenticated;

-- ============================================================
-- 4. Update trigger announcement (B.3) pour respecter ce setting
-- ============================================================
--
-- On remplace la fonction tg_notify_announcement_post pour filter les
-- destinataires selon should_notify_member_in_circle. Les mutes
-- prennent effet immédiatement.

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
  IF NEW.channel_id IS NULL OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT channel_type, name INTO v_channel_type, v_channel_name
    FROM public.circle_channels WHERE id = NEW.channel_id;
  IF v_channel_type IS DISTINCT FROM 'announcement' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT name, slug INTO v_circle_name, v_circle_slug
    FROM public.circles WHERE id = NEW.circle_id;

  SELECT COALESCE(full_name, username, 'Un admin') INTO v_author_name
    FROM public.profiles WHERE id = NEW.author_id;

  /* Sprint D.2 — Filtre les membres mutés/mentions_only. */
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
    AND cm.is_banned = false
    AND public.should_notify_member_in_circle(cm.user_id, NEW.circle_id, 'all') = true;

  RETURN NEW;
END;
$$;

COMMIT;
