-- ============================================================================
-- 0165_live_replay_views.sql — Étape 22/25 Live Streaming
--
-- Tracking du nombre de vues sur les replays. On garde simple : un
-- compteur sur live_recordings + un log léger pour dédupliquer par
-- user (1 view / user / replay).
-- ============================================================================

ALTER TABLE public.live_recordings
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_live_recordings_views
  ON public.live_recordings (view_count DESC)
  WHERE status = 'completed';

CREATE TABLE IF NOT EXISTS public.live_replay_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.live_recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_replay_views_unique UNIQUE (recording_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_replay_views_user
  ON public.live_replay_views (user_id, viewed_at DESC);

ALTER TABLE public.live_replay_views ENABLE ROW LEVEL SECURITY;

-- SELECT : owner uniquement.
DROP POLICY IF EXISTS replay_views_select_self ON public.live_replay_views;
CREATE POLICY replay_views_select_self
  ON public.live_replay_views
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INSERT : self.
DROP POLICY IF EXISTS replay_views_insert_self ON public.live_replay_views;
CREATE POLICY replay_views_insert_self
  ON public.live_replay_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- RPC : track_replay_view(recording_id)
--
-- Idempotent : si l'user a déjà vu, ne fait rien. Sinon insère + incrémente
-- view_count atomiquement.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_replay_view(
  p_recording_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inserted boolean;
  v_new_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO public.live_replay_views (recording_id, user_id)
    VALUES (p_recording_id, v_user_id)
    ON CONFLICT (recording_id, user_id) DO NOTHING
    RETURNING true INTO v_inserted;

  IF v_inserted THEN
    UPDATE public.live_recordings
      SET view_count = view_count + 1
      WHERE id = p_recording_id
      RETURNING view_count INTO v_new_count;
  ELSE
    SELECT view_count INTO v_new_count
      FROM public.live_recordings
      WHERE id = p_recording_id;
  END IF;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.track_replay_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_replay_view(uuid) TO authenticated;

COMMENT ON FUNCTION public.track_replay_view(uuid) IS
  'Étape 22 : incrémente view_count sur live_recordings (1 vue / user, idempotent).';
