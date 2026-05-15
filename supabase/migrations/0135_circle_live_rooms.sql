-- Chantier Cercles v3 — Live Audio/Video Rooms
-- =============================================
--
-- Salles live (Twitter Spaces audio + livestream vidéo) attachées à
-- un cercle. Réutilise l'infra WebRTC existante (CallProvider +
-- useCallSession + signaling Realtime).
--
-- Différences vs call 1-1 existant :
--  - 1-to-many (host + N listeners/viewers)
--  - Présence persistente (qui écoute) visible
--  - Lifecycle : scheduled → live → ended
--  - Optionnel : raising hand pour parler (audio room)
--  - Optionnel : chat sidebar pendant le live

BEGIN;

-- ============================================================
-- 1. circle_live_rooms — salles live d'un cercle
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_live_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'audio'
    CHECK (kind IN ('audio', 'video')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  /* Lifecycle. */
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  /* Replay (si enregistré côté Storage). */
  recording_url text,
  /* Compteurs dénormalisés. */
  participants_count integer NOT NULL DEFAULT 0,
  peak_participants integer NOT NULL DEFAULT 0,
  /* Soft delete pour annulation/modération. */
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circle_live_rooms_circle_status_idx
  ON public.circle_live_rooms (circle_id, status, scheduled_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 2. circle_live_participants — qui est dans la room
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_live_participants (
  room_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'listener'
    CHECK (role IN ('host', 'co_host', 'speaker', 'listener', 'viewer')),
  /* Audio room : raising hand pour demander la parole. */
  is_hand_raised boolean NOT NULL DEFAULT false,
  /* Mute state (côté serveur, source de vérité partagée). */
  is_muted boolean NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS circle_live_participants_room_active_idx
  ON public.circle_live_participants (room_id, role)
  WHERE left_at IS NULL;

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.circle_live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_live_participants ENABLE ROW LEVEL SECURITY;

/* Rooms : SELECT membres actifs du cercle. */
DROP POLICY IF EXISTS circle_live_rooms_select_member ON public.circle_live_rooms;
CREATE POLICY circle_live_rooms_select_member
  ON public.circle_live_rooms FOR SELECT
  USING (
    deleted_at IS NULL AND public.is_circle_active_member(circle_id)
  );

/* INSERT : owner/admin/moderator du cercle uniquement. */
DROP POLICY IF EXISTS circle_live_rooms_insert_admin ON public.circle_live_rooms;
CREATE POLICY circle_live_rooms_insert_admin
  ON public.circle_live_rooms FOR INSERT
  WITH CHECK (
    host_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circle_members
       WHERE circle_id = circle_live_rooms.circle_id
         AND user_id = auth.uid()
         AND status = 'active'
         AND role IN ('owner', 'admin', 'moderator', 'mod')
    )
  );

/* UPDATE : host + admin/owner. */
DROP POLICY IF EXISTS circle_live_rooms_update_host ON public.circle_live_rooms;
CREATE POLICY circle_live_rooms_update_host
  ON public.circle_live_rooms FOR UPDATE
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_members
       WHERE circle_id = circle_live_rooms.circle_id
         AND user_id = auth.uid()
         AND status = 'active'
         AND role IN ('owner', 'admin')
    )
  );

/* Participants : SELECT membres actifs du cercle. */
DROP POLICY IF EXISTS circle_live_participants_select_member ON public.circle_live_participants;
CREATE POLICY circle_live_participants_select_member
  ON public.circle_live_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = circle_live_participants.room_id
        AND public.is_circle_active_member(r.circle_id)
    )
  );

/* INSERT/UPDATE/DELETE own (les hosts/admins gèreront via RPC dédiée). */
DROP POLICY IF EXISTS circle_live_participants_own ON public.circle_live_participants;
CREATE POLICY circle_live_participants_own
  ON public.circle_live_participants FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. RPC join_live_room — atomique : insert participant + bump count
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_circle_live_room(p_room_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_record record;
  current_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT * INTO room_record FROM public.circle_live_rooms WHERE id = p_room_id;
  IF NOT FOUND OR room_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'room not found';
  END IF;

  IF NOT public.is_circle_active_member(room_record.circle_id) THEN
    RAISE EXCEPTION 'not a member of the circle';
  END IF;

  IF room_record.status NOT IN ('scheduled', 'live') THEN
    RAISE EXCEPTION 'room is closed';
  END IF;

  /* Upsert : si déjà membre (re-join après disconnect), réactive. */
  INSERT INTO public.circle_live_participants (
    room_id, user_id, role, joined_at, left_at
  ) VALUES (
    p_room_id, auth.uid(),
    CASE WHEN room_record.host_id = auth.uid() THEN 'host' ELSE 'listener' END,
    now(), NULL
  )
  ON CONFLICT (room_id, user_id) DO UPDATE
  SET left_at = NULL, joined_at = now();

  /* Recompute counter + peak. */
  SELECT COUNT(*) INTO current_count FROM public.circle_live_participants
   WHERE room_id = p_room_id AND left_at IS NULL;

  UPDATE public.circle_live_rooms
     SET participants_count = current_count,
         peak_participants = GREATEST(peak_participants, current_count),
         updated_at = now()
   WHERE id = p_room_id;

  RETURN jsonb_build_object('ok', true, 'participants_count', current_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_circle_live_room(UUID) TO authenticated;

-- ============================================================
-- 5. RPC leave_live_room
-- ============================================================

CREATE OR REPLACE FUNCTION public.leave_circle_live_room(p_room_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  UPDATE public.circle_live_participants
     SET left_at = now()
   WHERE room_id = p_room_id AND user_id = auth.uid()
     AND left_at IS NULL;

  SELECT COUNT(*) INTO current_count FROM public.circle_live_participants
   WHERE room_id = p_room_id AND left_at IS NULL;

  UPDATE public.circle_live_rooms
     SET participants_count = current_count, updated_at = now()
   WHERE id = p_room_id;

  RETURN jsonb_build_object('ok', true, 'participants_count', current_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_circle_live_room(UUID) TO authenticated;

-- ============================================================
-- 6. RPC end_live_room (host only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.end_circle_live_room(p_room_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_host boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT (host_id = auth.uid()) INTO is_host
    FROM public.circle_live_rooms WHERE id = p_room_id;
  IF NOT COALESCE(is_host, false) THEN
    RAISE EXCEPTION 'host required';
  END IF;

  UPDATE public.circle_live_rooms
     SET status = 'ended', ended_at = now(), updated_at = now()
   WHERE id = p_room_id;

  /* Tous les participants leave. */
  UPDATE public.circle_live_participants
     SET left_at = now()
   WHERE room_id = p_room_id AND left_at IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_circle_live_room(UUID) TO authenticated;

-- ============================================================
-- 7. Realtime publication
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_live_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_live_participants;

-- ============================================================
-- 8. Activer module 'live_rooms' sur tous les cercles existants
-- ============================================================

UPDATE public.circles
SET modules = COALESCE(modules, '{}'::jsonb) || '{"live_rooms": true}'::jsonb
WHERE NOT (modules ? 'live_rooms');

COMMIT;
