-- Chantier Stories v2 — Notifications
-- =====================================
--
-- User reportait : "j'ai répondu à la story depuis un autre compte mais
-- j'ai pas reçu de notification ni la réaction".
--
-- La migration 0128 a créé story_likes + story_replies mais SANS les
-- triggers de notification (oubli). Cette migration ajoute :
--   - notify_story_liked  : trigger sur story_likes INSERT
--   - notify_story_replied : trigger sur story_replies INSERT (body preview)
--
-- Pattern aligné sur notify_post_liked / notify_post_commented dans
-- migration 0007. L'auteur de la story reçoit une notif quand un autre
-- user like ou réplique.

BEGIN;

-- ============================================================
-- 1. Like sur une story
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_story_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  story_author uuid;
  liker_name text;
  story_id_str text;
BEGIN
  SELECT author_id INTO story_author
    FROM public.stories
   WHERE id = NEW.story_id;

  /* Pas de notif si la story n'existe plus ou si on s'auto-like. */
  IF story_author IS NULL OR story_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Quelqu''un') INTO liker_name
    FROM public.profiles
   WHERE id = NEW.user_id;

  story_id_str := NEW.story_id::text;

  INSERT INTO public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) VALUES (
    story_author,
    'system',
    liker_name || ' a aimé ta story',
    NULL,
    NEW.user_id,
    '/stories/' || story_id_str
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_story_liked_trg ON public.story_likes;
CREATE TRIGGER notify_story_liked_trg
  AFTER INSERT ON public.story_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_story_liked();

-- ============================================================
-- 2. Réponse sur une story
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_story_replied()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  story_author uuid;
  replier_name text;
  preview text;
  story_id_str text;
BEGIN
  SELECT author_id INTO story_author
    FROM public.stories
   WHERE id = NEW.story_id;

  IF story_author IS NULL OR story_author = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Quelqu''un') INTO replier_name
    FROM public.profiles
   WHERE id = NEW.author_id;

  /* Preview du body, max 140 chars + ellipsis. */
  preview := substring(NEW.body FROM 1 FOR 140);
  IF char_length(NEW.body) > 140 THEN
    preview := preview || '…';
  END IF;

  story_id_str := NEW.story_id::text;

  INSERT INTO public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) VALUES (
    story_author,
    'system',
    replier_name || ' a répondu à ta story',
    preview,
    NEW.author_id,
    '/stories/' || story_id_str
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_story_replied_trg ON public.story_replies;
CREATE TRIGGER notify_story_replied_trg
  AFTER INSERT ON public.story_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_story_replied();

COMMIT;
