-- ============================================================================
-- 0174_live_milestones_followers.sql — Étape 30/60
--
-- Auto-system comments :
--   - Milestone : trigger sur UPDATE peak_participants quand on franchit
--     un seuil (10, 50, 100, 500, 1000, 5000, 10000)
--   - Follow : trigger sur INSERT user_follows si le followed_id a un
--     live actif → INSERT system comment + increment new_followers_count
-- ============================================================================

-- ============================================================================
-- 1. Trigger milestone : INSERT system comment quand peak franchi un seuil.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_live_milestone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_thresholds integer[] := ARRAY[10, 50, 100, 500, 1000, 5000, 10000];
  v_threshold integer;
BEGIN
  IF NEW.status <> 'live' THEN
    RETURN NEW;
  END IF;
  IF NEW.peak_participants IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.peak_participants IS NULL THEN
    OLD.peak_participants := 0;
  END IF;

  FOREACH v_threshold IN ARRAY v_thresholds LOOP
    IF OLD.peak_participants < v_threshold AND NEW.peak_participants >= v_threshold THEN
      INSERT INTO public.live_chat_messages (
        session_id,
        user_id,
        username,
        content,
        comment_type
      ) VALUES (
        NEW.id,
        NEW.host_id,
        NEW.host_username,
        '🎉 ' || v_threshold || ' viewers atteints !',
        'milestone'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_milestone ON public.circle_live_rooms;
CREATE TRIGGER trg_live_milestone
  AFTER UPDATE ON public.circle_live_rooms
  FOR EACH ROW
  WHEN (OLD.peak_participants IS DISTINCT FROM NEW.peak_participants)
  EXECUTE FUNCTION public.trigger_live_milestone();

-- ============================================================================
-- 2. Trigger follow during live : si user_follows.followed_id host a un live
--    actif → INSERT 'follow' comment + increment new_followers_count.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_live_new_follow()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_live record;
  v_follower record;
BEGIN
  /* Trouve un live actif du host. */
  SELECT id, host_username INTO v_live
    FROM public.circle_live_rooms
    WHERE host_id = NEW.followed_id
      AND status = 'live'
    ORDER BY started_at DESC
    LIMIT 1;

  IF v_live.id IS NULL THEN
    RETURN NEW;
  END IF;

  /* Snapshot follower. */
  SELECT id, username, full_name, avatar_url INTO v_follower
    FROM public.profiles
    WHERE id = NEW.follower_id;

  /* INSERT system comment + increment counter. */
  INSERT INTO public.live_chat_messages (
    session_id,
    user_id,
    username,
    avatar_url,
    content,
    comment_type
  ) VALUES (
    v_live.id,
    NEW.follower_id,
    COALESCE(v_follower.username, v_follower.full_name),
    v_follower.avatar_url,
    COALESCE(v_follower.full_name, v_follower.username, 'Un viewer') || ' a suivi',
    'follow'
  );

  UPDATE public.circle_live_rooms
    SET new_followers_count = new_followers_count + 1
    WHERE id = v_live.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_new_follow ON public.user_follows;
CREATE TRIGGER trg_live_new_follow
  AFTER INSERT ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_live_new_follow();

COMMENT ON FUNCTION public.trigger_live_milestone() IS
  'Étape 30/60 : Auto-INSERT milestone comment quand peak franchit un seuil.';
COMMENT ON FUNCTION public.trigger_live_new_follow() IS
  'Étape 30/60 : Auto-INSERT follow comment quand un user follow le host pendant son live actif.';
