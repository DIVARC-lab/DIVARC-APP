-- Chantier Live Streaming DIVARC — Étape 11 : Polls live
-- ======================================================
--
-- Le host crée un sondage en cours de live (question + 2-6 options +
-- durée). Les viewers votent une fois (UNIQUE user_id × poll_id).
-- Résultats temps réel via SELECT count par option.
--
-- Architecture minimaliste :
--   - live_polls : (id, session_id, question, options jsonb[], ends_at, is_closed)
--   - live_poll_votes : (poll_id, user_id, option_index) PRIMARY KEY composite
--   - RLS : SELECT polls visible si session visible (RLS chain),
--           INSERT polls host only, INSERT votes membre auth.
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. Table live_polls
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 280),
  /* options : array de strings, 2 à 6 entrées. */
  options text[] NOT NULL CHECK (
    array_length(options, 1) BETWEEN 2 AND 6
    AND array_length(options, 1) IS NOT NULL
  ),
  ends_at TIMESTAMPTZ NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_polls_session_idx
  ON public.live_polls (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS live_polls_active_idx
  ON public.live_polls (session_id)
  WHERE is_closed = false;

-- ============================================================
-- 2. Table live_poll_votes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_poll_votes (
  poll_id UUID NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL CHECK (option_index BETWEEN 0 AND 5),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_poll_votes_poll_idx
  ON public.live_poll_votes (poll_id, option_index);

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_poll_votes ENABLE ROW LEVEL SECURITY;

/* SELECT polls : visible si l'user peut voir la session (RLS chain).
   Comme on ne peut pas faire JOIN dans une policy, on vérifie via
   EXISTS sur circle_live_rooms (RLS s'applique au sous-query). */
DROP POLICY IF EXISTS live_polls_select ON public.live_polls;
CREATE POLICY live_polls_select
  ON public.live_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
       WHERE r.id = live_polls.session_id
    )
  );

DROP POLICY IF EXISTS live_polls_insert_host ON public.live_polls;
CREATE POLICY live_polls_insert_host
  ON public.live_polls FOR INSERT
  WITH CHECK (
    host_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
       WHERE r.id = live_polls.session_id
         AND r.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS live_polls_update_host ON public.live_polls;
CREATE POLICY live_polls_update_host
  ON public.live_polls FOR UPDATE
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS live_poll_votes_select ON public.live_poll_votes;
CREATE POLICY live_poll_votes_select
  ON public.live_poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_polls p
       WHERE p.id = live_poll_votes.poll_id
    )
  );

DROP POLICY IF EXISTS live_poll_votes_insert_self ON public.live_poll_votes;
CREATE POLICY live_poll_votes_insert_self
  ON public.live_poll_votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. RPC get_live_poll_results — count votes par option
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_live_poll_results(
  p_session_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_poll RECORD;
  v_total integer;
  v_my_vote integer;
  v_counts jsonb;
BEGIN
  /* Prend le poll actif le plus récent (open OU fermé < 5 min). */
  SELECT id, question, options, ends_at, is_closed
    INTO v_poll
    FROM public.live_polls
   WHERE session_id = p_session_id
     AND (is_closed = false OR ends_at > now() - interval '5 minutes')
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_poll.id IS NULL THEN
    RETURN NULL;
  END IF;

  /* Total votes. */
  SELECT COUNT(*) INTO v_total
    FROM public.live_poll_votes
   WHERE poll_id = v_poll.id;

  /* Vote de l'user courant (NULL si pas voté). */
  SELECT option_index INTO v_my_vote
    FROM public.live_poll_votes
   WHERE poll_id = v_poll.id
     AND user_id = auth.uid();

  /* Counts par option. */
  SELECT jsonb_agg(option_count ORDER BY ord)
    INTO v_counts
    FROM (
      SELECT
        s.ord,
        COUNT(v.user_id) AS option_count
      FROM generate_series(0, array_length(v_poll.options, 1) - 1) AS s(ord)
      LEFT JOIN public.live_poll_votes v
        ON v.poll_id = v_poll.id AND v.option_index = s.ord
      GROUP BY s.ord
    ) sub;

  RETURN jsonb_build_object(
    'id', v_poll.id,
    'question', v_poll.question,
    'options', v_poll.options,
    'counts', v_counts,
    'total_votes', v_total,
    'my_vote', v_my_vote,
    'ends_at', v_poll.ends_at,
    'is_closed', v_poll.is_closed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_poll_results(UUID)
  TO authenticated;

COMMIT;
