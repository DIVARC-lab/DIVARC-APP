-- ============================================================================
-- 0168_live_likes_and_realtime.sql
--
-- 1. Active Supabase Realtime sur live_chat_messages pour le chat
--    instantané TikTok-like (broadcast INSERT/UPDATE/DELETE).
--
-- 2. Système de likes gratuits :
--    - Colonne like_count sur circle_live_rooms (compteur global)
--    - RPC send_live_like(session_id) : increment atomique + retour count
--    - Pas de table live_likes (économise des écritures massives).
--      Si plus tard on veut tracker qui a liké, on ajoutera.
--    - Rate-limit : 5 likes / 2 secondes / user (anti-bot)
-- ============================================================================

-- Active Realtime sur la table chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
  END IF;
END $$;

-- Compteur de likes sur le live
ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

-- ============================================================================
-- Rate-limit léger via table éphémère des derniers likes par user/session.
-- Une ligne par user par session avec timestamps des N derniers likes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_like_buckets (
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recent_at timestamptz[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

ALTER TABLE public.live_like_buckets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS live_like_buckets_self ON public.live_like_buckets;
CREATE POLICY live_like_buckets_self
  ON public.live_like_buckets
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- RPC : send_live_like(session_id)
--
-- 1. Check rate-limit : pas plus de 5 likes / 2 secondes / user / session
-- 2. Si OK : INSERT/UPDATE bucket + increment like_count
-- 3. Retourne le nouveau like_count global
-- 4. Throw 'rate_limited' si abuse
--
-- Idempotent côté UX : chaque click = 1 like (pas de toggle).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.send_live_like(
  p_session_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_recent timestamptz[];
  v_count integer;
  v_new_total integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  /* Verify session is live. */
  IF NOT EXISTS (
    SELECT 1 FROM public.circle_live_rooms
    WHERE id = p_session_id AND status = 'live'
  ) THEN
    RAISE EXCEPTION 'live_not_active';
  END IF;

  /* Read bucket + filter timestamps > now - 2s. */
  SELECT recent_at INTO v_recent
    FROM public.live_like_buckets
    WHERE session_id = p_session_id AND user_id = v_user_id;

  IF v_recent IS NULL THEN
    v_recent := '{}';
  END IF;

  v_recent := array(
    SELECT t FROM unnest(v_recent) t WHERE t > v_now - interval '2 seconds'
  );

  IF array_length(v_recent, 1) >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  v_recent := array_append(v_recent, v_now);

  /* UPSERT bucket. */
  INSERT INTO public.live_like_buckets (session_id, user_id, recent_at, updated_at)
    VALUES (p_session_id, v_user_id, v_recent, v_now)
    ON CONFLICT (session_id, user_id) DO UPDATE
    SET recent_at = EXCLUDED.recent_at, updated_at = v_now;

  /* Increment compteur global. */
  UPDATE public.circle_live_rooms
    SET like_count = like_count + 1
    WHERE id = p_session_id
    RETURNING like_count INTO v_new_total;

  RETURN COALESCE(v_new_total, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.send_live_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_live_like(uuid) TO authenticated;

-- Active Realtime sur circle_live_rooms pour broadcast like_count.
-- L'UI viewer reçoit l'UPDATE et incrémente le badge.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'circle_live_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_live_rooms;
  END IF;
END $$;

COMMENT ON FUNCTION public.send_live_like(uuid) IS
  'Likes gratuits TikTok-like. Rate-limited 5 / 2s par user. Retourne nouveau compteur global.';
